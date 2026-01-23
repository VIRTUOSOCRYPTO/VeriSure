"""
Pydantic Models for Authentication & Security
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User roles for RBAC"""
    FREE = "free"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"
    ADMIN = "admin"


class UserRegistration(BaseModel):
    """User registration request"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    organization: Optional[str] = None
    
    
class UserLogin(BaseModel):
    """User login request"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshTokenRequest(BaseModel):
    """Token refresh request"""
    refresh_token: str


class UserProfile(BaseModel):
    """User profile response"""
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    email: str
    full_name: str
    role: UserRole
    organization: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    api_calls_count: int = 0
    api_calls_limit: int


class UserUpdate(BaseModel):
    """User profile update request"""
    full_name: Optional[str] = None
    organization: Optional[str] = None


class PasswordChange(BaseModel):
    """Password change request"""
    current_password: str
    new_password: str = Field(..., min_length=8)


class AuditLogEntry(BaseModel):
    """Audit log entry"""
    model_config = ConfigDict(extra="ignore")
    
    log_id: str
    timestamp: datetime
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str  # "login", "logout", "analysis", "export", etc.
    resource: Optional[str] = None  # API endpoint or resource accessed
    status: str  # "success", "failure"
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[dict] = None


class ConsentRecord(BaseModel):
    """User consent tracking"""
    user_id: str
    consent_type: str  # "data_collection", "analytics", "marketing"
    consent_given: bool
    timestamp: datetime
    ip_address: Optional[str] = None


class DataExportRequest(BaseModel):
    """GDPR data export request"""
    email: EmailStr
    include_analyses: bool = True
    include_audit_logs: bool = False
