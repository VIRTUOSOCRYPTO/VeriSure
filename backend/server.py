from fastapi import FastAPI, APIRouter, File, UploadFile, Form, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import hashlib
import base64
import aiohttp
import json
from io import BytesIO
from PIL import Image
import re

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from forensics import ForensicAnalyzer, fuse_evidence

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize forensic analyzer
forensic_analyzer = ForensicAnalyzer()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Models
class AnalysisRequest(BaseModel):
    input_type: str  # "text", "url"
    content: str

class OriginVerdict(BaseModel):
    classification: str  # "Likely AI-Generated", "Likely Original", "Hybrid / Manipulated", "Unclear / Mixed Signals", "Inconclusive"
    confidence: str  # "low", "medium", "high"
    indicators: List[str]

class ScamAssessment(BaseModel):
    risk_level: str  # "high", "medium", "low"
    scam_patterns: List[str]
    behavioral_flags: List[str]

class Evidence(BaseModel):
    signals_detected: List[str]
    forensic_notes: List[str]
    limitations: List[str]

class Recommendation(BaseModel):
    actions: List[str]
    severity: str

class AnalysisReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    report_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str
    content_hash: str
    origin_verdict: OriginVerdict
    scam_assessment: ScamAssessment
    evidence: Evidence
    recommendations: Recommendation
    analysis_summary: str


# India-specific scam patterns
INDIA_SCAM_PATTERNS = [
    (r"\b(arrest|police|cyber crime|CBI|FIR|legal action|court notice|warrant)\b", "Fake police/law enforcement threat"),
    (r"\b(your son|your daughter|your child).*(arrest|accident|hospital|trouble)\b", "Family emergency scam"),
    (r"\b(RBI|Reserve Bank|bank account|frozen|suspend|block|KYC|inactive)\b", "Banking/RBI fraud"),
    (r"\b(urgent|immediate|last chance|within 24 hours|final notice|act now)\b", "Urgency manipulation"),
    (r"\b(don't tell|keep secret|confidential|don't share)\b", "Secrecy demand"),
    (r"\b(verify|update|confirm|validate).*(OTP|password|PIN|CVV|card|account)\b", "Credential harvesting"),
    (r"\b(lottery|prize|won|winner|claim|reward|congratulations)\b", "Fake prize scam"),
    (r"\b(customs|parcel|delivery|courier|package|shipment)\b", "Fake delivery scam"),
    (r"\b(tax|refund|GST|income tax|return)\b", "Tax refund scam"),
    (r"\b(click here|link|download|install|update now)\b", "Phishing link"),
]

# Analysis helper functions
def detect_scam_patterns(text: str) -> tuple[List[str], List[str]]:
    """Detect India-specific scam patterns in text"""
    patterns_found = []
    behavioral_flags = []
    
    text_lower = text.lower()
    
    for pattern_regex, description in INDIA_SCAM_PATTERNS:
        if re.search(pattern_regex, text_lower):
            patterns_found.append(description)
            
            # Add behavioral flags based on pattern type
            if "police" in description.lower() or "law enforcement" in description.lower():
                behavioral_flags.append("Impersonates law enforcement authority")
            elif "family emergency" in description.lower():
                behavioral_flags.append("Exploits family emotional bonds")
            elif "banking" in description.lower() or "rbi" in description.lower():
                behavioral_flags.append("Threatens financial account security")
            elif "urgency" in description.lower():
                behavioral_flags.append("Creates artificial time pressure")
            elif "secrecy" in description.lower():
                behavioral_flags.append("Discourages verification with others")
            elif "credential" in description.lower():
                behavioral_flags.append("Requests sensitive authentication data")
            elif "phishing" in description.lower():
                behavioral_flags.append("Attempts to redirect to malicious links")
    
    # Remove duplicate behavioral flags
    behavioral_flags = list(dict.fromkeys(behavioral_flags))
    
    # Check for authority abuse
    authority_keywords = ["police", "court", "rbi", "government", "officer", "cbi"]
    if any(keyword in text_lower for keyword in authority_keywords):
        if "Impersonates law enforcement authority" not in behavioral_flags:
            behavioral_flags.append("Uses authority figure impersonation")
    
    # Check for emotional manipulation
    emotion_keywords = ["urgent", "immediate", "danger", "risk", "threat", "last chance"]
    if sum(1 for keyword in emotion_keywords if keyword in text_lower) >= 2:
        if not any("pressure" in flag.lower() for flag in behavioral_flags):
            behavioral_flags.append("Uses emotional coercion tactics")
    
    return patterns_found, behavioral_flags

def compute_content_hash(content: bytes) -> str:
    """Compute SHA-256 hash of content"""
    return hashlib.sha256(content).hexdigest()

async def analyze_with_claude(content: str, content_type: str, image_data: Optional[bytes] = None, mime_type: Optional[str] = None) -> Dict[str, Any]:
    """Analyze content using Claude Sonnet 4.5"""
    api_key = os.environ.get('EMERGENT_LLM_KEY', '')
    if not api_key:
        raise ValueError("EMERGENT_LLM_KEY not found in environment")
    
    session_id = str(uuid.uuid4())
    
    system_message = """You are a SECONDARY opinion provider for content analysis. Your role is to supplement forensic evidence, NOT be the final authority.

CRITICAL RULES:
1. Never claim 100% certainty
2. Your opinion is ONE SIGNAL among many
3. Focus on subjective patterns that technical forensics might miss
4. Be conservative in your assessments

Provide analysis in this EXACT JSON format:
{
  "origin": {
    "classification": "Likely AI-Generated" | "Likely Original" | "Unclear / Mixed Signals",
    "confidence": "low" | "medium" | "high",
    "indicators": ["2-3 specific visual/textual indicators"]
  },
  "ai_signals": ["subtle AI artifacts or patterns you observe"],
  "human_signals": ["indicators of human authorship"],
  "forensic_notes": ["observations about style, consistency, context"],
  "summary": "brief 1-2 sentence opinion"
}

Look for SUBJECTIVE indicators:
- AI: Excessive perfection, unnatural smoothness, generic phrasing, context mismatches
- Human: Natural imperfections, personal style, contextual awareness, authentic errors
- Images: Visual coherence, lighting consistency, detail realism

REMEMBER: Technical forensics (EXIF, metadata, compression) take priority over your opinion."""
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Prepare message
        if content_type == "image" and image_data:
            # Properly detect and convert image format
            try:
                # Open image with PIL to ensure correct format
                img = Image.open(BytesIO(image_data))
                
                # Convert to RGB/RGBA as needed for PNG format
                if img.mode in ('RGBA', 'LA'):
                    # Keep transparency for PNG
                    pass
                elif img.mode == 'P':
                    img = img.convert('RGBA')
                elif img.mode not in ('RGB', 'RGBA'):
                    img = img.convert('RGB')
                
                # Save as PNG to maintain compatibility and quality
                img_byte_arr = BytesIO()
                img.save(img_byte_arr, format='PNG')
                img_byte_arr = img_byte_arr.getvalue()
                
                # Convert to base64
                base64_image = base64.b64encode(img_byte_arr).decode('utf-8')
                
                # Create image content
                image_content = ImageContent(image_base64=base64_image)
                
                user_message = UserMessage(
                    text="Analyze this image for AI generation indicators and potential scam/manipulation signs. Provide your response in the JSON format specified.",
                    file_contents=[image_content]
                )
            except Exception as img_error:
                logger.error(f"Image processing error: {str(img_error)}")
                raise ValueError(f"Failed to process image: {str(img_error)}")
        else:
            user_message = UserMessage(
                text=f"Analyze the following content for AI generation indicators and scam patterns:\n\n{content}\n\nProvide your response in the JSON format specified."
            )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        # Extract JSON from response (it might be wrapped in markdown)
        json_match = re.search(r'```json\s*({.*?})\s*```', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find JSON object directly
            json_match = re.search(r'{.*}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = response
        
        analysis_result = json.loads(json_str)
        return analysis_result
        
    except Exception as e:
        logger.error(f"Claude analysis error: {str(e)}")
        # Return default analysis
        return {
            "origin": {
                "classification": "Unclear / Mixed Signals",
                "confidence": "low",
                "indicators": ["Analysis service temporarily unavailable"]
            },
            "ai_signals": [],
            "human_signals": [],
            "forensic_notes": [f"Error: {str(e)}"],
            "summary": "Unable to complete analysis"
        }

async def fetch_url_content(url: str) -> tuple[str, Optional[bytes], str]:
    """Fetch content from URL and determine type"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                content_type = response.headers.get('Content-Type', '').lower()
                content_data = await response.read()
                
                if 'image' in content_type:
                    return "image", content_data, content_type
                elif 'text' in content_type or 'html' in content_type:
                    text = content_data.decode('utf-8', errors='ignore')
                    return "text", text.encode('utf-8'), content_type
                else:
                    return "unknown", content_data, content_type
    except Exception as e:
        logger.error(f"URL fetch error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")


@api_router.get("/")
async def root():
    return {"message": "VeriSure API - Advanced AI Origin & Scam Forensics"}

@api_router.post("/analyze", response_model=AnalysisReport)
async def analyze_content(
    input_type: str = Form(...),
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """Main analysis endpoint - handles text, URL, and file uploads"""
    
    content_bytes = None
    content_text = ""
    analysis_type = input_type
    
    try:
        # Process input based on type
        if input_type == "file" and file:
            content_bytes = await file.read()
            content_text = file.filename or "uploaded_file"
            
            # Determine file type
            if file.content_type:
                if 'image' in file.content_type:
                    analysis_type = "image"
                elif 'video' in file.content_type:
                    analysis_type = "video"
                elif 'audio' in file.content_type:
                    analysis_type = "audio"
                else:
                    analysis_type = "file"
            else:
                # Fallback: detect by filename extension
                filename_lower = content_text.lower()
                if any(ext in filename_lower for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                    analysis_type = "image"
                elif any(ext in filename_lower for ext in ['.mp4', '.mov', '.avi', '.mkv']):
                    analysis_type = "video"
                elif any(ext in filename_lower for ext in ['.mp3', '.wav', '.ogg', '.m4a', '.aac']):
                    analysis_type = "audio"
                else:
                    analysis_type = "file"
                
        elif input_type == "url" and content:
            # Fetch URL content
            url_type, url_data, url_content_type = await fetch_url_content(content)
            if url_type == "image":
                content_bytes = url_data
                analysis_type = "image"
            else:
                content_bytes = url_data
                content_text = url_data.decode('utf-8', errors='ignore')
                analysis_type = "text"
                
        elif input_type == "text" and content:
            content_text = content
            content_bytes = content.encode('utf-8')
            analysis_type = "text"
        else:
            raise HTTPException(status_code=400, detail="Invalid input: provide either text, url, or file")
        
        # Compute content hash
        content_hash = compute_content_hash(content_bytes)
        
        # STEP 1: FORENSIC ANALYSIS FIRST (primary signal)
        logger.info(f"Starting forensic analysis for {analysis_type}")
        forensic_result = {}
        
        if analysis_type == "image":
            forensic_result = forensic_analyzer.analyze_image(content_bytes)
        elif analysis_type == "video":
            forensic_result = forensic_analyzer.analyze_video(
                content_bytes, 
                filename=file.filename if file else "video.mp4"
            )
        elif analysis_type == "audio":
            forensic_result = forensic_analyzer.analyze_audio(
                content_bytes,
                filename=file.filename if file else "audio.mp3"
            )
        else:
            # Text analysis - no forensics, rely more on scam patterns
            forensic_result = {
                'media_type': 'text',
                'forensic_indicators': {
                    'human_signals': [],
                    'ai_signals': [],
                    'manipulation_signals': [],
                    'inconclusive_signals': ['No technical forensics for plain text']
                }
            }
        
        logger.info(f"Forensic analysis complete: {len(forensic_result.get('forensic_indicators', {}).get('human_signals', []))} human signals, {len(forensic_result.get('forensic_indicators', {}).get('ai_signals', []))} AI signals")
        
        # STEP 2: AI OPINION AS SECONDARY SIGNAL
        logger.info("Requesting AI opinion (secondary signal)")
        claude_result = {}
        try:
            if analysis_type == "image":
                claude_result = await analyze_with_claude(
                    content_text, 
                    "image", 
                    image_data=content_bytes,
                    mime_type=file.content_type if file else url_content_type if 'url_content_type' in locals() else None
                )
            elif analysis_type in ["video", "audio"]:
                # For video/audio, Claude gets limited context
                claude_result = await analyze_with_claude(
                    f"Analyzing {analysis_type} file. Provide secondary opinion based on general patterns.",
                    "text"
                )
            else:
                claude_result = await analyze_with_claude(
                    content_text,
                    "text"
                )
        except Exception as ai_error:
            logger.warning(f"AI opinion failed: {str(ai_error)}. Continuing with forensics only.")
            claude_result = {
                "origin": {
                    "classification": "Unclear / Mixed Signals",
                    "confidence": "low",
                    "indicators": ["AI opinion unavailable"]
                },
                "ai_signals": [],
                "human_signals": [],
                "forensic_notes": [],
                "summary": "AI analysis unavailable"
            }
        
        # STEP 3: FUSE EVIDENCE USING STRICT RULES
        logger.info("Fusing forensic evidence with AI opinion")
        final_classification, final_confidence, classification_reason, all_indicators = fuse_evidence(
            forensic_result, 
            claude_result
        )
        
        logger.info(f"Final verdict: {final_classification} ({final_confidence} confidence)")
        
        # Detect scam patterns
        scam_patterns, behavioral_flags = detect_scam_patterns(content_text)
        
        # Build origin verdict with forensics-based decision
        origin_verdict = OriginVerdict(
            classification=final_classification,
            confidence=final_confidence,
            indicators=all_indicators[:4] if all_indicators else [classification_reason]
        )
        
        # Determine scam risk level
        risk_level = "low"
        if len(scam_patterns) >= 3 or any("OTP" in p or "police" in p.lower() for p in scam_patterns):
            risk_level = "high"
        elif len(scam_patterns) >= 1:
            risk_level = "medium"
        
        scam_assessment = ScamAssessment(
            risk_level=risk_level,
            scam_patterns=scam_patterns if scam_patterns else ["No known scam patterns detected"],
            behavioral_flags=behavioral_flags if behavioral_flags else ["No behavioral manipulation detected"]
        )
        
        # Build evidence with forensic details
        forensic_indicators = forensic_result.get('forensic_indicators', {})
        all_forensic_signals = (
            forensic_indicators.get('human_signals', []) +
            forensic_indicators.get('ai_signals', []) +
            forensic_indicators.get('manipulation_signals', [])
        )
        
        evidence = Evidence(
            signals_detected=all_forensic_signals[:10] if all_forensic_signals else ["No technical signals detected"],
            forensic_notes=[
                classification_reason,
                f"Forensic analysis: {forensic_result.get('media_type', 'unknown')} type",
                f"Evidence quality: {final_confidence}"
            ] + claude_result.get("forensic_notes", [])[:2],
            limitations=[
                "Analysis combines technical forensics with AI opinion",
                "Technical forensics takes priority over AI assessment",
                "Results are probabilistic, never 100% certain",
                "Advanced manipulation techniques may evade detection"
            ]
        )
        
        # Build recommendations
        actions = []
        severity = "info"
        
        if risk_level == "high":
            actions = [
                "DO NOT respond to this content",
                "DO NOT share personal information or credentials",
                "Preserve this content as evidence",
                "Report to cybercrime.gov.in if financial loss occurred",
                "Warn family members about similar content"
            ]
            severity = "critical"
        elif risk_level == "medium":
            actions = [
                "Exercise caution before taking any action",
                "Verify sender identity through official channels",
                "Do not share sensitive information",
                "Consult with trusted contacts before responding"
            ]
            severity = "warning"
        else:
            actions = [
                "Content appears relatively safe",
                "Still verify important claims independently",
                "Remain vigilant for suspicious elements"
            ]
            severity = "info"
        
        recommendations = Recommendation(
            actions=actions,
            severity=severity
        )
        
        # Create final report with forensics-based classification
        analysis_summary = f"{classification_reason}. "
        
        # Add forensic details to summary
        if forensic_result.get('media_type') != 'text':
            analysis_summary += f"Forensic analysis of {forensic_result.get('media_type')} completed. "
        
        # Add AI opinion note
        ai_opinion = claude_result.get("summary", "")
        if ai_opinion and "unavailable" not in ai_opinion.lower():
            analysis_summary += f"AI opinion (secondary): {ai_opinion}"
        
        report = AnalysisReport(
            timestamp=datetime.now(timezone.utc).isoformat(),
            content_hash=content_hash,
            origin_verdict=origin_verdict,
            scam_assessment=scam_assessment,
            evidence=evidence,
            recommendations=recommendations,
            analysis_summary=analysis_summary
        )
        
        # Store report in database
        report_dict = report.model_dump()
        await db.analysis_reports.insert_one(report_dict)
        
        return report
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@api_router.get("/report/{report_id}")
async def get_report(report_id: str):
    """Retrieve a stored analysis report"""
    report = await db.analysis_reports.find_one({"report_id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
