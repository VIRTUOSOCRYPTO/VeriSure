"""
Comprehensive Audit Logging System
Tracks all user actions and security events for compliance
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import Request

logger = logging.getLogger(__name__)


class AuditLogger:
    """Audit logging manager"""
    
    def __init__(self, db):
        self.db = db
        logger.info("✅ Audit logging system initialized")
    
    async def log_action(
        self,
        action: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        resource: Optional[str] = None,
        status: str = "success",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Log a user action to audit trail
        
        Args:
            action: Action performed (login, analysis, export, etc.)
            user_id: User ID if authenticated
            user_email: User email if authenticated
            resource: Resource accessed (API endpoint, report ID, etc.)
            status: Action status (success, failure)
            ip_address: Client IP address
            user_agent: Client user agent
            details: Additional details about the action
        """
        try:
            log_entry = {
                "log_id": str(uuid.uuid4()),
                "timestamp": datetime.now(timezone.utc),
                "user_id": user_id,
                "user_email": user_email,
                "action": action,
                "resource": resource,
                "status": status,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "details": details or {}
            }
            
            await self.db.audit_logs.insert_one(log_entry)
            
            # Log critical security events to application logs
            if status == "failure" or action in ["login_failed", "unauthorized_access"]:
                logger.warning(
                    f"⚠️ Security Event: {action} - User: {user_email or 'anonymous'} - "
                    f"IP: {ip_address} - Status: {status}"
                )
            
        except Exception as e:
            logger.error(f"Failed to write audit log: {str(e)}")
    
    async def log_request(
        self,
        request: Request,
        action: str,
        user: Optional[Dict] = None,
        status: str = "success",
        details: Optional[Dict] = None
    ):
        """
        Log an HTTP request to audit trail
        
        Args:
            request: FastAPI request object
            action: Action being performed
            user: User dict if authenticated
            status: Action status
            details: Additional details
        """
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        await self.log_action(
            action=action,
            user_id=user.get("user_id") if user else None,
            user_email=user.get("email") if user else None,
            resource=str(request.url.path),
            status=status,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details
        )
    
    async def get_user_audit_trail(
        self,
        user_id: str,
        limit: int = 100,
        skip: int = 0
    ) -> list:
        """
        Get audit trail for a specific user
        
        Args:
            user_id: User ID
            limit: Max records to return
            skip: Records to skip (pagination)
            
        Returns:
            List of audit log entries
        """
        cursor = self.db.audit_logs.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).skip(skip).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def get_security_events(
        self,
        hours: int = 24,
        event_types: Optional[list] = None
    ) -> list:
        """
        Get recent security events
        
        Args:
            hours: Time range in hours
            event_types: Filter by event types (login_failed, unauthorized_access, etc.)
            
        Returns:
            List of security events
        """
        from datetime import timedelta
        
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        query = {
            "timestamp": {"$gte": cutoff_time}
        }
        
        if event_types:
            query["action"] = {"$in": event_types}
        else:
            # Default security events
            query["action"] = {"$in": [
                "login_failed",
                "unauthorized_access",
                "token_revoked",
                "account_locked"
            ]}
        
        cursor = self.db.audit_logs.find(query).sort("timestamp", -1).limit(100)
        return await cursor.to_list(length=100)
    
    async def get_audit_statistics(self) -> Dict[str, Any]:
        """
        Get audit trail statistics
        
        Returns:
            Statistics about audit logs
        """
        from datetime import timedelta
        
        now = datetime.now(timezone.utc)
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        
        # Total logs
        total_logs = await self.db.audit_logs.count_documents({})
        
        # Logs in last 24 hours
        logs_24h = await self.db.audit_logs.count_documents({
            "timestamp": {"$gte": day_ago}
        })
        
        # Logs in last 7 days
        logs_7d = await self.db.audit_logs.count_documents({
            "timestamp": {"$gte": week_ago}
        })
        
        # Failed actions in last 24 hours
        failed_24h = await self.db.audit_logs.count_documents({
            "timestamp": {"$gte": day_ago},
            "status": "failure"
        })
        
        # Most common actions
        pipeline = [
            {"$match": {"timestamp": {"$gte": week_ago}}},
            {"$group": {"_id": "$action", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        top_actions = await self.db.audit_logs.aggregate(pipeline).to_list(length=10)
        
        return {
            "total_logs": total_logs,
            "logs_24h": logs_24h,
            "logs_7d": logs_7d,
            "failed_actions_24h": failed_24h,
            "top_actions": [{"action": item["_id"], "count": item["count"]} for item in top_actions]
        }
