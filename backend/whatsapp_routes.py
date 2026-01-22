"""
WhatsApp Bot API Routes
Proxy endpoints to communicate with Node.js WhatsApp bot service
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from slowapi import Limiter
from slowapi.util import get_remote_address
import aiohttp
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# WhatsApp bot service URL
WHATSAPP_BOT_URL = "http://localhost:3001"

# Create router
whatsapp_router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@whatsapp_router.get("/status")
@limiter.limit("30/minute")
async def get_bot_status(request: Request):
    """
    Get WhatsApp bot connection status
    Returns: connected status, QR code (if available), connection status
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{WHATSAPP_BOT_URL}/status", timeout=aiohttp.ClientTimeout(total=5)) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    raise HTTPException(status_code=response.status, detail="Bot service error")
    except aiohttp.ClientConnectorError:
        raise HTTPException(status_code=503, detail="WhatsApp bot service is not running")
    except Exception as e:
        logger.error(f"Bot status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check bot status: {str(e)}")


@whatsapp_router.post("/init")
@limiter.limit("10/minute")
async def initialize_bot(request: Request):
    """
    Initialize WhatsApp bot connection
    This will generate a QR code for authentication if not already connected
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{WHATSAPP_BOT_URL}/init", timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    error_text = await response.text()
                    raise HTTPException(status_code=response.status, detail=f"Bot initialization failed: {error_text}")
    except aiohttp.ClientConnectorError:
        raise HTTPException(status_code=503, detail="WhatsApp bot service is not running. Please contact administrator.")
    except Exception as e:
        logger.error(f"Bot initialization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize bot: {str(e)}")


@whatsapp_router.post("/logout")
@limiter.limit("5/minute")
async def logout_bot(request: Request):
    """
    Logout WhatsApp bot and clear session
    This will require re-scanning QR code on next connection
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{WHATSAPP_BOT_URL}/logout", timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    error_text = await response.text()
                    raise HTTPException(status_code=response.status, detail=f"Bot logout failed: {error_text}")
    except aiohttp.ClientConnectorError:
        raise HTTPException(status_code=503, detail="WhatsApp bot service is not running")
    except Exception as e:
        logger.error(f"Bot logout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to logout bot: {str(e)}")


@whatsapp_router.get("/usage/{phone_number}")
@limiter.limit("30/minute")
async def get_usage_stats(request: Request, phone_number: str):
    """
    Get usage statistics for a phone number
    Shows: count, limit, remaining, reset time
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{WHATSAPP_BOT_URL}/usage/{phone_number}", timeout=aiohttp.ClientTimeout(total=5)) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    error_text = await response.text()
                    raise HTTPException(status_code=response.status, detail=f"Usage check failed: {error_text}")
    except aiohttp.ClientConnectorError:
        raise HTTPException(status_code=503, detail="WhatsApp bot service is not running")
    except Exception as e:
        logger.error(f"Usage check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check usage: {str(e)}")


@whatsapp_router.get("/health")
async def bot_health_check():
    """
    Health check for WhatsApp bot service
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{WHATSAPP_BOT_URL}/health", timeout=aiohttp.ClientTimeout(total=5)) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "bot_service": "healthy",
                        "bot_details": data
                    }
                else:
                    return {
                        "bot_service": "unhealthy",
                        "status_code": response.status
                    }
    except aiohttp.ClientConnectorError:
        return {
            "bot_service": "offline",
            "message": "WhatsApp bot service is not running"
        }
    except Exception as e:
        logger.error(f"Bot health check error: {str(e)}")
        return {
            "bot_service": "error",
            "error": str(e)
        }
