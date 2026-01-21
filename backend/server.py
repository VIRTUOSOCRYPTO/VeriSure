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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
    classification: str  # "Likely AI-Generated", "Likely Original", "Unclear / Mixed Signals"
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
    
    system_message = """You are an advanced forensic analysis system specializing in detecting AI-generated content and scam patterns targeting Indian citizens.

CRITICAL: Never claim 100% certainty. All assessments are probabilistic.

Your task is to analyze the provided content and respond with a structured JSON assessment.

Provide your analysis in this EXACT JSON format:
{
  "origin": {
    "classification": "Likely AI-Generated" | "Likely Original" | "Unclear / Mixed Signals",
    "confidence": "low" | "medium" | "high",
    "indicators": ["2-4 specific, human-readable indicators in plain English"]
  },
  "ai_signals": ["list of AI generation artifacts if any"],
  "human_signals": ["list of human authorship indicators if any"],
  "forensic_notes": ["technical observations in plain English"],
  "summary": "brief explanation of the classification in 1-2 sentences"
}

Classification Guidelines:
- "Likely AI-Generated": Strong AI indicators present (patterns, artifacts, excessive consistency)
- "Likely Original": Lacks AI generation artifacts, shows natural human variation
- "Unclear / Mixed Signals": Insufficient or conflicting evidence

Look for:
- AI generation artifacts (unnatural patterns, excessive consistency, generic phrasing, uniform textures)
- Human variation indicators (natural errors, personal style, inconsistencies, context awareness)
- Manipulation signs (editing, re-encoding, context mismatch)
- For images: unrealistic textures, lighting anomalies, impossible geometry, generation artifacts

IMPORTANT: 
- Keep explanations in plain English for non-technical users
- Provide 2-4 clear bullet points as indicators
- Always acknowledge limitations
- Never claim absolute certainty"""
    
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
                
                # Convert to RGB if necessary (remove alpha channel)
                if img.mode in ('RGBA', 'LA', 'P'):
                    # Create white background
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Save as JPEG to ensure compatibility
                img_byte_arr = BytesIO()
                img.save(img_byte_arr, format='JPEG', quality=95)
                img_byte_arr = img_byte_arr.getvalue()
                
                # Convert to base64
                base64_image = base64.b64encode(img_byte_arr).decode('utf-8')
                
                # Create image content with correct MIME type
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
            
            # Determine if it's an image
            if file.content_type and 'image' in file.content_type:
                analysis_type = "image"
            elif file.content_type and 'video' in file.content_type:
                analysis_type = "video"
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
        
        # Perform Claude analysis
        if analysis_type == "image":
            claude_result = await analyze_with_claude(
                content_text, 
                "image", 
                image_data=content_bytes,
                mime_type=file.content_type if file else url_content_type if 'url_content_type' in locals() else None
            )
        else:
            claude_result = await analyze_with_claude(
                content_text,
                "text"
            )
        
        # Detect scam patterns
        scam_patterns, behavioral_flags = detect_scam_patterns(content_text)
        
        # Build origin verdict
        origin_classification = claude_result.get("origin", {}).get("classification", "Unclear / Mixed Signals")
        
        # Ensure we use the correct classification labels
        classification_map = {
            "likely_ai": "Likely AI-Generated",
            "likely_human": "Likely Original",
            "hybrid": "Unclear / Mixed Signals",
            "inconclusive": "Unclear / Mixed Signals"
        }
        
        # Map old format to new format if needed
        if origin_classification.lower() in classification_map:
            origin_classification = classification_map[origin_classification.lower()]
        
        origin_verdict = OriginVerdict(
            classification=origin_classification,
            confidence=claude_result.get("origin", {}).get("confidence", "low"),
            indicators=claude_result.get("origin", {}).get("indicators", ["Analysis incomplete"])[:4]  # Limit to max 4 indicators
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
        
        # Build evidence
        evidence = Evidence(
            signals_detected=claude_result.get("ai_signals", []) + claude_result.get("human_signals", []),
            forensic_notes=claude_result.get("forensic_notes", []),
            limitations=[
                "Analysis is probabilistic, not definitive",
                "Advanced AI and human-created content may be indistinguishable",
                "Results should be used as one factor in decision-making"
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
        
        # Create final report
        report = AnalysisReport(
            timestamp=datetime.now(timezone.utc).isoformat(),
            content_hash=content_hash,
            origin_verdict=origin_verdict,
            scam_assessment=scam_assessment,
            evidence=evidence,
            recommendations=recommendations,
            analysis_summary=claude_result.get("summary", "Analysis completed")
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