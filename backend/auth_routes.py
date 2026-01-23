"""
Authentication & Security Routes
Handles user registration, login, JWT management, audit logs, and GDPR compliance
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import logging

from models import (
    UserRegistration, UserLogin, TokenResponse, RefreshTokenRequest,
    UserProfile, UserUpdate, PasswordChange, UserRole,
    AuditLogEntry, ConsentRecord, DataExportRequest
)
from auth_jwt import JWTManager, get_current_user, get_optional_user, require_role
from password_utils import hash_password, verify_password, validate_password_strength
from audit_logger import AuditLogger
from gdpr_compliance import GDPRManager

logger = logging.getLogger(__name__)

# Create router
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
user_router = APIRouter(prefix="/user", tags=["User Management"])
admin_router = APIRouter(prefix="/admin", tags=["Admin"])


# Dependency to inject DB
async def get_db():
    """Get database connection from app state"""
    from server import db
    return db


# Dependency to inject managers
async def get_jwt_manager(db = Depends(get_db)):
    """Get JWT manager"""
    from server import jwt_manager
    return jwt_manager


async def get_audit_logger(db = Depends(get_db)):
    """Get audit logger"""
    from server import audit_logger
    return audit_logger


async def get_gdpr_manager(db = Depends(get_db)):
    """Get GDPR manager"""
    from server import gdpr_manager
    return gdpr_manager


# Helper to inject user with DB
async def get_current_user_with_db(
    request: Request,
    db = Depends(get_db)
) -> Dict[str, Any]:
    """Get current user with database context"""
    from fastapi.security import HTTPBearer
    from auth_jwt import get_current_user
    
    security = HTTPBearer(auto_error=False)
    credentials = await security(request)
    return await get_current_user(credentials, db)


# ============== AUTHENTICATION ENDPOINTS ==============

@auth_router.post("/register", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserRegistration,
    request: Request,
    db = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """
    Register a new user
    
    - Creates user account with encrypted password
    - Assigns FREE tier by default
    - Logs registration in audit trail
    """
    try:
        # Validate password strength
        is_valid, issues = validate_password_strength(user_data.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Password does not meet requirements", "issues": issues}
            )
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            await audit_logger.log_request(
                request,
                action="registration_failed",
                status="failure",
                details={"reason": "email_exists"}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        user_id = str(uuid.uuid4())
        hashed_password = hash_password(user_data.password)
        
        user_doc = {
            "user_id": user_id,
            "email": user_data.email,
            "password_hash": hashed_password,
            "full_name": user_data.full_name,
            "organization": user_data.organization,
            "role": UserRole.FREE.value,
            "created_at": datetime.now(timezone.utc),
            "last_login": None,
            "api_calls_count": 0,
            "api_calls_limit": 100,  # Free tier limit
            "disabled": False,
            "deleted": False
        }
        
        await db.users.insert_one(user_doc)
        
        # Log registration
        await audit_logger.log_request(
            request,
            action="user_registered",
            details={"user_id": user_id, "email": user_data.email}
        )
        
        logger.info(f"✅ New user registered: {user_data.email}")
        
        # Return user profile (without password)
        return UserProfile(
            user_id=user_id,
            email=user_data.email,
            full_name=user_data.full_name,
            role=UserRole.FREE,
            organization=user_data.organization,
            created_at=user_doc["created_at"],
            api_calls_count=0,
            api_calls_limit=100
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@auth_router.post("/login", response_model=TokenResponse)
async def login_user(
    credentials: UserLogin,
    request: Request,
    db = Depends(get_db),
    jwt_manager: JWTManager = Depends(get_jwt_manager),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """
    User login
    
    - Validates credentials
    - Returns JWT access & refresh tokens
    - Logs login attempt in audit trail
    """
    try:
        # Find user
        user = await db.users.find_one({"email": credentials.email})
        
        if not user:
            await audit_logger.log_request(
                request,
                action="login_failed",
                status="failure",
                details={"email": credentials.email, "reason": "user_not_found"}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(credentials.password, user["password_hash"]):
            await audit_logger.log_request(
                request,
                action="login_failed",
                status="failure",
                details={"email": credentials.email, "reason": "invalid_password"}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if account is disabled
        if user.get("disabled", False):
            await audit_logger.log_request(
                request,
                action="login_failed",
                status="failure",
                details={"email": credentials.email, "reason": "account_disabled"}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled"
            )
        
        # Generate tokens
        access_token = jwt_manager.create_access_token(
            user_id=user["user_id"],
            email=user["email"],
            role=user["role"]
        )
        
        refresh_token = jwt_manager.create_refresh_token(user_id=user["user_id"])
        
        # Decode refresh token to get JTI
        refresh_payload = jwt_manager.verify_token(refresh_token)
        if refresh_payload:
            await jwt_manager.store_refresh_token(
                user_id=user["user_id"],
                token=refresh_token,
                jti=refresh_payload.get("jti")
            )
        
        # Update last login
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
        
        # Log successful login
        await audit_logger.log_request(
            request,
            action="user_logged_in",
            details={"user_id": user["user_id"], "email": user["email"]}
        )
        
        logger.info(f"✅ User logged in: {user['email']}")
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=60 * 60  # 1 hour
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: Request,
    refresh_request: RefreshTokenRequest,
    db = Depends(get_db),
    jwt_manager: JWTManager = Depends(get_jwt_manager),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """
    Refresh access token using refresh token
    
    - Validates refresh token
    - Returns new access token & refresh token
    """
    try:
        # Verify refresh token
        payload = jwt_manager.verify_token(refresh_request.refresh_token)
        
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Check if token is revoked
        jti = payload.get("jti")
        if await jwt_manager.is_token_revoked(jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked"
            )
        
        user_id = payload.get("sub")
        
        # Get user
        user = await db.users.find_one({"user_id": user_id})
        if not user or user.get("disabled", False):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or disabled"
            )
        
        # Generate new tokens
        access_token = jwt_manager.create_access_token(
            user_id=user["user_id"],
            email=user["email"],
            role=user["role"]
        )
        
        new_refresh_token = jwt_manager.create_refresh_token(user_id=user["user_id"])
        
        # Store new refresh token
        new_payload = jwt_manager.verify_token(new_refresh_token)
        if new_payload:
            await jwt_manager.store_refresh_token(
                user_id=user["user_id"],
                token=new_refresh_token,
                jti=new_payload.get("jti")
            )
        
        # Revoke old refresh token
        await jwt_manager.revoke_token(jti)
        
        # Log token refresh
        await audit_logger.log_action(
            action="token_refreshed",
            user_id=user["user_id"],
            user_email=user["email"]
        )
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=60 * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )


@auth_router.post("/logout")
async def logout_user(
    request: Request,
    user: Dict = Depends(get_current_user_with_db),
    jwt_manager: JWTManager = Depends(get_jwt_manager),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """
    User logout
    
    - Revokes all user refresh tokens
    - Logs logout in audit trail
    """
    try:
        # Revoke all user tokens
        await jwt_manager.revoke_all_user_tokens(user["user_id"])
        
        # Log logout
        await audit_logger.log_action(
            action="user_logged_out",
            user_id=user["user_id"],
            user_email=user["email"]
        )
        
        logger.info(f"✅ User logged out: {user['email']}")
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )


@auth_router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    user: Dict = Depends(get_current_user_with_db)
):
    """
    Get current user profile
    
    - Returns user information
    - Requires authentication
    """
    return UserProfile(
        user_id=user["user_id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        organization=user.get("organization"),
        created_at=user["created_at"],
        last_login=user.get("last_login"),
        api_calls_count=user.get("api_calls_count", 0),
        api_calls_limit=user.get("api_calls_limit", 100)
    )


# ============== USER MANAGEMENT ENDPOINTS ==============

@user_router.put("/profile", response_model=UserProfile)
async def update_user_profile(
    updates: UserUpdate,
    user: Dict = Depends(get_current_user_with_db),
    db = Depends(get_db),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """
    Update user profile
    
    - Updates full name and/or organization
    """
    try:
        update_fields = {}
        if updates.full_name:
            update_fields["full_name"] = updates.full_name
        if updates.organization is not None:
            update_fields["organization"] = updates.organization
        
        if update_fields:
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": update_fields}
            )
            
            # Log update
            await audit_logger.log_action(
                action="profile_updated",
                user_id=user["user_id"],
                user_email=user["email"],
                details={"fields_updated": list(update_fields.keys())}
            )
        
        # Get updated user
        updated_user = await db.users.find_one({"user_id": user["user_id"]})
        
        return UserProfile(
            user_id=updated_user["user_id"],
            email=updated_user["email"],
            full_name=updated_user["full_name"],
            role=UserRole(updated_user["role"]),
            organization=updated_user.get("organization"),
            created_at=updated_user["created_at"],
            last_login=updated_user.get("last_login"),
            api_calls_count=updated_user.get("api_calls_count", 0),
            api_calls_limit=updated_user.get("api_calls_limit", 100)
        )
        
    except Exception as e:
        logger.error(f"Profile update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Profile update failed: {str(e)}"
        )


@user_router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    user: Dict = Depends(get_current_user_with_db),
    db = Depends(get_db),
    jwt_manager: JWTManager = Depends(get_jwt_manager),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """
    Change user password
    
    - Validates current password
    - Updates to new password
    - Revokes all tokens (requires re-login)
    """
    try:
        # Verify current password
        if not verify_password(password_data.current_password, user["password_hash"]):
            await audit_logger.log_action(
                action="password_change_failed",
                user_id=user["user_id"],
                user_email=user["email"],
                status="failure",
                details={"reason": "invalid_current_password"}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        
        # Validate new password
        is_valid, issues = validate_password_strength(password_data.new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "New password does not meet requirements", "issues": issues}
            )
        
        # Hash new password
        new_password_hash = hash_password(password_data.new_password)
        
        # Update password
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"password_hash": new_password_hash}}
        )
        
        # Revoke all tokens (security measure)
        await jwt_manager.revoke_all_user_tokens(user["user_id"])
        
        # Log password change
        await audit_logger.log_action(
            action="password_changed",
            user_id=user["user_id"],
            user_email=user["email"]
        )
        
        logger.info(f"✅ Password changed: {user['email']}")
        
        return {"message": "Password changed successfully. Please log in again."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password change failed: {str(e)}"
        )


# ============== GDPR COMPLIANCE ENDPOINTS ==============

@user_router.get("/export")
async def export_user_data(
    user: Dict = Depends(get_current_user_with_db),
    gdpr_manager: GDPRManager = Depends(get_gdpr_manager),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """
    Export all user data (GDPR Right to Access)
    
    - Returns ZIP file with all user data
    - Includes profile, analyses, audit logs
    """
    try:
        # Generate data export
        zip_data = await gdpr_manager.export_user_data(
            user_id=user["user_id"],
            include_analyses=True,
            include_audit_logs=True
        )
        
        # Log export
        await audit_logger.log_action(
            action="data_exported",
            user_id=user["user_id"],
            user_email=user["email"]
        )
        
        logger.info(f"✅ Data exported: {user['email']}")
        
        # Return as ZIP file
        return StreamingResponse(
            iter([zip_data]),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=verisure_data_export_{user['user_id'][:8]}.zip"
            }
        )
        
    except Exception as e:
        logger.error(f"Data export error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data export failed: {str(e)}"
        )


@user_router.delete("/delete")
async def delete_user_account(
    user: Dict = Depends(get_current_user_with_db),
    gdpr_manager: GDPRManager = Depends(get_gdpr_manager),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """
    Delete user account (GDPR Right to Erasure)
    
    - Permanently deletes all user data
    - Cannot be undone
    """
    try:
        # Log deletion request
        await audit_logger.log_action(
            action="account_deletion_requested",
            user_id=user["user_id"],
            user_email=user["email"]
        )
        
        # Delete all user data
        deleted_counts = await gdpr_manager.delete_user_data(user["user_id"])
        
        logger.info(f"✅ Account deleted: {user['email']} - {deleted_counts}")
        
        return {
            "message": "Account deleted successfully",
            "deleted_records": deleted_counts
        }
        
    except Exception as e:
        logger.error(f"Account deletion error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Account deletion failed: {str(e)}"
        )


@user_router.post("/consent")
async def record_user_consent(
    consent: ConsentRecord,
    request: Request,
    user: Dict = Depends(get_current_user_with_db),
    gdpr_manager: GDPRManager = Depends(get_gdpr_manager)
):
    """
    Record user consent
    
    - Tracks consent for data collection, analytics, marketing
    """
    try:
        ip_address = request.client.host if request.client else None
        
        await gdpr_manager.record_consent(
            user_id=user["user_id"],
            consent_type=consent.consent_type,
            consent_given=consent.consent_given,
            ip_address=ip_address
        )
        
        return {"message": "Consent recorded successfully"}
        
    except Exception as e:
        logger.error(f"Consent recording error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Consent recording failed: {str(e)}"
        )


@user_router.get("/consents")
async def get_user_consents(
    user: Dict = Depends(get_current_user_with_db),
    gdpr_manager: GDPRManager = Depends(get_gdpr_manager)
):
    """
    Get user consent records
    
    - Returns all consent records for the user
    """
    try:
        consents = await gdpr_manager.get_user_consents(user["user_id"])
        return {"consents": consents}
        
    except Exception as e:
        logger.error(f"Get consents error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve consents: {str(e)}"
        )


# ============== ADMIN ENDPOINTS ==============

@admin_router.get("/audit-logs")
async def get_audit_logs(
    limit: int = 100,
    skip: int = 0,
    user_id: Optional[str] = None,
    user: Dict = Depends(require_role(UserRole.ADMIN)),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """
    Get audit logs (Admin only)
    
    - Retrieves audit trail
    - Can filter by user_id
    """
    try:
        if user_id:
            logs = await audit_logger.get_user_audit_trail(user_id, limit, skip)
        else:
            # Get all logs
            db = await get_db()
            cursor = db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit)
            logs = await cursor.to_list(length=limit)
        
        return {"logs": logs, "count": len(logs)}
        
    except Exception as e:
        logger.error(f"Get audit logs error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve audit logs: {str(e)}"
        )


@admin_router.get("/audit-stats")
async def get_audit_statistics(
    user: Dict = Depends(require_role(UserRole.ADMIN)),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """
    Get audit statistics (Admin only)
    
    - Returns audit trail statistics
    """
    try:
        stats = await audit_logger.get_audit_statistics()
        return stats
        
    except Exception as e:
        logger.error(f"Get audit stats error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve audit statistics: {str(e)}"
        )


@admin_router.get("/security-events")
async def get_security_events(
    hours: int = 24,
    user: Dict = Depends(require_role(UserRole.ADMIN)),
    audit_logger: AuditLogger = Depends(get_audit_logger)
):
    """
    Get security events (Admin only)
    
    - Returns recent security events
    """
    try:
        events = await audit_logger.get_security_events(hours=hours)
        return {"events": events, "count": len(events)}
        
    except Exception as e:
        logger.error(f"Get security events error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve security events: {str(e)}"
        )


@admin_router.post("/cleanup-old-data")
async def cleanup_old_data(
    retention_days: int = 365,
    user: Dict = Depends(require_role(UserRole.ADMIN)),
    gdpr_manager: GDPRManager = Depends(get_gdpr_manager)
):
    """
    Clean up old data (Admin only)
    
    - Deletes data older than retention period
    """
    try:
        deleted_counts = await gdpr_manager.cleanup_old_data(retention_days)
        return {
            "message": "Data cleanup completed",
            "deleted_records": deleted_counts
        }
        
    except Exception as e:
        logger.error(f"Data cleanup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data cleanup failed: {str(e)}"
        )
