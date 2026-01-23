"""
Unit tests for API versioning
Phase 1 Critical Fix: Ensure API versioning works correctly
"""
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Import server
backend_path = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))


@pytest.mark.unit
def test_api_v1_prefix():
    """Test that API v1 prefix is configured"""
    from server import api_router
    assert api_router.prefix == "/api/v1"


@pytest.mark.unit  
def test_api_version_in_app():
    """Test that app version is updated"""
    from server import app
    assert app.version == "3.0.0"


@pytest.mark.unit
def test_config_api_prefix():
    """Test API prefix in config"""
    from config import API_PREFIX
    assert API_PREFIX == "/api/v1"
