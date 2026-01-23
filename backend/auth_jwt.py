"""
JWT Authentication System
Complete user authentication with JWT tokens
"""
import os
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import uuid
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient

from models import UserRole
from password_utils import hash_password, verify_password, generate_secure_token

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', generate_secure_token(64))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days

logger.info(f"🔐 JWT Authentication enabled. Secret key initialized.")

# Bearer token security
security = HTTPBearer(auto_error=False)


class JWTManager:
    """JWT token management"""
    
    def __init__(self, db):
        self.db = db
    
    def create_access_token(self, user_id: str, email: str, role: str) -> str:
        """
        Create JWT access token
        
        Args:
            user_id: User ID
            email: User email
            role: User role
            
        Returns:
            JWT token string
        """
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        payload = {
            "sub": user_id,
            "email": email,
            "role": role,
            "type": "access",
            "exp": expire,
            "iat": datetime.now(timezone.utc)
        }
        
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return token
    
    def create_refresh_token(self, user_id: str) -> str:
        """
        Create JWT refresh token
        
        Args:
            user_id: User ID
            
        Returns:
            Refresh token string
        """
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        payload = {
            "sub": user_id,
            "type": "refresh",
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "jti": str(uuid.uuid4())  # Unique token ID for revocation
        }
        
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return token
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode JWT token
        
        Args:
            token: JWT token string
            
        Returns:
            Token payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            return None
    
    async def store_refresh_token(self, user_id: str, token: str, jti: str):
        """
        Store refresh token in database
        
        Args:
            user_id: User ID
            token: Refresh token
            jti: Token unique ID
        """
        expire_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        await self.db.refresh_tokens.insert_one({
            "user_id": user_id,
            "token_jti": jti,
            "token": token,
            "created_at": datetime.now(timezone.utc),
            "expires_at": expire_at,
            "revoked": False
        })
    
    async def is_token_revoked(self, jti: str) -> bool:
        """
        Check if refresh token is revoked
        
        Args:
            jti: Token unique ID
            
        Returns:
            True if revoked, False otherwise
        """
        token_doc = await self.db.refresh_tokens.find_one({"token_jti": jti})
        return token_doc and token_doc.get("revoked", False)
    
    async def revoke_token(self, jti: str):
        """
        Revoke a refresh token
        
        Args:
            jti: Token unique ID
        """
        await self.db.refresh_tokens.update_one(
            {"token_jti": jti},
            {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc)}}
        )
    
    async def revoke_all_user_tokens(self, user_id: str):
        """
        Revoke all refresh tokens for a user
        
        Args:
            user_id: User ID
        """
        await self.db.refresh_tokens.update_many(
            {"user_id": user_id, "revoked": False},
            {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc)}}
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db = None  # Injected by endpoint
) -> Dict[str, Any]:
    """
    Get current authenticated user from JWT token
    
    Args:
        credentials: Bearer token from Authorization header
        db: Database connection
        
    Returns:
        User data dict
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    jwt_manager = JWTManager(db)
    payload = jwt_manager.verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    user_id = payload.get("sub")
    
    # Fetch user from database
    user = await db.users.find_one({"user_id": user_id})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if user.get("disabled", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db = None
) -> Optional[Dict[str, Any]]:
    """
    Get current user if authenticated, None otherwise
    Allows public access but provides user context if available
    
    Args:
        credentials: Bearer token
        db: Database connection
        
    Returns:
        User data dict or None
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def require_role(required_role: UserRole):
    """
    Dependency to require specific user role
    
    Args:
        required_role: Minimum required role
        
    Returns:
        Dependency function
    """
    role_hierarchy = {
        UserRole.FREE: 0,
        UserRole.PREMIUM: 1,
        UserRole.ENTERPRISE: 2,
        UserRole.ADMIN: 3
    }
    
    async def role_checker(user: Dict = Depends(get_current_user)) -> Dict:
        user_role = UserRole(user.get("role", "free"))
        
        if role_hierarchy.get(user_role, 0) < role_hierarchy.get(required_role, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role.value} tier or higher"
            )
        
        return user
    
    return role_checker
