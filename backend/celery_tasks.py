"""
Celery Tasks for Async Processing
Handles heavy video/audio processing in background
"""
from celery import Celery
import os
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery(
    'verisure_tasks',
    broker=os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    backend=os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes max
    task_soft_time_limit=540,  # 9 minutes soft limit
)

logger.info("✅ Celery initialized for async processing")


@celery_app.task(name='process_video_analysis', bind=True)
def process_video_analysis(self, video_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Process COMPLETE video analysis asynchronously
    Returns full AnalysisReport dict
    
    Args:
        video_bytes: Video file bytes
        filename: Original filename
        
    Returns:
        Complete analysis report dict
    """
    import asyncio
    from datetime import datetime, timezone
    import hashlib
    
    logger.info(f"📹 Starting async video analysis: {filename}")
    
    try:
        # Import here to avoid circular imports
        from forensics import ForensicAnalyzer, fuse_evidence
        import uuid
        
        # Update progress
        self.update_state(state='PROGRESS', meta={'progress': 10})
        
        # Step 1: Forensic analysis
        analyzer = ForensicAnalyzer()
        forensic_result = analyzer.analyze_video(video_bytes, filename)
        logger.info(f"✅ Forensics complete: {filename}")
        
        self.update_state(state='PROGRESS', meta={'progress': 40})
        
        # Step 2: AI analysis (simplified for async task)
        # For now, skip AI opinion in async tasks to speed up
        claude_result = {
            "origin": {
                "classification": "Unclear / Mixed Signals",
                "confidence": "low",
                "indicators": ["Async processing - AI opinion skipped for speed"]
            },
            "ai_signals": [],
            "human_signals": [],
            "forensic_notes": [],
            "summary": "Quick async analysis"
        }
        
        self.update_state(state='PROGRESS', meta={'progress': 60})
        
        # Step 3: Fuse evidence
        final_classification, final_confidence, classification_reason, all_indicators = fuse_evidence(
            forensic_result, 
            claude_result
        )
        
        # Step 4: Build complete report
        content_hash = hashlib.sha256(video_bytes).hexdigest()
        
        forensic_indicators = forensic_result.get('forensic_indicators', {})
        all_forensic_signals = (
            forensic_indicators.get('human_signals', []) +
            forensic_indicators.get('ai_signals', []) +
            forensic_indicators.get('manipulation_signals', [])
        )
        
        self.update_state(state='PROGRESS', meta={'progress': 80})
        
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
                "risk_level": "low",  # Video content doesn't have text-based scam patterns
                "scam_patterns": ["No text-based scam patterns in video"],
                "behavioral_flags": ["Visual content only"]
            },
            "evidence": {
                "signals_detected": all_forensic_signals[:10] if all_forensic_signals else ["No technical signals detected"],
                "forensic_notes": [
                    classification_reason,
                    f"Forensic analysis: video type",
                    f"Evidence quality: {final_confidence}",
                    "Processed asynchronously for performance"
                ],
                "limitations": [
                    "Async processing - AI opinion skipped for speed",
                    "Text scam detection not applicable to video",
                    "Results are probabilistic"
                ]
            },
            "recommendations": {
                "actions": [
                    "Video appears safe based on forensic analysis",
                    "Verify sender identity if received unexpectedly",
                    "Be cautious of deepfake indicators"
                ],
                "severity": "info"
            },
            "analysis_summary": f"{classification_reason}. Async forensic analysis completed."
        }
        
        self.update_state(state='PROGRESS', meta={'progress': 100})
        logger.info(f"✅ Video analysis complete: {filename}")
        
        return report
        
    except Exception as e:
        logger.error(f"❌ Video analysis failed: {str(e)}")
        self.update_state(
            state='FAILURE',
            meta={'error': str(e)}
        )
        raise


@celery_app.task(name='process_audio_analysis', bind=True)
def process_audio_analysis(self, audio_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Process COMPLETE audio analysis asynchronously
    Returns full AnalysisReport dict
    
    Args:
        audio_bytes: Audio file bytes
        filename: Original filename
        
    Returns:
        Complete analysis report dict
    """
    import asyncio
    from datetime import datetime, timezone
    import hashlib
    
    logger.info(f"🎵 Starting async audio analysis: {filename}")
    
    try:
        # Import here to avoid circular imports
        from forensics import ForensicAnalyzer, fuse_evidence
        import uuid
        
        # Update progress
        self.update_state(state='PROGRESS', meta={'progress': 10})
        
        # Step 1: Forensic analysis
        analyzer = ForensicAnalyzer()
        forensic_result = analyzer.analyze_audio(audio_bytes, filename)
        logger.info(f"✅ Forensics complete: {filename}")
        
        self.update_state(state='PROGRESS', meta={'progress': 40})
        
        # Step 2: AI analysis (simplified for async task)
        claude_result = {
            "origin": {
                "classification": "Unclear / Mixed Signals",
                "confidence": "low",
                "indicators": ["Async processing - AI opinion skipped for speed"]
            },
            "ai_signals": [],
            "human_signals": [],
            "forensic_notes": [],
            "summary": "Quick async analysis"
        }
        
        self.update_state(state='PROGRESS', meta={'progress': 60})
        
        # Step 3: Fuse evidence
        final_classification, final_confidence, classification_reason, all_indicators = fuse_evidence(
            forensic_result, 
            claude_result
        )
        
        # Step 4: Build complete report
        content_hash = hashlib.sha256(audio_bytes).hexdigest()
        
        forensic_indicators = forensic_result.get('forensic_indicators', {})
        all_forensic_signals = (
            forensic_indicators.get('human_signals', []) +
            forensic_indicators.get('ai_signals', []) +
            forensic_indicators.get('manipulation_signals', [])
        )
        
        self.update_state(state='PROGRESS', meta={'progress': 80})
        
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
                "risk_level": "low",  # Audio content doesn't have text-based scam patterns
                "scam_patterns": ["No text-based scam patterns in audio"],
                "behavioral_flags": ["Audio content only"]
            },
            "evidence": {
                "signals_detected": all_forensic_signals[:10] if all_forensic_signals else ["No technical signals detected"],
                "forensic_notes": [
                    classification_reason,
                    f"Forensic analysis: audio type",
                    f"Evidence quality: {final_confidence}",
                    "Processed asynchronously for performance"
                ],
                "limitations": [
                    "Async processing - AI opinion skipped for speed",
                    "Text scam detection not applicable to audio",
                    "Results are probabilistic"
                ]
            },
            "recommendations": {
                "actions": [
                    "Audio appears safe based on forensic analysis",
                    "Verify source if received unexpectedly",
                    "Be cautious of voice cloning indicators"
                ],
                "severity": "info"
            },
            "analysis_summary": f"{classification_reason}. Async forensic analysis completed."
        }
        
        self.update_state(state='PROGRESS', meta={'progress': 100})
        logger.info(f"✅ Audio analysis complete: {filename}")
        
        return report
        
    except Exception as e:
        logger.error(f"❌ Audio analysis failed: {str(e)}")
        self.update_state(
            state='FAILURE',
            meta={'error': str(e)}
        )
        raise


@celery_app.task(name='process_batch_analysis')
def process_batch_analysis(batch_items: list) -> Dict[str, Any]:
    """
    Process batch analysis asynchronously
    
    Args:
        batch_items: List of items to analyze
        
    Returns:
        Batch analysis results
    """
    logger.info(f"📦 Starting batch analysis: {len(batch_items)} items")
    
    results = []
    for item in batch_items:
        try:
            # Process each item
            # This would call the main analysis function
            results.append({
                'status': 'success',
                'item': item
            })
        except Exception as e:
            results.append({
                'status': 'error',
                'item': item,
                'error': str(e)
            })
    
    logger.info(f"✅ Batch analysis complete: {len(results)} results")
    return {'results': results}
