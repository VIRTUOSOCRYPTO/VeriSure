from fastapi import FastAPI, APIRouter, File, UploadFile, Form, HTTPException, Depends, Response, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import datetime, timezone
import hashlib
import base64
import aiohttp
import json
from io import BytesIO
from PIL import Image
import re
import pytesseract

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from forensics import ForensicAnalyzer, fuse_evidence
from cache_manager import CacheManager
from pdf_generator import PDFReportGenerator
from auth import get_api_key, get_optional_api_key, DEFAULT_API_KEY
from celery_tasks import celery_app, process_video_analysis, process_audio_analysis
from celery.result import AsyncResult

# Phase 4: Intelligence imports
from scam_intelligence import ScamIntelligence
from threat_intelligence import ThreatIntelligence

# Phase 6: Security & Compliance imports
from models import (
    UserRegistration, UserLogin, TokenResponse, RefreshTokenRequest,
    UserProfile, UserUpdate, PasswordChange, UserRole,
    AuditLogEntry, ConsentRecord, DataExportRequest
)
from auth_jwt import JWTManager, get_current_user, get_optional_user, require_role
from password_utils import hash_password, verify_password, validate_password_strength
from audit_logger import AuditLogger
from encryption import encryption_manager, encrypt_sensitive_fields, decrypt_sensitive_fields
from gdpr_compliance import GDPRManager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize forensic analyzer
forensic_analyzer = ForensicAnalyzer()

# Initialize cache manager
cache_manager = CacheManager(
    redis_url=os.environ.get('REDIS_URL', 'redis://localhost:6379'),
    ttl=int(os.environ.get('CACHE_TTL', 86400))  # 24 hours default
)

# Initialize PDF generator
pdf_generator = PDFReportGenerator()

# Phase 6: Initialize security systems
jwt_manager = None  # Initialized after DB connection
audit_logger = None  # Initialized after DB connection
gdpr_manager = None  # Initialized after DB connection

# Phase 4: Initialize intelligence systems
scam_intelligence = None  # Initialized after DB connection
threat_intelligence = None  # Initialized after DB connection

# MongoDB connection with connection pooling (Phase 3 optimization)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    maxPoolSize=50,  # Max connections in pool
    minPoolSize=10,  # Min connections to maintain
    maxIdleTimeMS=45000,  # Close idle connections after 45s
    serverSelectionTimeoutMS=5000  # Connection timeout
)
db = client[os.environ['DB_NAME']]

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create the main app without a prefix
app = FastAPI(
    title="VeriSure API",
    description="Advanced AI Origin & Scam Forensics with Caching, Rate Limiting, and PDF Export",
    version="2.0.0"
)

# Add rate limit exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Log API key for users
logger.info(f"🔑 Default API Key: {DEFAULT_API_KEY}")

# Phase 6: Initialize security managers with DB
jwt_manager = JWTManager(db)
audit_logger = AuditLogger(db)
gdpr_manager = GDPRManager(db)
logger.info("✅ Security systems initialized (JWT, Audit, GDPR)")

# Phase 4: Initialize intelligence systems with DB
scam_intelligence = ScamIntelligence(db)
threat_intelligence = ThreatIntelligence(db)
logger.info("✅ Intelligence systems initialized (Scam Intelligence, Threat Intel)")

# Create indexes for performance
async def create_indexes():
    """Create database indexes for security collections"""
    try:
        # Users collection
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        
        # Audit logs
        await db.audit_logs.create_index([("timestamp", -1)])
        await db.audit_logs.create_index("user_id")
        await db.audit_logs.create_index("action")
        
        # Refresh tokens
        await db.refresh_tokens.create_index("token_jti", unique=True)
        await db.refresh_tokens.create_index("user_id")
        await db.refresh_tokens.create_index("expires_at")
        
        logger.info("✅ Database indexes created")
    except Exception as e:
        logger.warning(f"Index creation: {str(e)}")

# Schedule index creation at startup
@app.on_event("startup")
async def startup_event():
    await create_indexes()
    logger.info("🚀 VeriSure API started with enhanced security")


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

class AsyncJobResponse(BaseModel):
    job_id: str
    status: str  # "pending", "processing", "completed", "failed"
    message: str

class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # "PENDING", "STARTED", "SUCCESS", "FAILURE"
    progress: Optional[int] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# India-specific scam patterns - ENHANCED with more patterns
INDIA_SCAM_PATTERNS = [
    # Law enforcement threats
    (r"\b(arrest|police|cyber crime|CBI|FIR|legal action|court notice|warrant|jail|custody)\b", "Fake police/law enforcement threat"),
    (r"\b(ED|enforcement directorate|money laundering|PMLA|investigation)\b", "Fake ED/investigation threat"),
    
    # Family emergency scams
    (r"\b(your son|your daughter|your child|your family member).*(arrest|accident|hospital|trouble|injured|emergency)\b", "Family emergency scam"),
    (r"\b(son|daughter|husband|wife|relative).*(hospital|accident|urgent|emergency|critical)\b", "Family in danger scam"),
    
    # Banking & financial threats
    (r"\b(RBI|Reserve Bank|SEBI|bank account|frozen|suspend|block|KYC|inactive|dormant)\b", "Banking/RBI fraud"),
    (r"\b(Aadhaar|PAN|UPI|NEFT|RTGS|IMPS).*(update|link|verify|suspend|expire)\b", "Financial document/payment fraud"),
    (r"\b(credit card|debit card|ATM).*(block|expire|suspend|upgrade|reward)\b", "Card fraud"),
    (r"\b(insurance|policy|maturity|claim).*(expire|lapse|urgent|final)\b", "Fake insurance scam"),
    
    # Urgency & pressure tactics
    (r"\b(urgent|immediate|last chance|within \d+ (hours?|days?)|final notice|act now|today only|expires today)\b", "Urgency manipulation"),
    (r"\b(now or never|limited time|hurry|quick|fast|immediately)\b", "High-pressure urgency"),
    
    # Secrecy demands
    (r"\b(don't tell|keep secret|confidential|don't share|don't inform|between us)\b", "Secrecy demand"),
    (r"\b(private matter|personal|discreet|quiet|silent)\b", "Privacy manipulation"),
    
    # Credential harvesting
    (r"\b(verify|update|confirm|validate|enter|provide|submit|share).*(OTP|password|PIN|CVV|card|account|credentials|passcode)\b", "Credential harvesting"),
    (r"\b(OTP|one time password|verification code|security code).*(share|send|tell|provide|give)\b", "OTP phishing"),
    
    # Prize & lottery scams
    (r"\b(lottery|prize|won|winner|claim|reward|congratulations|lucky draw|cashback)\b", "Fake prize scam"),
    (r"\b(jackpot|bumper|crore|lakh|\d+ thousand).*(won|win|prize|reward)\b", "Lottery fraud"),
    
    # Delivery & customs scams
    (r"\b(customs|parcel|delivery|courier|package|shipment|cargo|consignment).*(duty|tax|fee|charge|pending|held|seized)\b", "Fake delivery/customs scam"),
    (r"\b(FedEx|DHL|Blue Dart|India Post|DTDC).*(package|parcel|delivery|shipment)\b", "Courier impersonation"),
    
    # Tax & government scams
    (r"\b(tax|refund|GST|income tax|TDS|return|ITR).*(claim|pending|due|refund|process)\b", "Tax refund scam"),
    (r"\b(government|ministry|department|PM|CM).*(scheme|benefit|subsidy|grant)\b", "Fake government scheme"),
    
    # Phishing links - ENHANCED
    (r"\b(click here|link|download|install|update now|click below|tap here|visit|go to|check link)\b", "Phishing link"),
    (r"(http|https|www\.|bit\.ly|tinyurl).*(verify|login|update|confirm|claim)\b", "Suspicious URL phishing"),
    (r"(tinyurl\.com|bit\.ly|goo\.gl|shorturl|t\.co)/\w+", "Shortened URL (commonly used in scams)"),
    
    # Fines & penalties
    (r"\b(fine|fined|penalty|charge|violation|offense).*(pay|payment|amount|\$|₹|rupees)\b", "Fake fine/penalty scam"),
    (r"\b(traffic|challan|e-challan|violation).*(pay|fine|penalty)\b", "Fake traffic fine"),
    
    # E-commerce impersonation
    (r"\b(amazon|flipkart|myntra|paytm|swiggy|zomato|meesho|snapdeal).*(order|delivery|account|suspend|block|fine|return|refund|verify)\b", "Fake e-commerce impersonation"),
    
    # Job & investment scams
    (r"\b(job|work from home|part time|earn|income).*(guaranteed|assured|easy|simple|\d+ per day)\b", "Fake job/work from home scam"),
    (r"\b(investment|trading|stock|forex|crypto|bitcoin).*(guaranteed|assured|returns|profit|double)\b", "Investment fraud"),
    (r"\b(profit|returns|gains|earnings).*(guaranteed|assured|maximize|double|high|members|weekly|daily|monthly)\b", "Financial profit scam"),
    (r"\b(tools|system|method|strategy).*(profit|returns|money|income|gains)\b", "Get-rich-quick scheme"),
    (r"(Rs\.?|₹)\s*\d+.*(profit|earned|made|gain|returns).*(week|month|day|members)\b", "Fabricated profit claims"),
    
    # Romance & social scams
    (r"\b(loan|credit|finance).*(instant|easy|no documents|approved|pre-approved)\b", "Fake loan scam"),
    (r"\b(gift|voucher|coupon|discount).*(claim|redeem|exclusive|free)\b", "Fake voucher scam"),
]

# Analysis helper functions - IMPROVED
def detect_scam_patterns(text: str) -> tuple[List[str], List[str]]:
    """Detect India-specific scam patterns in text with ENHANCED accuracy"""
    patterns_found = []
    behavioral_flags = []
    scam_score = 0  # Track overall scam likelihood
    
    text_lower = text.lower()
    
    # Detect all matching patterns
    for pattern_regex, description in INDIA_SCAM_PATTERNS:
        if re.search(pattern_regex, text_lower):
            # Avoid duplicate pattern descriptions
            if description not in patterns_found:
                patterns_found.append(description)
            
            # Increase scam score based on pattern severity
            if "police" in description.lower() or "law enforcement" in description.lower() or "ED" in description.lower():
                behavioral_flags.append("Impersonates law enforcement authority")
                scam_score += 3  # High severity
            elif "family emergency" in description.lower() or "family in danger" in description.lower():
                behavioral_flags.append("Exploits family emotional bonds")
                scam_score += 3  # High severity
            elif "banking" in description.lower() or "rbi" in description.lower() or "financial" in description.lower():
                behavioral_flags.append("Threatens financial account security")
                scam_score += 3  # High severity
            elif "OTP" in description.lower() or "credential" in description.lower():
                behavioral_flags.append("Requests sensitive authentication data")
                scam_score += 4  # Critical severity
            elif "urgency" in description.lower() or "pressure" in description.lower():
                behavioral_flags.append("Creates artificial time pressure")
                scam_score += 2  # Medium severity
            elif "secrecy" in description.lower() or "privacy" in description.lower():
                behavioral_flags.append("Discourages verification with others")
                scam_score += 2  # Medium severity
            elif "phishing" in description.lower() or "suspicious url" in description.lower():
                behavioral_flags.append("Attempts to redirect to malicious links")
                scam_score += 3  # High severity
            elif "fine" in description.lower() or "penalty" in description.lower():
                behavioral_flags.append("Threatens with fake fines/penalties")
                scam_score += 2  # Medium severity
            elif "prize" in description.lower() or "lottery" in description.lower():
                behavioral_flags.append("Uses fake rewards to lure victims")
                scam_score += 2  # Medium severity
            elif "investment" in description.lower() or "job" in description.lower():
                behavioral_flags.append("Promises unrealistic financial gains")
                scam_score += 2  # Medium severity
    
    # Remove duplicate behavioral flags
    behavioral_flags = list(dict.fromkeys(behavioral_flags))
    
    # ENHANCED: Check for dangerous keyword combinations
    # Authority + Money
    authority_keywords = ["police", "court", "rbi", "government", "officer", "cbi", "ed", "enforcement"]
    money_keywords = ["pay", "fine", "penalty", "amount", "rupees", "₹", "transfer", "deposit"]
    if any(auth in text_lower for auth in authority_keywords) and any(money in text_lower for money in money_keywords):
        if "Combines authority threat with payment demand" not in behavioral_flags:
            behavioral_flags.append("Combines authority threat with payment demand")
        scam_score += 3
    
    # Urgency + Credential Request
    urgency_keywords = ["urgent", "immediate", "now", "today", "quickly", "fast", "expires"]
    credential_keywords = ["otp", "password", "pin", "cvv", "card number", "account number", "verify account"]
    if any(urg in text_lower for urg in urgency_keywords) and any(cred in text_lower for cred in credential_keywords):
        if "Urgency combined with credential request (critical red flag)" not in behavioral_flags:
            behavioral_flags.append("Urgency combined with credential request (critical red flag)")
        scam_score += 4
    
    # Secrecy + Payment
    secrecy_keywords = ["don't tell", "secret", "confidential", "don't share", "between us", "private"]
    if any(sec in text_lower for sec in secrecy_keywords) and any(money in text_lower for money in money_keywords):
        if "Demands secrecy with financial transaction" not in behavioral_flags:
            behavioral_flags.append("Demands secrecy with financial transaction")
        scam_score += 3
    
    # Check for phone numbers (potential scam contact)
    phone_pattern = r"\b(\+91[\s-]?)?\d{10}\b|\b\d{5}[\s-]\d{5}\b"
    if re.search(phone_pattern, text):
        if "Contains phone number (potential scammer contact)" not in behavioral_flags:
            behavioral_flags.append("Contains phone number (potential scammer contact)")
        scam_score += 1
    
    # Check for suspicious links
    url_pattern = r"(http|https|www\.|bit\.ly|tinyurl|shortened link)"
    if re.search(url_pattern, text_lower):
        if "Contains URL/link (possible phishing)" not in behavioral_flags:
            behavioral_flags.append("Contains URL/link (possible phishing)")
        scam_score += 2
    
    # Check for impersonation of legitimate organizations
    legit_orgs = ["amazon", "flipkart", "paytm", "google", "microsoft", "apple", "bank", "rbi", "government"]
    for org in legit_orgs:
        if org in text_lower:
            # Check if it's combined with threats or urgency
            threat_keywords = ["suspend", "block", "freeze", "expire", "urgent", "immediate"]
            if any(threat in text_lower for threat in threat_keywords):
                if f"Impersonates {org.title()} with threats" not in behavioral_flags:
                    behavioral_flags.append(f"Impersonates {org.title()} with threats")
                scam_score += 2
                break
    
    # Add overall scam score to evaluation
    logger.info(f"Scam detection score: {scam_score}/10 (patterns: {len(patterns_found)}, flags: {len(behavioral_flags)})")
    
    return patterns_found, behavioral_flags

def compute_content_hash(content: bytes) -> str:
    """Compute SHA-256 hash of content"""
    return hashlib.sha256(content).hexdigest()

def extract_text_from_image(image_bytes: bytes) -> str:
    """Extract text from image using OCR"""
    try:
        image = Image.open(BytesIO(image_bytes))
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Extract text using pytesseract
        text = pytesseract.image_to_string(image)
        logger.info(f"OCR extracted text (length: {len(text)}): {text[:200]}...")
        return text.strip()
    except Exception as e:
        logger.error(f"OCR extraction failed: {str(e)}")
        return ""


async def analyze_with_claude(content: str, content_type: str, image_data: Optional[bytes] = None, mime_type: Optional[str] = None) -> Dict[str, Any]:
    """Analyze content using Claude Sonnet 4.5 with IMPROVED prompts for better accuracy"""
    api_key = os.environ.get('EMERGENT_LLM_KEY', '')
    if not api_key:
        raise ValueError("EMERGENT_LLM_KEY not found in environment")
    
    session_id = str(uuid.uuid4())
    
    system_message = """You are an EXPERT content authenticity analyst providing SECONDARY opinion to supplement forensic evidence. Your role is critical but NOT the final authority.

CRITICAL RULES FOR ACCURACY:
1. Be HIGHLY SPECIFIC - generic observations are not useful
2. Your confidence must match the strength of evidence you observe
3. Focus on CONCRETE visual/textual patterns that forensics might miss
4. Be CONSERVATIVE - it's better to say "Unclear" than make wrong claims
5. Look for MULTIPLE corroborating signals before high confidence

Provide analysis in this EXACT JSON format:
{
  "origin": {
    "classification": "Likely AI-Generated" | "Likely Original" | "Unclear / Mixed Signals",
    "confidence": "low" | "medium" | "high",
    "indicators": ["3-5 SPECIFIC concrete indicators you observed"]
  },
  "ai_signals": ["Specific AI artifacts - be detailed, not generic"],
  "human_signals": ["Specific human authorship indicators - be detailed"],
  "forensic_notes": ["Technical observations about style, consistency, quality"],
  "summary": "1-2 sentence SPECIFIC opinion with reasoning"
}

IMPROVED DETECTION CRITERIA:

**For AI-Generated Content (look for 2+ signals):**
- Images: Perfect symmetry, unnatural smoothness in skin/textures, impossible lighting, missing/distorted fine details (hands, text, reflections), repetitive patterns, AI-typical backgrounds
- Text: Overly formal/perfect grammar, generic corporate tone, lack of personal voice, no colloquialisms, repetitive sentence structures, no typos/errors
- Videos: Facial warping, inconsistent lighting on face, lip-sync delays, static background, unnatural eye movements, jerky transitions
- Audio: Robotic intonation, uniform pitch/pace, lack of breath sounds, no background noise, perfect clarity

**For Original/Human Content (look for 2+ signals):**
- Images: Natural imperfections, realistic lighting/shadows, correct perspective, authentic camera noise/grain, real-world context
- Text: Personal voice, natural errors/typos, informal language, cultural references, emotional authenticity, conversational flow
- Videos: Natural camera shake, ambient sounds, realistic environment, authentic facial micro-expressions
- Audio: Natural breathing, ambient noise, voice variations, hesitations, emotional inflections

**For Images Specifically:**
- Check hands (AI struggles with fingers/joints)
- Check text in image (AI often produces gibberish)
- Check eyes/teeth (AI makes subtle errors)
- Check backgrounds (AI creates impossible perspectives)
- Check consistency (lighting direction, shadows, reflections)

**For Deepfake Videos:**
- Face-background inconsistency (different lighting)
- Unnatural blinking patterns (too much or too little)
- Lip-sync misalignment with audio
- Face edges appear blurred/blended
- Static hair/clothing while face moves
- Artifacts around mouth/eyes during speech

**Confidence Levels:**
- HIGH: 3+ strong corroborating signals clearly point one direction
- MEDIUM: 2 solid signals with no major contradictions
- LOW: 1 signal, or conflicting signals, or uncertain observations

REMEMBER: Technical forensics (EXIF, metadata, compression analysis) ALWAYS take priority. Your opinion is supplementary."""
    
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
@limiter.limit("100/minute")
async def root(request: Request):
    return {
        "message": "VeriSure API - Advanced AI Origin & Scam Forensics",
        "version": "2.0.0",
        "features": [
            "Multi-modal analysis (text, image, video, audio)",
            "India-specific scam detection",
            "Forensic + AI hybrid analysis",
            "Redis caching for performance",
            "Rate limiting protection",
            "Analysis history",
            "PDF export",
            "API key authentication"
        ]
    }

@api_router.post("/analyze")
@limiter.limit("20/minute")
async def analyze_content(
    request: Request,
    input_type: str = Form(...),
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    api_key_info: Optional[Dict] = Depends(get_optional_api_key)
) -> Union[AnalysisReport, AsyncJobResponse]:
    """Main analysis endpoint - handles text, URL, and file uploads
    Returns AnalysisReport for text/images, AsyncJobResponse for video/audio"""
    
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
                    # Extract text from image using OCR for scam detection
                    extracted_text = extract_text_from_image(content_bytes)
                    if extracted_text:
                        content_text = extracted_text
                        logger.info(f"Extracted {len(extracted_text)} characters from image for scam analysis")
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
                    # Extract text from image using OCR for scam detection
                    extracted_text = extract_text_from_image(content_bytes)
                    if extracted_text:
                        content_text = extracted_text
                        logger.info(f"Extracted {len(extracted_text)} characters from image for scam analysis")
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
                # Extract text from image using OCR for scam detection
                extracted_text = extract_text_from_image(url_data)
                if extracted_text:
                    content_text = extracted_text
                    logger.info(f"Extracted {len(extracted_text)} characters from URL image for scam analysis")
                else:
                    content_text = content  # fallback to URL
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
        
        # CHECK CACHE FIRST (Quick Win #5 - Redis Caching)
        cached_report = cache_manager.get_cached_analysis(content_hash)
        if cached_report:
            logger.info(f"✅ Returning cached analysis for hash: {content_hash[:16]}...")
            # Return cached report directly
            return AnalysisReport(**cached_report)
        
        # PHASE 3: ASYNC PROCESSING FOR VIDEO/AUDIO (heavy operations)
        # Route video/audio to Celery workers for async processing
        if analysis_type == "video":
            logger.info(f"🎬 Routing video analysis to Celery worker (async)")
            task = process_video_analysis.delay(
                content_bytes, 
                filename=file.filename if file else "video.mp4"
            )
            
            # Return job ID for polling
            return AsyncJobResponse(
                job_id=task.id,
                status="processing",
                message=f"Video analysis started. Use /api/job/{task.id} to check status."
            )
        
        elif analysis_type == "audio":
            logger.info(f"🎵 Routing audio analysis to Celery worker (async)")
            task = process_audio_analysis.delay(
                content_bytes,
                filename=file.filename if file else "audio.mp3"
            )
            
            # Return job ID for polling
            return AsyncJobResponse(
                job_id=task.id,
                status="processing",
                message=f"Audio analysis started. Use /api/job/{task.id} to check status."
            )
        
        # STEP 1: FORENSIC ANALYSIS FIRST (primary signal) - For images and text
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
            elif analysis_type == "video":
                # For video, send key frames to Claude for deepfake detection
                key_frames = forensic_result.get('key_frames', [])
                if key_frames and len(key_frames) > 0:
                    # Use the middle frame for analysis
                    middle_frame = key_frames[len(key_frames) // 2] if key_frames else None
                    if middle_frame:
                        claude_result = await analyze_with_claude(
                            "Analyze this video frame for deepfake indicators. Look for: unnatural facial movements, lip-sync issues, lighting inconsistencies on face, blurry face edges, artifacts around mouth/eyes, unnatural blinking, static background with animated face.",
                            "image",
                            image_data=middle_frame,
                            mime_type="image/jpeg"
                        )
                    else:
                        claude_result = await analyze_with_claude(
                            "Analyzing video file. Provide secondary opinion based on general patterns.",
                            "text"
                        )
                else:
                    claude_result = await analyze_with_claude(
                        "Analyzing video file. Provide secondary opinion based on general patterns.",
                        "text"
                    )
            elif analysis_type == "audio":
                # For audio, Claude gets limited context
                claude_result = await analyze_with_claude(
                    f"Analyzing audio file. Provide secondary opinion based on general patterns.",
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
            indicators=all_indicators[:6] if all_indicators else [classification_reason]  # Show more indicators
        )
        
        # IMPROVED: Determine scam risk level with better accuracy
        risk_level = "low"
        risk_score = 0
        
        # Calculate risk score based on patterns and flags
        critical_keywords = ["OTP", "password", "PIN", "CVV", "card number", "account number"]
        high_risk_keywords = ["police", "arrest", "CBI", "ED", "jail", "custody", "warrant", "fine", "penalty", "frozen", "blocked"]
        medium_risk_keywords = ["urgent", "immediate", "last chance", "expire", "suspend", "verify", "update", "confirm"]
        
        # Check for critical credential harvesting
        if any(keyword.lower() in content_text.lower() for keyword in critical_keywords):
            risk_score += 5  # Critical
            
        # Check for high-risk authority threats
        if any(keyword.lower() in content_text.lower() for keyword in high_risk_keywords):
            risk_score += 3  # High risk
            
        # Check for medium-risk pressure tactics
        if any(keyword.lower() in content_text.lower() for keyword in medium_risk_keywords):
            risk_score += 2  # Medium risk
        
        # Add points for number of patterns detected
        risk_score += len(scam_patterns)
        
        # Add points for dangerous behavioral flags
        dangerous_flags = [
            "Requests sensitive authentication data",
            "Combines authority threat with payment demand",
            "Urgency combined with credential request",
            "Demands secrecy with financial transaction"
        ]
        for flag in behavioral_flags:
            if any(danger in flag for danger in dangerous_flags):
                risk_score += 2
        
        # Determine final risk level based on total score
        if risk_score >= 8:
            risk_level = "high"
        elif risk_score >= 5 or len(scam_patterns) >= 3:
            risk_level = "high"
        elif risk_score >= 3 or len(scam_patterns) >= 2:
            risk_level = "medium"
        elif len(scam_patterns) >= 1:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        logger.info(f"Scam risk assessment: {risk_level} (score: {risk_score}, patterns: {len(scam_patterns)}, flags: {len(behavioral_flags)})")
        
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
        
        # Convert to dict for caching (before MongoDB adds _id)
        report_dict = report.model_dump()
        
        # CACHE THE REPORT FIRST (Quick Win #5 - Redis Caching)
        cache_manager.cache_analysis(content_hash, report_dict)
        
        # Store report in database (MongoDB will add _id)
        await db.analysis_reports.insert_one(report_dict.copy())
        
        return report
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@api_router.get("/report/{report_id}")
@limiter.limit("50/minute")
async def get_report(request: Request, report_id: str):
    """Retrieve a stored analysis report"""
    report = await db.analysis_reports.find_one({"report_id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

# ========== NEW ENDPOINTS - QUICK WINS ==========

@api_router.get("/history")
@limiter.limit("30/minute")
async def get_analysis_history(
    request: Request,
    limit: int = 50,
    skip: int = 0,
    risk_level: Optional[str] = None
):
    """
    Get analysis history with pagination and filtering
    Quick Win #3 - Analysis History Storage
    """
    try:
        # Build query
        query = {}
        if risk_level:
            query["scam_assessment.risk_level"] = risk_level.lower()
        
        # Get total count
        total = await db.analysis_reports.count_documents(query)
        
        # Get reports
        cursor = db.analysis_reports.find(
            query,
            {"_id": 0}
        ).sort("timestamp", -1).skip(skip).limit(limit)
        
        reports = await cursor.to_list(length=limit)
        
        return {
            "total": total,
            "limit": limit,
            "skip": skip,
            "reports": reports
        }
    except Exception as e:
        logger.error(f"History retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {str(e)}")

@api_router.get("/export/pdf/{report_id}")
@limiter.limit("20/minute")
async def export_pdf_report(request: Request, report_id: str):
    """
    Export analysis report as PDF
    Quick Win #4 - PDF Export with ReportLab
    """
    try:
        # Get report from database
        report = await db.analysis_reports.find_one({"report_id": report_id}, {"_id": 0})
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Generate PDF
        pdf_buffer = pdf_generator.generate_report(report)
        
        # Return as streaming response
        headers = {
            'Content-Disposition': f'attachment; filename="verisure_report_{report_id[:8]}.pdf"',
            'Content-Type': 'application/pdf'
        }
        
        return StreamingResponse(
            pdf_buffer,
            headers=headers,
            media_type='application/pdf'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF export error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@api_router.get("/cache/stats")
@limiter.limit("10/minute")
async def get_cache_stats(
    request: Request,
    api_key_info: Dict = Depends(get_api_key)
):
    """
    Get cache statistics (Protected endpoint)
    Requires API key authentication
    """
    stats = cache_manager.get_cache_stats()
    return {
        "cache_stats": stats,
        "authenticated_user": api_key_info.get('name')
    }

@api_router.post("/cache/invalidate/{content_hash}")
@limiter.limit("10/minute")
async def invalidate_cache(
    request: Request,
    content_hash: str,
    api_key_info: Dict = Depends(get_api_key)
):
    """
    Invalidate cached analysis (Protected endpoint)
    Requires API key authentication
    """
    success = cache_manager.invalidate_cache(content_hash)
    if success:
        return {
            "message": "Cache invalidated successfully",
            "content_hash": content_hash
        }
    else:
        raise HTTPException(status_code=404, detail="Cache entry not found or error occurred")

@api_router.get("/analytics/summary")
@limiter.limit("20/minute")
async def get_analytics_summary(request: Request):
    """
    Get analytics summary for reports
    Quick Win #3 Enhancement - Analytics
    """
    try:
        # Get total analyses
        total_analyses = await db.analysis_reports.count_documents({})
        
        # Get risk level breakdown
        high_risk = await db.analysis_reports.count_documents({"scam_assessment.risk_level": "high"})
        medium_risk = await db.analysis_reports.count_documents({"scam_assessment.risk_level": "medium"})
        low_risk = await db.analysis_reports.count_documents({"scam_assessment.risk_level": "low"})
        
        # Get origin classification breakdown
        ai_generated = await db.analysis_reports.count_documents(
            {"origin_verdict.classification": {"$regex": "AI-Generated", "$options": "i"}}
        )
        original = await db.analysis_reports.count_documents(
            {"origin_verdict.classification": {"$regex": "Original", "$options": "i"}}
        )
        
        # Get recent analyses (last 24 hours)
        from datetime import timedelta
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        recent_count = await db.analysis_reports.count_documents(
            {"timestamp": {"$gte": yesterday}}
        )
        
        return {
            "total_analyses": total_analyses,
            "recent_24h": recent_count,
            "risk_breakdown": {
                "high": high_risk,
                "medium": medium_risk,
                "low": low_risk
            },
            "origin_breakdown": {
                "ai_generated": ai_generated,
                "original": original,
                "other": total_analyses - ai_generated - original
            },
            "cache_stats": cache_manager.get_cache_stats()
        }
    except Exception as e:
        logger.error(f"Analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    celery_status = "unknown"
    try:
        # Check if Celery is responding
        inspect = celery_app.control.inspect()
        stats = inspect.stats()
        celery_status = "connected" if stats else "disconnected"
    except Exception:
        celery_status = "disconnected"
    
    return {
        "status": "healthy",
        "mongodb": "connected" if client else "disconnected",
        "cache": cache_manager.get_cache_stats().get("status", "unknown"),
        "celery": celery_status,
        "version": "2.1.0"
    }

@api_router.get("/job/{job_id}")
@limiter.limit("60/minute")
async def get_job_status(request: Request, job_id: str):
    """
    Get status of an async job (video/audio processing)
    Phase 3 - Async Queue Implementation
    """
    try:
        task_result = AsyncResult(job_id, app=celery_app)
        
        response = JobStatusResponse(
            job_id=job_id,
            status=task_result.status,
            progress=None,
            result=None,
            error=None
        )
        
        if task_result.ready():
            if task_result.successful():
                response.result = task_result.result
                response.progress = 100
            else:
                response.error = str(task_result.info)
        else:
            # Task is still processing
            if hasattr(task_result.info, 'get'):
                response.progress = task_result.info.get('progress', 0)
        
        return response
        
    except Exception as e:
        logger.error(f"Job status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {str(e)}")

@api_router.post("/compare")
@limiter.limit("30/minute")
async def compare_reports(
    request: Request,
    report_ids: List[str]
):
    """
    Compare multiple analysis reports
    Returns detailed comparison with common patterns, unique patterns, risk trends, and insights
    Min 2 reports, Max 10 reports
    """
    try:
        # Validate input
        if len(report_ids) < 2:
            raise HTTPException(status_code=400, detail="At least 2 report IDs required for comparison")
        
        if len(report_ids) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 reports can be compared at once")
        
        logger.info(f"📊 Comparing {len(report_ids)} reports")
        
        # Fetch all reports from database
        reports = []
        not_found = []
        
        for report_id in report_ids:
            report = await db.analysis_reports.find_one({"report_id": report_id}, {"_id": 0})
            if report:
                reports.append(report)
            else:
                not_found.append(report_id)
        
        if not_found:
            raise HTTPException(
                status_code=404, 
                detail=f"Reports not found: {', '.join(not_found)}"
            )
        
        if len(reports) < 2:
            raise HTTPException(status_code=400, detail="At least 2 valid reports required")
        
        # Perform comparison analysis
        comparison_result = _perform_comparison_analysis(reports)
        
        # Track comparison in analytics (optional - could add to separate collection)
        comparison_record = {
            "comparison_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "report_ids": report_ids,
            "num_reports": len(reports),
            "comparison_type": "multi_report"
        }
        # Store comparison analytics (fire and forget)
        try:
            await db.comparison_analytics.insert_one(comparison_record)
        except Exception:
            pass  # Don't fail comparison if analytics fails
        
        logger.info(f"✅ Comparison complete: {len(reports)} reports analyzed")
        
        return {
            "comparison_id": comparison_record["comparison_id"],
            "timestamp": comparison_record["timestamp"],
            "num_reports": len(reports),
            "reports": reports,
            "analysis": comparison_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comparison error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

def _perform_comparison_analysis(reports: List[Dict]) -> Dict:
    """
    Perform detailed comparison analysis on multiple reports
    Returns structured comparison data with insights
    """
    analysis = {
        "risk_analysis": {},
        "pattern_analysis": {},
        "origin_analysis": {},
        "temporal_analysis": {},
        "insights": []
    }
    
    # 1. RISK ANALYSIS
    risk_levels = [r["scam_assessment"]["risk_level"] for r in reports]
    risk_counts = {"high": 0, "medium": 0, "low": 0}
    for level in risk_levels:
        risk_counts[level] = risk_counts.get(level, 0) + 1
    
    # Calculate risk trend (if reports are sequential)
    risk_scores = {"high": 3, "medium": 2, "low": 1}
    risk_progression = [risk_scores[level] for level in risk_levels]
    
    trend = "stable"
    if len(risk_progression) >= 2:
        if risk_progression[-1] > risk_progression[0]:
            trend = "increasing"
        elif risk_progression[-1] < risk_progression[0]:
            trend = "decreasing"
    
    analysis["risk_analysis"] = {
        "distribution": risk_counts,
        "dominant_risk": max(risk_counts, key=risk_counts.get),
        "risk_trend": trend,
        "risk_progression": risk_levels
    }
    
    # Add insight for risk trend
    if trend == "increasing":
        analysis["insights"].append({
            "type": "warning",
            "message": f"Risk level is increasing across reports ({risk_levels[0]} → {risk_levels[-1]})",
            "severity": "high"
        })
    elif risk_counts["high"] >= len(reports) * 0.5:
        analysis["insights"].append({
            "type": "critical",
            "message": f"{risk_counts['high']}/{len(reports)} reports show HIGH risk - immediate action recommended",
            "severity": "critical"
        })
    
    # 2. PATTERN ANALYSIS
    all_scam_patterns = set()
    all_behavioral_flags = set()
    pattern_frequency = {}
    flag_frequency = {}
    
    for report in reports:
        patterns = report["scam_assessment"]["scam_patterns"]
        flags = report["scam_assessment"]["behavioral_flags"]
        
        for pattern in patterns:
            all_scam_patterns.add(pattern)
            pattern_frequency[pattern] = pattern_frequency.get(pattern, 0) + 1
        
        for flag in flags:
            all_behavioral_flags.add(flag)
            flag_frequency[flag] = flag_frequency.get(flag, 0) + 1
    
    # Find common patterns (appear in all reports)
    common_patterns = [
        pattern for pattern, count in pattern_frequency.items() 
        if count == len(reports)
    ]
    
    # Find frequent patterns (appear in >50% of reports)
    frequent_patterns = [
        pattern for pattern, count in pattern_frequency.items()
        if count >= len(reports) * 0.5 and pattern not in common_patterns
    ]
    
    # Most common pattern across all reports
    most_common_pattern = max(pattern_frequency, key=pattern_frequency.get) if pattern_frequency else None
    
    analysis["pattern_analysis"] = {
        "total_unique_patterns": len(all_scam_patterns),
        "total_unique_flags": len(all_behavioral_flags),
        "common_patterns": common_patterns,  # In ALL reports
        "frequent_patterns": frequent_patterns,  # In ≥50% reports
        "most_common_pattern": most_common_pattern,
        "pattern_frequency": pattern_frequency,
        "flag_frequency": flag_frequency
    }
    
    # Add insights for patterns
    if len(common_patterns) > 0:
        analysis["insights"].append({
            "type": "info",
            "message": f"Found {len(common_patterns)} scam pattern(s) common across ALL reports - likely same attack vector",
            "severity": "medium"
        })
    
    if len(all_scam_patterns) > 5 and len(common_patterns) == 0:
        analysis["insights"].append({
            "type": "info", 
            "message": f"High pattern diversity ({len(all_scam_patterns)} unique patterns) with no common patterns - multiple attack types",
            "severity": "low"
        })
    
    # 3. ORIGIN ANALYSIS
    origin_classifications = [r["origin_verdict"]["classification"] for r in reports]
    origin_counts = {}
    for classification in origin_classifications:
        origin_counts[classification] = origin_counts.get(classification, 0) + 1
    
    # Calculate confidence distribution
    confidence_levels = [r["origin_verdict"]["confidence"] for r in reports]
    confidence_counts = {"high": 0, "medium": 0, "low": 0}
    for conf in confidence_levels:
        confidence_counts[conf] = confidence_counts.get(conf, 0) + 1
    
    analysis["origin_analysis"] = {
        "classification_distribution": origin_counts,
        "dominant_classification": max(origin_counts, key=origin_counts.get),
        "confidence_distribution": confidence_counts,
        "all_classifications": origin_classifications
    }
    
    # Add insights for AI-generated content
    if origin_counts.get("Likely AI-Generated", 0) >= len(reports) * 0.5:
        analysis["insights"].append({
            "type": "warning",
            "message": f"{origin_counts.get('Likely AI-Generated', 0)}/{len(reports)} reports show AI-generated content",
            "severity": "medium"
        })
    
    # 4. TEMPORAL ANALYSIS (if timestamps are meaningful)
    timestamps = [datetime.fromisoformat(r["timestamp"].replace('Z', '+00:00')) for r in reports]
    timestamps_sorted = sorted(timestamps)
    
    time_span = (timestamps_sorted[-1] - timestamps_sorted[0]).total_seconds()
    
    analysis["temporal_analysis"] = {
        "first_analysis": timestamps_sorted[0].isoformat(),
        "last_analysis": timestamps_sorted[-1].isoformat(),
        "time_span_seconds": time_span,
        "time_span_hours": round(time_span / 3600, 2),
        "analysis_frequency": "sequential" if time_span < 3600 else ("same_day" if time_span < 86400 else "multi_day")
    }
    
    # Add temporal insights
    if time_span < 300:  # Less than 5 minutes
        analysis["insights"].append({
            "type": "info",
            "message": "All analyses performed within 5 minutes - likely testing same content variations",
            "severity": "low"
        })
    
    # 5. SIMILARITY ANALYSIS
    # Calculate Jaccard similarity for scam patterns
    if len(reports) == 2:
        patterns_1 = set(reports[0]["scam_assessment"]["scam_patterns"])
        patterns_2 = set(reports[1]["scam_assessment"]["scam_patterns"])
        
        if len(patterns_1) > 0 or len(patterns_2) > 0:
            intersection = len(patterns_1.intersection(patterns_2))
            union = len(patterns_1.union(patterns_2))
            similarity = round(intersection / union * 100, 1) if union > 0 else 0
            
            analysis["similarity_score"] = similarity
            
            if similarity >= 70:
                analysis["insights"].append({
                    "type": "info",
                    "message": f"Reports are {similarity}% similar - likely same or related scam content",
                    "severity": "medium"
                })
            elif similarity < 30:
                analysis["insights"].append({
                    "type": "info",
                    "message": f"Reports are only {similarity}% similar - likely different scam types",
                    "severity": "low"
                })
    
    # 6. ACTIONABLE RECOMMENDATIONS
    recommendations = []
    
    if risk_counts.get("high", 0) > 0:
        recommendations.append("Immediate action required for high-risk content")
        recommendations.append("Report to cybercrime.gov.in if financial loss occurred")
    
    if len(common_patterns) > 0:
        recommendations.append(f"Common attack vector detected: {common_patterns[0]}")
        recommendations.append("Implement specific defenses against this pattern")
    
    if trend == "increasing":
        recommendations.append("Risk is escalating - monitor closely and take preventive measures")
    
    analysis["recommendations"] = recommendations
    
    return analysis

@api_router.post("/analyze/batch")
@limiter.limit("10/minute")
async def analyze_batch(
    request: Request,
    files: List[UploadFile] = File(...),
    api_key_info: Optional[Dict] = Depends(get_optional_api_key)
):
    """
    Batch analysis endpoint - analyze multiple files at once
    Phase 3 - Batch Processing
    Max 10 files per batch
    """
    try:
        # Validate batch size
        if len(files) > 10:
            raise HTTPException(
                status_code=400, 
                detail=f"Maximum 10 files allowed per batch. You uploaded {len(files)} files."
            )
        
        if len(files) == 0:
            raise HTTPException(status_code=400, detail="No files provided")
        
        logger.info(f"📦 Starting batch analysis for {len(files)} files")
        
        batch_results = []
        
        for idx, file in enumerate(files):
            try:
                # Read file content
                content_bytes = await file.read()
                filename = file.filename or f"file_{idx}"
                
                # Determine file type
                analysis_type = "file"
                if file.content_type:
                    if 'image' in file.content_type:
                        analysis_type = "image"
                    elif 'video' in file.content_type:
                        analysis_type = "video"
                    elif 'audio' in file.content_type:
                        analysis_type = "audio"
                    elif 'text' in file.content_type:
                        analysis_type = "text"
                
                # Compute content hash
                content_hash = compute_content_hash(content_bytes)
                
                # Check cache first
                cached_report = cache_manager.get_cached_analysis(content_hash)
                if cached_report:
                    logger.info(f"✅ Cache HIT for batch file {idx+1}/{len(files)}: {filename}")
                    batch_results.append({
                        "file_index": idx,
                        "filename": filename,
                        "status": "completed",
                        "cached": True,
                        "report": cached_report
                    })
                    continue
                
                # For video/audio, route to async processing
                if analysis_type == "video":
                    task = process_video_analysis.delay(content_bytes, filename)
                    batch_results.append({
                        "file_index": idx,
                        "filename": filename,
                        "status": "processing",
                        "job_id": task.id,
                        "analysis_type": "video"
                    })
                    logger.info(f"🎬 Batch file {idx+1}/{len(files)} (video) queued: {filename}")
                    
                elif analysis_type == "audio":
                    task = process_audio_analysis.delay(content_bytes, filename)
                    batch_results.append({
                        "file_index": idx,
                        "filename": filename,
                        "status": "processing",
                        "job_id": task.id,
                        "analysis_type": "audio"
                    })
                    logger.info(f"🎵 Batch file {idx+1}/{len(files)} (audio) queued: {filename}")
                
                else:
                    # For images and text, process immediately (fast)
                    # Extract text from image if needed
                    content_text = filename
                    if analysis_type == "image":
                        extracted_text = extract_text_from_image(content_bytes)
                        if extracted_text:
                            content_text = extracted_text
                    elif analysis_type == "text":
                        content_text = content_bytes.decode('utf-8', errors='ignore')
                    
                    # Quick forensic analysis for images
                    forensic_result = {}
                    if analysis_type == "image":
                        forensic_result = forensic_analyzer.analyze_image(content_bytes)
                    else:
                        forensic_result = {
                            'media_type': 'text',
                            'forensic_indicators': {
                                'human_signals': [],
                                'ai_signals': [],
                                'manipulation_signals': [],
                                'inconclusive_signals': ['No technical forensics for plain text']
                            }
                        }
                    
                    # AI analysis (skip for speed in batch mode)
                    claude_result = {
                        "origin": {
                            "classification": "Unclear / Mixed Signals",
                            "confidence": "low",
                            "indicators": ["Batch mode - AI opinion skipped for speed"]
                        },
                        "ai_signals": [],
                        "human_signals": [],
                        "forensic_notes": [],
                        "summary": "Quick batch analysis"
                    }
                    
                    # Fuse evidence
                    final_classification, final_confidence, classification_reason, all_indicators = fuse_evidence(
                        forensic_result, 
                        claude_result
                    )
                    
                    # Detect scam patterns
                    scam_patterns, behavioral_flags = detect_scam_patterns(content_text)
                    
                    # Determine risk level
                    risk_level = "low"
                    if len(scam_patterns) >= 3:
                        risk_level = "high"
                    elif len(scam_patterns) >= 1:
                        risk_level = "medium"
                    
                    # Build report
                    report = {
                        "report_id": str(uuid.uuid4()),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "content_hash": content_hash,
                        "origin_verdict": {
                            "classification": final_classification,
                            "confidence": final_confidence,
                            "indicators": all_indicators[:6] if all_indicators else [classification_reason]
                        },
                        "scam_assessment": {
                            "risk_level": risk_level,
                            "scam_patterns": scam_patterns if scam_patterns else ["No known scam patterns detected"],
                            "behavioral_flags": behavioral_flags if behavioral_flags else ["No behavioral manipulation detected"]
                        },
                        "evidence": {
                            "signals_detected": forensic_result.get('forensic_indicators', {}).get('human_signals', [])[:5],
                            "forensic_notes": [classification_reason, "Batch mode processing"],
                            "limitations": ["Batch mode - AI opinion skipped for speed"]
                        },
                        "recommendations": {
                            "actions": ["Quick batch analysis completed"],
                            "severity": "info" if risk_level == "low" else ("warning" if risk_level == "medium" else "critical")
                        },
                        "analysis_summary": f"{classification_reason}. Batch mode."
                    }
                    
                    # Cache the report
                    cache_manager.cache_analysis(content_hash, report)
                    
                    # Store in database
                    await db.analysis_reports.insert_one(report.copy())
                    
                    batch_results.append({
                        "file_index": idx,
                        "filename": filename,
                        "status": "completed",
                        "cached": False,
                        "report": report
                    })
                    
                    logger.info(f"✅ Batch file {idx+1}/{len(files)} completed: {filename}")
                    
            except Exception as file_error:
                logger.error(f"❌ Batch file {idx+1} failed: {str(file_error)}")
                batch_results.append({
                    "file_index": idx,
                    "filename": file.filename if file else f"file_{idx}",
                    "status": "failed",
                    "error": str(file_error)
                })
        
        logger.info(f"📦 Batch analysis complete: {len(batch_results)} results")
        
        return {
            "batch_id": str(uuid.uuid4()),
            "total_files": len(files),
            "results": batch_results,
            "summary": {
                "completed": len([r for r in batch_results if r.get("status") == "completed"]),
                "processing": len([r for r in batch_results if r.get("status") == "processing"]),
                "failed": len([r for r in batch_results if r.get("status") == "failed"]),
                "cached": len([r for r in batch_results if r.get("cached") == True])
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch analysis failed: {str(e)}")

# ========== PHASE 4: INTELLIGENCE & PUBLIC SCAM DATABASE ==========

class ScamReportRequest(BaseModel):
    """Scam report submission"""
    content: str = Field(..., min_length=10, description="Scam content/description")
    scam_type: str = Field(..., description="Type of scam (e.g., phishing, lottery, police_threat)")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata (URLs, phone numbers)")

class ScamVerifyRequest(BaseModel):
    """Admin scam verification"""
    status: str = Field(..., description="Status: verified or rejected")

@api_router.post("/scams/report")
@limiter.limit("10/hour")
async def report_scam(
    request: Request,
    scam_report: ScamReportRequest,
    user: Optional[Dict] = Depends(get_optional_user)
):
    """
    Report a scam to the public database (community reporting)
    Phase 4 - Public Scam Database
    """
    try:
        user_id = user.get("user_id") if user else None
        
        scam = await scam_intelligence.report_scam(
            content=scam_report.content,
            scam_type=scam_report.scam_type,
            reported_by=user_id,
            source_type="user_report",
            metadata=scam_report.metadata
        )
        
        return {
            "message": "Scam report submitted successfully",
            "scam_id": scam.get("scam_id"),
            "status": scam.get("status"),
            "verified": scam.get("verified")
        }
    except Exception as e:
        logger.error(f"Scam report error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to report scam: {str(e)}")

@api_router.get("/scams/recent")
@limiter.limit("30/minute")
async def get_recent_scams(
    request: Request,
    limit: int = 20,
    skip: int = 0,
    verified_only: bool = False,
    scam_type: Optional[str] = None
):
    """
    Get recent scam reports
    Phase 4 - Public Scam Database
    """
    try:
        result = await scam_intelligence.get_recent_scams(
            limit=limit,
            skip=skip,
            verified_only=verified_only,
            scam_type=scam_type
        )
        return result
    except Exception as e:
        logger.error(f"Get recent scams error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch scams: {str(e)}")

@api_router.get("/scams/search")
@limiter.limit("30/minute")
async def search_scams(
    request: Request,
    q: str,
    limit: int = 20,
    skip: int = 0
):
    """
    Search scams by keyword
    Phase 4 - Public Scam Database
    """
    try:
        result = await scam_intelligence.search_scams(
            query=q,
            limit=limit,
            skip=skip
        )
        return result
    except Exception as e:
        logger.error(f"Search scams error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@api_router.get("/scams/stats")
@limiter.limit("20/minute")
async def get_scam_stats(request: Request):
    """
    Get scam statistics
    Phase 4 - Public Scam Database
    """
    try:
        stats = await scam_intelligence.get_scam_stats()
        return stats
    except Exception as e:
        logger.error(f"Get scam stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")

@api_router.post("/scams/{scam_id}/verify")
@limiter.limit("20/minute")
async def verify_scam(
    request: Request,
    scam_id: str,
    verify_request: ScamVerifyRequest,
    user: Dict = Depends(get_current_user)
):
    """
    Verify or reject a scam report (admin only)
    Phase 4 - Public Scam Database
    """
    try:
        # Check if user is admin
        if user.get("role") != "admin":
            raise HTTPException(
                status_code=403,
                detail="Admin access required"
            )
        
        success = await scam_intelligence.verify_scam(
            scam_id=scam_id,
            verified_by=user.get("user_id"),
            status=verify_request.status
        )
        
        if success:
            return {
                "message": f"Scam {verify_request.status} successfully",
                "scam_id": scam_id
            }
        else:
            raise HTTPException(status_code=404, detail="Scam not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify scam error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@api_router.get("/intelligence/patterns")
@limiter.limit("20/minute")
async def get_learned_patterns(
    request: Request,
    min_occurrences: int = 3,
    confidence_threshold: float = 0.8
):
    """
    Get auto-learned patterns from scam reports
    Phase 4 - Auto-Pattern Learning
    """
    try:
        patterns = await scam_intelligence.extract_patterns_from_reports(
            min_occurrences=min_occurrences,
            confidence_threshold=confidence_threshold
        )
        return {
            "total_patterns": len(patterns),
            "patterns": patterns
        }
    except Exception as e:
        logger.error(f"Pattern extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to extract patterns: {str(e)}")

@api_router.get("/intelligence/trending")
@limiter.limit("30/minute")
async def get_trending_patterns(
    request: Request,
    days: int = 7,
    limit: int = 10
):
    """
    Get trending scam patterns
    Phase 4 - Real-time Threat Intelligence
    """
    try:
        trending = await scam_intelligence.get_trending_patterns(
            days=days,
            limit=limit
        )
        return {
            "period_days": days,
            "trending_patterns": trending
        }
    except Exception as e:
        logger.error(f"Trending patterns error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch trending: {str(e)}")

@api_router.get("/intelligence/threats")
@limiter.limit("30/minute")
async def get_threat_feeds(request: Request):
    """
    Get latest threat intelligence feeds
    Phase 4 - Real-time Threat Intelligence
    """
    try:
        threats = await threat_intelligence.get_threat_feeds()
        return {
            "total_threats": len(threats),
            "threats": threats
        }
    except Exception as e:
        logger.error(f"Threat feeds error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch threats: {str(e)}")

@api_router.get("/intelligence/check-url")
@limiter.limit("20/minute")
async def check_url_reputation(
    request: Request,
    url: str
):
    """
    Check URL reputation against multiple threat intelligence sources
    Phase 4 - Real-time Threat Intelligence
    """
    try:
        result = await threat_intelligence.check_url_reputation(url)
        return result
    except Exception as e:
        logger.error(f"URL check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"URL check failed: {str(e)}")

# ========== END PHASE 4 ENDPOINTS ==========

# Include routers in the main app
app.include_router(api_router)

# Import and include WhatsApp router
from whatsapp_routes import whatsapp_router
app.include_router(whatsapp_router, prefix="/api")

# Phase 6: Include authentication and security routers
from auth_routes import auth_router, user_router, admin_router
app.include_router(auth_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_optimization():
    """
    Database optimization on startup
    Phase 3 - Query Optimization & Indexing
    """
    logger.info("🚀 Starting database optimization...")
    
    try:
        # Create indexes for faster queries
        await db.analysis_reports.create_index("report_id", unique=True)
        await db.analysis_reports.create_index("timestamp")
        await db.analysis_reports.create_index("content_hash")
        await db.analysis_reports.create_index("scam_assessment.risk_level")
        await db.analysis_reports.create_index([("timestamp", -1)])  # Descending for recent queries
        
        # Compound index for history queries with filters
        await db.analysis_reports.create_index([
            ("scam_assessment.risk_level", 1),
            ("timestamp", -1)
        ])
        
        # Phase 4: Scam database indexes
        await db.scam_reports.create_index("scam_id", unique=True)
        await db.scam_reports.create_index("scam_type")
        await db.scam_reports.create_index("verified")
        await db.scam_reports.create_index("status")
        await db.scam_reports.create_index([("created_at", -1)])
        await db.scam_reports.create_index([("report_count", -1)])
        await db.scam_reports.create_index([("severity", 1), ("verified", 1)])
        
        # Phase 4: URL checks cache index
        await db.url_checks.create_index("url", unique=True)
        await db.url_checks.create_index("expires_at")
        
        logger.info("✅ Database indexes created successfully")
        logger.info("✅ Connection pool configured (10-50 connections)")
        
    except Exception as e:
        logger.warning(f"⚠️ Index creation warning (may already exist): {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
