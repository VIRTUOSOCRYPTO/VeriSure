"""
Input Validation & Security Hardening
Phase 1 Critical Fix: Prevent DoS attacks, memory exhaustion, malicious uploads
"""
from fastapi import HTTPException, UploadFile
from typing import Optional, Tuple
import logging
import re

from config import (
    MAX_FILE_SIZE, MAX_TEXT_LENGTH, MAX_BATCH_SIZE,
    ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, ALLOWED_AUDIO_TYPES,
    validate_file_size, validate_text_length, validate_mime_type, validate_magic_bytes
)

logger = logging.getLogger(__name__)


class ValidationError(HTTPException):
    """Custom validation error"""
    def __init__(self, detail: str):
        super().__init__(status_code=400, detail=detail)


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal attacks
    Remove dangerous characters and limit length
    """
    # Remove path components
    filename = filename.split('/')[-1].split('\\')[-1]
    
    # Remove dangerous characters
    filename = re.sub(r'[^\w\s\-\.]', '', filename)
    
    # Limit length
    if len(filename) > 255:
        filename = filename[:255]
    
    # Ensure not empty
    if not filename:
        filename = "unnamed_file"
    
    return filename


async def validate_file_upload(
    file: UploadFile,
    allowed_types: list = None,
    max_size: int = MAX_FILE_SIZE
) -> Tuple[bytes, str, str]:
    """
    Validate and read uploaded file with security checks
    
    Args:
        file: Uploaded file object
        allowed_types: List of allowed MIME types (None = all)
        max_size: Maximum file size in bytes
    
    Returns:
        (file_bytes, filename, content_type)
    
    Raises:
        ValidationError: If validation fails
    """
    # 1. Validate filename
    if not file.filename:
        raise ValidationError("Filename is required")
    
    filename = sanitize_filename(file.filename)
    
    # 2. Validate MIME type
    content_type = file.content_type or "application/octet-stream"
    
    if allowed_types and content_type not in allowed_types:
        raise ValidationError(
            f"Invalid file type: {content_type}. "
            f"Allowed types: {', '.join(allowed_types)}"
        )
    
    # 3. Read file with size limit
    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error(f"File read error: {str(e)}")
        raise ValidationError(f"Failed to read file: {str(e)}")
    
    # 4. Validate file size
    file_size = len(file_bytes)
    
    if file_size == 0:
        raise ValidationError("File is empty")
    
    if file_size > max_size:
        size_mb = max_size / (1024 * 1024)
        raise ValidationError(
            f"File size ({file_size / (1024 * 1024):.2f}MB) exceeds maximum ({size_mb:.0f}MB)"
        )
    
    # 5. Validate magic bytes (prevent MIME type spoofing)
    if content_type.startswith('image/'):
        file_type = content_type.split('/')[-1]
        if not validate_magic_bytes(file_bytes, file_type):
            logger.warning(f"Magic bytes validation failed for {filename}")
            raise ValidationError(
                f"File content doesn't match declared type: {content_type}"
            )
    
    logger.info(f"✅ File validated: {filename} ({file_size / 1024:.2f}KB, {content_type})")
    
    return file_bytes, filename, content_type


def validate_text_input(text: str, max_length: int = MAX_TEXT_LENGTH) -> str:
    """
    Validate text input
    
    Args:
        text: Input text
        max_length: Maximum text length
    
    Returns:
        Validated text
    
    Raises:
        ValidationError: If validation fails
    """
    # 1. Check if empty
    if not text or not text.strip():
        raise ValidationError("Text content cannot be empty")
    
    # 2. Check length
    if len(text) > max_length:
        length_kb = max_length / 1024
        raise ValidationError(
            f"Text length ({len(text) / 1024:.2f}KB) exceeds maximum ({length_kb:.0f}KB)"
        )
    
    # 3. Check for null bytes (security)
    if '\x00' in text:
        raise ValidationError("Text contains null bytes")
    
    logger.info(f"✅ Text validated: {len(text)} characters")
    
    return text.strip()


def validate_url_input(url: str) -> str:
    """
    Validate URL input
    
    Args:
        url: Input URL
    
    Returns:
        Validated URL
    
    Raises:
        ValidationError: If validation fails
    """
    # 1. Check if empty
    if not url or not url.strip():
        raise ValidationError("URL cannot be empty")
    
    # 2. Check URL format
    url = url.strip()
    
    if not re.match(r'^https?://', url):
        raise ValidationError("URL must start with http:// or https://")
    
    # 3. Check length
    if len(url) > 2048:
        raise ValidationError("URL is too long (max 2048 characters)")
    
    # 4. Block local/private URLs (prevent SSRF attacks)
    blocked_patterns = [
        r'localhost',
        r'127\.0\.0\.',
        r'10\.\d+\.\d+\.\d+',
        r'172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+',
        r'192\.168\.\d+\.\d+',
        r'0\.0\.0\.0',
        r'::1',
        r'file://',
        r'ftp://'
    ]
    
    for pattern in blocked_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            raise ValidationError(
                "URL points to private/local address (security restriction)"
            )
    
    logger.info(f"✅ URL validated: {url}")
    
    return url


def validate_batch_size(batch_size: int) -> int:
    """
    Validate batch size
    
    Args:
        batch_size: Number of items in batch
    
    Returns:
        Validated batch size
    
    Raises:
        ValidationError: If validation fails
    """
    if batch_size < 1:
        raise ValidationError("Batch size must be at least 1")
    
    if batch_size > MAX_BATCH_SIZE:
        raise ValidationError(
            f"Batch size ({batch_size}) exceeds maximum ({MAX_BATCH_SIZE})"
        )
    
    return batch_size


def validate_report_ids(report_ids: list) -> list:
    """
    Validate report IDs for comparison
    
    Args:
        report_ids: List of report IDs
    
    Returns:
        Validated report IDs
    
    Raises:
        ValidationError: If validation fails
    """
    if not report_ids:
        raise ValidationError("Report IDs list cannot be empty")
    
    if len(report_ids) < 2:
        raise ValidationError("At least 2 report IDs required for comparison")
    
    if len(report_ids) > 10:
        raise ValidationError("Maximum 10 reports can be compared at once")
    
    # Validate each ID is a string and not empty
    validated_ids = []
    for report_id in report_ids:
        if not isinstance(report_id, str) or not report_id.strip():
            raise ValidationError(f"Invalid report ID: {report_id}")
        validated_ids.append(report_id.strip())
    
    # Check for duplicates
    if len(validated_ids) != len(set(validated_ids)):
        raise ValidationError("Duplicate report IDs detected")
    
    return validated_ids


def validate_pagination(limit: int, skip: int) -> Tuple[int, int]:
    """
    Validate pagination parameters
    
    Args:
        limit: Number of items per page
        skip: Number of items to skip
    
    Returns:
        (validated_limit, validated_skip)
    
    Raises:
        ValidationError: If validation fails
    """
    # Validate limit
    if limit < 1:
        raise ValidationError("Limit must be at least 1")
    
    if limit > 100:
        raise ValidationError("Limit cannot exceed 100")
    
    # Validate skip
    if skip < 0:
        raise ValidationError("Skip cannot be negative")
    
    if skip > 10000:
        raise ValidationError("Skip cannot exceed 10,000 (use pagination instead)")
    
    return limit, skip


# ============================================================================
# MIDDLEWARE HELPERS
# ============================================================================

async def validate_content_length(request, max_size: int = MAX_FILE_SIZE):
    """
    Middleware to validate Content-Length header
    Prevents large payloads from being processed
    """
    content_length = request.headers.get('content-length')
    
    if content_length:
        content_length = int(content_length)
        
        if content_length > max_size:
            size_mb = max_size / (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"Request payload too large ({content_length / (1024 * 1024):.2f}MB). Maximum: {size_mb:.0f}MB"
            )


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    # Test validations
    print("Testing input validations...")
    
    # Test filename sanitization
    assert sanitize_filename("../../etc/passwd") == "etcpasswd"
    assert sanitize_filename("test<script>.jpg") == "testscript.jpg"
    assert sanitize_filename("a" * 300 + ".txt") == ("a" * 251 + ".txt")
    
    # Test text validation
    try:
        validate_text_input("")
        assert False, "Should have raised error"
    except ValidationError:
        pass
    
    # Test URL validation
    try:
        validate_url_input("http://localhost/test")
        assert False, "Should have raised error"
    except ValidationError:
        pass
    
    validate_url_input("https://example.com/test")
    
    print("✅ All validation tests passed!")
