"""
API Key Authentication Middleware
Provides secure API key-based authentication for protected endpoints
"""
import os
import secrets
from typing import Optional, List
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
import logging

logger = logging.getLogger(__name__)

# API Key configuration
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# Generate a default API key if not set
DEFAULT_API_KEY = os.environ.get('API_KEY', secrets.token_urlsafe(32))

# Store valid API keys (in production, use database)
VALID_API_KEYS = {
    DEFAULT_API_KEY: {
        'name': 'default',
        'tier': 'premium',
        'rate_limit': 1000  # requests per day
    }
}

logger.info(f"🔑 API Authentication enabled. Default key: {DEFAULT_API_KEY[:16]}...")


async def get_api_key(api_key: Optional[str] = Security(api_key_header)):
    """
    Validate API key from request header
    
    Args:
        api_key: API key from X-API-Key header
        
    Returns:
        API key info if valid
        
    Raises:
        HTTPException: If API key is invalid or missing
    """
    # For public endpoints, API key is optional
    # This function is only used for protected endpoints
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key missing. Include 'X-API-Key' header."
        )
    
    if api_key not in VALID_API_KEYS:
        logger.warning(f"❌ Invalid API key attempt: {api_key[:16]}...")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key"
        )
    
    logger.info(f"✅ Valid API key: {VALID_API_KEYS[api_key]['name']}")
    return VALID_API_KEYS[api_key]


async def get_optional_api_key(api_key: Optional[str] = Security(api_key_header)):
    """
    Optional API key validation - allows public access
    
    Returns:
        API key info if provided and valid, None otherwise
    """
    if not api_key:
        return None
    
    if api_key in VALID_API_KEYS:
        logger.info(f"✅ Authenticated request: {VALID_API_KEYS[api_key]['name']}")
        return VALID_API_KEYS[api_key]
    
    return None


def add_api_key(key: str, name: str, tier: str = 'free', rate_limit: int = 100) -> bool:
    """
    Add a new API key
    
    Args:
        key: API key string
        name: Key identifier name
        tier: Subscription tier (free, premium, enterprise)
        rate_limit: Daily request limit
        
    Returns:
        True if added successfully
    """
    if key in VALID_API_KEYS:
        logger.warning(f"API key already exists: {name}")
        return False
    
    VALID_API_KEYS[key] = {
        'name': name,
        'tier': tier,
        'rate_limit': rate_limit
    }
    
    logger.info(f"✅ Added new API key: {name} ({tier} tier)")
    return True


def revoke_api_key(key: str) -> bool:
    """
    Revoke an API key
    
    Args:
        key: API key to revoke
        
    Returns:
        True if revoked successfully
    """
    if key in VALID_API_KEYS:
        name = VALID_API_KEYS[key]['name']
        del VALID_API_KEYS[key]
        logger.info(f"🗑️ Revoked API key: {name}")
        return True
    
    return False


def generate_new_api_key() -> str:
    """
    Generate a new secure API key
    
    Returns:
        Newly generated API key
    """
    return secrets.token_urlsafe(32)
