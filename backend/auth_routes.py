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



# ============== ANALYTICS DASHBOARD ENDPOINTS (Phase 4) ==============

@admin_router.get("/analytics/overview")
async def get_analytics_overview(
    user: Dict = Depends(require_role(UserRole.ADMIN)),
    db = Depends(get_db)
):
    """
    Get analytics overview (Admin only)
    
    Returns:
    - Total analyses
    - Total users
    - High-risk detections
    - Recent activity
    - Growth metrics
    """
    try:
        from datetime import timedelta, timezone
        
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)
        
        # Total counts
        total_analyses = await db.analysis_reports.count_documents({})
        total_users = await db.users.count_documents({})
        high_risk_count = await db.analysis_reports.count_documents(
            {"scam_assessment.risk_level": "high"}
        )
        
        # Today's metrics
        today_analyses = await db.analysis_reports.count_documents({
            "timestamp": {"$gte": today_start.isoformat()}
        })
        
        # Yesterday's metrics for comparison
        yesterday_analyses = await db.analysis_reports.count_documents({
            "timestamp": {
                "$gte": yesterday_start.isoformat(),
                "$lt": today_start.isoformat()
            }
        })
        
        # Weekly metrics
        week_analyses = await db.analysis_reports.count_documents({
            "timestamp": {"$gte": week_start.isoformat()}
        })
        
        # Monthly metrics
        month_analyses = await db.analysis_reports.count_documents({
            "timestamp": {"$gte": month_start.isoformat()}
        })
        
        # Growth calculations
        today_growth = ((today_analyses - yesterday_analyses) / yesterday_analyses * 100) if yesterday_analyses > 0 else 0
        
        # Risk distribution
        medium_risk = await db.analysis_reports.count_documents(
            {"scam_assessment.risk_level": "medium"}
        )
        low_risk = await db.analysis_reports.count_documents(
            {"scam_assessment.risk_level": "low"}
        )
        
        # User role distribution
        free_users = await db.users.count_documents({"role": "free"})
        premium_users = await db.users.count_documents({"role": "premium"})
        enterprise_users = await db.users.count_documents({"role": "enterprise"})
        
        # Recent activity (last 10)
        recent_analyses = await db.analysis_reports.find(
            {},
            {"_id": 0, "report_id": 1, "timestamp": 1, "scam_assessment.risk_level": 1, "origin_verdict.classification": 1}
        ).sort("timestamp", -1).limit(10).to_list(length=10)
        
        return {
            "overview": {
                "total_analyses": total_analyses,
                "total_users": total_users,
                "high_risk_detections": high_risk_count,
                "today_analyses": today_analyses,
                "today_growth_percent": round(today_growth, 2)
            },
            "time_metrics": {
                "today": today_analyses,
                "yesterday": yesterday_analyses,
                "this_week": week_analyses,
                "this_month": month_analyses
            },
            "risk_distribution": {
                "high": high_risk_count,
                "medium": medium_risk,
                "low": low_risk
            },
            "user_distribution": {
                "free": free_users,
                "premium": premium_users,
                "enterprise": enterprise_users,
                "total": total_users
            },
            "recent_activity": recent_analyses
        }
        
    except Exception as e:
        logger.error(f"Analytics overview error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve analytics overview: {str(e)}"
        )


@admin_router.get("/analytics/trends")
async def get_analytics_trends(
    days: int = 30,
    user: Dict = Depends(require_role(UserRole.ADMIN)),
    db = Depends(get_db)
):
    """
    Get analytics trends over time (Admin only)
    
    Returns time-series data for charts:
    - Analyses per day
    - Risk levels per day
    - Origin classifications per day
    """
    try:
        from datetime import timedelta, timezone
        from collections import defaultdict
        
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)
        
        # Get all analyses in the time range
        cursor = db.analysis_reports.find(
            {"timestamp": {"$gte": start_date.isoformat()}},
            {
                "_id": 0,
                "timestamp": 1,
                "scam_assessment.risk_level": 1,
                "origin_verdict.classification": 1
            }
        )
        analyses = await cursor.to_list(length=None)
        
        # Group by date
        daily_data = defaultdict(lambda: {
            "date": "",
            "total": 0,
            "high_risk": 0,
            "medium_risk": 0,
            "low_risk": 0,
            "ai_generated": 0,
            "original": 0,
            "unclear": 0
        })
        
        for analysis in analyses:
            try:
                # Parse timestamp
                ts = datetime.fromisoformat(analysis["timestamp"].replace('Z', '+00:00'))
                date_key = ts.strftime("%Y-%m-%d")
                
                # Update counts
                daily_data[date_key]["date"] = date_key
                daily_data[date_key]["total"] += 1
                
                # Risk levels
                risk = analysis.get("scam_assessment", {}).get("risk_level", "").lower()
                if risk == "high":
                    daily_data[date_key]["high_risk"] += 1
                elif risk == "medium":
                    daily_data[date_key]["medium_risk"] += 1
                elif risk == "low":
                    daily_data[date_key]["low_risk"] += 1
                
                # Origin classification
                classification = analysis.get("origin_verdict", {}).get("classification", "").lower()
                if "ai" in classification:
                    daily_data[date_key]["ai_generated"] += 1
                elif "original" in classification:
                    daily_data[date_key]["original"] += 1
                else:
                    daily_data[date_key]["unclear"] += 1
            except Exception as parse_error:
                logger.warning(f"Failed to parse analysis: {parse_error}")
                continue
        
        # Convert to sorted list
        trends = sorted(daily_data.values(), key=lambda x: x["date"])
        
        return {
            "period_days": days,
            "data_points": len(trends),
            "trends": trends
        }
        
    except Exception as e:
        logger.error(f"Analytics trends error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve analytics trends: {str(e)}"
        )


@admin_router.get("/analytics/scam-patterns")
async def get_scam_pattern_analytics(
    limit: int = 20,
    user: Dict = Depends(require_role(UserRole.ADMIN)),
    db = Depends(get_db)
):
    """
    Get scam pattern frequency analytics (Admin only)
    
    Returns:
    - Most common scam patterns
    - Pattern frequency distribution
    - Behavioral flag statistics
    """
    try:
        from collections import Counter
        
        # Get all analyses with scam patterns
        cursor = db.analysis_reports.find(
            {},
            {
                "_id": 0,
                "scam_assessment.scam_patterns": 1,
                "scam_assessment.behavioral_flags": 1
            }
        )
        analyses = await cursor.to_list(length=None)
        
        # Count patterns
        all_patterns = []
        all_flags = []
        
        for analysis in analyses:
            patterns = analysis.get("scam_assessment", {}).get("scam_patterns", [])
            flags = analysis.get("scam_assessment", {}).get("behavioral_flags", [])
            
            all_patterns.extend(patterns)
            all_flags.extend(flags)
        
        # Get top patterns
        pattern_counter = Counter(all_patterns)
        flag_counter = Counter(all_flags)
        
        # Remove "No known scam patterns detected"
        if "No known scam patterns detected" in pattern_counter:
            del pattern_counter["No known scam patterns detected"]
        if "No behavioral manipulation detected" in flag_counter:
            del flag_counter["No behavioral manipulation detected"]
        
        top_patterns = [
            {"pattern": pattern, "count": count}
            for pattern, count in pattern_counter.most_common(limit)
        ]
        
        top_flags = [
            {"flag": flag, "count": count}
            for flag, count in flag_counter.most_common(limit)
        ]
        
        return {
            "total_unique_patterns": len(pattern_counter),
            "total_unique_flags": len(flag_counter),
            "top_patterns": top_patterns,
            "top_behavioral_flags": top_flags
        }
        
    except Exception as e:
        logger.error(f"Scam pattern analytics error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve scam pattern analytics: {str(e)}"
        )


@admin_router.get("/analytics/users")
async def get_user_analytics(
    user: Dict = Depends(require_role(UserRole.ADMIN)),
    db = Depends(get_db)
):
    """
    Get user analytics (Admin only)
    
    Returns:
    - User growth over time
    - Active users
    - User role distribution
    - Top users by activity
    """
    try:
        from datetime import timedelta, timezone
        
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)
        
        # Total users by role
        total_users = await db.users.count_documents({})
        free_users = await db.users.count_documents({"role": "free"})
        premium_users = await db.users.count_documents({"role": "premium"})
        enterprise_users = await db.users.count_documents({"role": "enterprise"})
        
        # Users created this week/month
        week_new_users = await db.users.count_documents({
            "created_at": {"$gte": week_start}
        })
        month_new_users = await db.users.count_documents({
            "created_at": {"$gte": month_start}
        })
        
        # Active users (logged in last 7 days)
        active_users = await db.users.count_documents({
            "last_login": {"$gte": week_start}
        })
        
        # Get user activity statistics
        users_with_activity = await db.users.find(
            {"api_calls_count": {"$gt": 0}},
            {"_id": 0, "email": 1, "full_name": 1, "api_calls_count": 1, "role": 1}
        ).sort("api_calls_count", -1).limit(10).to_list(length=10)
        
        return {
            "total_users": total_users,
            "role_distribution": {
                "free": free_users,
                "premium": premium_users,
                "enterprise": enterprise_users
            },
            "growth": {
                "new_this_week": week_new_users,
                "new_this_month": month_new_users
            },
            "engagement": {
                "active_users_7d": active_users,
                "active_rate": round(active_users / total_users * 100, 2) if total_users > 0 else 0
            },
            "top_users": users_with_activity
        }
        
    except Exception as e:
        logger.error(f"User analytics error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user analytics: {str(e)}"
        )


@admin_router.get("/analytics/performance")
async def get_performance_analytics(
    user: Dict = Depends(require_role(UserRole.ADMIN)),
    db = Depends(get_db)
):
    """
    Get system performance analytics (Admin only)
    
    Returns:
    - Cache performance
    - Database statistics
    - API usage patterns
    """
    try:
        from server import cache_manager
        from datetime import timedelta, timezone
        
        now = datetime.now(timezone.utc)
        hour_ago = now - timedelta(hours=1)
        day_ago = now - timedelta(days=1)
        
        # Cache statistics
        cache_stats = cache_manager.get_cache_stats()
        
        # Recent API activity
        recent_hour_analyses = await db.analysis_reports.count_documents({
            "timestamp": {"$gte": hour_ago.isoformat()}
        })
        recent_day_analyses = await db.analysis_reports.count_documents({
            "timestamp": {"$gte": day_ago.isoformat()}
        })
        
        # Database collection stats
        total_reports = await db.analysis_reports.count_documents({})
        total_audit_logs = await db.audit_logs.count_documents({})
        
        # Async job statistics (if available)
        pending_jobs = 0
        try:
            from server import celery_app
            inspect = celery_app.control.inspect()
            active = inspect.active()
            pending_jobs = sum(len(tasks) for tasks in (active or {}).values())
        except Exception:
            pass
        
        return {
            "cache": cache_stats,
            "api_activity": {
                "last_hour": recent_hour_analyses,
                "last_24h": recent_day_analyses,
                "avg_per_hour_24h": round(recent_day_analyses / 24, 2)
            },
            "database": {
                "total_reports": total_reports,
                "total_audit_logs": total_audit_logs
            },
            "async_jobs": {
                "pending": pending_jobs
            }
        }
        
    except Exception as e:
        logger.error(f"Performance analytics error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve performance analytics: {str(e)}"
        )
