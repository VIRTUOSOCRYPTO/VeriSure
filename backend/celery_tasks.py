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
    Process video analysis asynchronously
    
    Args:
        video_bytes: Video file bytes
        filename: Original filename
        
    Returns:
        Analysis result
    """
    logger.info(f"📹 Starting async video analysis: {filename}")
    
    try:
        # Import here to avoid circular imports
        from forensics import ForensicAnalyzer
        
        analyzer = ForensicAnalyzer()
        result = analyzer.analyze_video(video_bytes, filename)
        
        logger.info(f"✅ Video analysis complete: {filename}")
        return result
        
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
    Process audio analysis asynchronously
    
    Args:
        audio_bytes: Audio file bytes
        filename: Original filename
        
    Returns:
        Analysis result
    """
    logger.info(f"🎵 Starting async audio analysis: {filename}")
    
    try:
        # Import here to avoid circular imports
        from forensics import ForensicAnalyzer
        
        analyzer = ForensicAnalyzer()
        result = analyzer.analyze_audio(audio_bytes, filename)
        
        logger.info(f"✅ Audio analysis complete: {filename}")
        return result
        
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
