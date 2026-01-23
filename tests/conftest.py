"""
Pytest configuration and fixtures
"""
import pytest
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))


@pytest.fixture
def sample_text():
    """Sample text for testing"""
    return "This is a test message asking for your OTP and bank details urgently."


@pytest.fixture
def sample_image_bytes():
    """Sample image bytes (1x1 PNG)"""
    # Minimal valid PNG
    return b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'


@pytest.fixture
def sample_config():
    """Sample configuration"""
    return {
        "MAX_FILE_SIZE": 500 * 1024 * 1024,
        "MAX_TEXT_LENGTH": 100 * 1024,
        "TIER_PRICING": {
            "free": 0,
            "premium": 299,
            "enterprise": 14999
        }
    }
