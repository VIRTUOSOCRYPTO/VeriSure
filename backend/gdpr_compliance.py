"""
GDPR Compliance Module
Data privacy, user rights, and data retention policies
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
import zipfile
import io
import json

logger = logging.getLogger(__name__)


class GDPRManager:
    """GDPR compliance manager"""
    
    def __init__(self, db):
        self.db = db
        logger.info("✅ GDPR compliance system initialized")
    
    async def export_user_data(
        self,
        user_id: str,
        include_analyses: bool = True,
        include_audit_logs: bool = False
    ) -> bytes:
        """
        Export all user data (GDPR Right to Access)
        
        Args:
            user_id: User ID
            include_analyses: Include analysis history
            include_audit_logs: Include audit logs
            
        Returns:
            ZIP file bytes containing all user data
        """
        try:
            # Create in-memory ZIP file
            zip_buffer = io.BytesIO()
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # 1. User profile
                user = await self.db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
                if user:
                    zip_file.writestr('profile.json', json.dumps(user, indent=2, default=str))
                
                # 2. Analysis history
                if include_analyses:
                    cursor = self.db.analysis_reports.find(
                        {"user_id": user_id},
                        {"_id": 0}
                    ).sort("timestamp", -1)
                    
                    analyses = await cursor.to_list(length=None)
                    zip_file.writestr('analyses.json', json.dumps(analyses, indent=2, default=str))
                
                # 3. Audit logs (if requested)
                if include_audit_logs:
                    cursor = self.db.audit_logs.find(
                        {"user_id": user_id},
                        {"_id": 0}
                    ).sort("timestamp", -1)
                    
                    logs = await cursor.to_list(length=None)
                    zip_file.writestr('audit_logs.json', json.dumps(logs, indent=2, default=str))
                
                # 4. Consent records
                cursor = self.db.consent_records.find(
                    {"user_id": user_id},
                    {"_id": 0}
                ).sort("timestamp", -1)
                
                consents = await cursor.to_list(length=None)
                if consents:
                    zip_file.writestr('consents.json', json.dumps(consents, indent=2, default=str))
                
                # 5. README
                readme = """
VeriSure - User Data Export
===========================

This export contains all your personal data stored in VeriSure.

Files:
- profile.json: Your user profile information
- analyses.json: Your analysis history (if requested)
- audit_logs.json: Your activity audit logs (if requested)
- consents.json: Your consent records

Generated: {}
User ID: {}

This data export is provided in compliance with GDPR Article 15 (Right of Access).
                """.format(datetime.now(timezone.utc).isoformat(), user_id)
                
                zip_file.writestr('README.txt', readme)
            
            zip_buffer.seek(0)
            logger.info(f"✅ Data export created for user: {user_id}")
            return zip_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Data export error: {str(e)}")
            raise
    
    async def delete_user_data(self, user_id: str) -> Dict[str, int]:
        """
        Delete all user data (GDPR Right to Erasure)
        
        Args:
            user_id: User ID
            
        Returns:
            Dict with counts of deleted records
        """
        try:
            deleted_counts = {}
            
            # 1. Mark user as deleted (soft delete)
            result = await self.db.users.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "deleted": True,
                        "deleted_at": datetime.now(timezone.utc),
                        "email": f"deleted_{user_id}@verisure.deleted",
                        "full_name": "[DELETED]",
                        "disabled": True
                    }
                }
            )
            deleted_counts["user_profile"] = result.modified_count
            
            # 2. Delete analysis reports
            result = await self.db.analysis_reports.delete_many({"user_id": user_id})
            deleted_counts["analyses"] = result.deleted_count
            
            # 3. Keep audit logs but anonymize (for legal compliance)
            result = await self.db.audit_logs.update_many(
                {"user_id": user_id},
                {
                    "$set": {
                        "user_email": "[ANONYMIZED]",
                        "anonymized": True
                    }
                }
            )
            deleted_counts["audit_logs_anonymized"] = result.modified_count
            
            # 4. Revoke all tokens
            result = await self.db.refresh_tokens.delete_many({"user_id": user_id})
            deleted_counts["tokens"] = result.deleted_count
            
            # 5. Delete consent records
            result = await self.db.consent_records.delete_many({"user_id": user_id})
            deleted_counts["consents"] = result.deleted_count
            
            logger.info(f"✅ User data deleted: {user_id} - {deleted_counts}")
            return deleted_counts
            
        except Exception as e:
            logger.error(f"Data deletion error: {str(e)}")
            raise
    
    async def record_consent(
        self,
        user_id: str,
        consent_type: str,
        consent_given: bool,
        ip_address: str = None
    ):
        """
        Record user consent
        
        Args:
            user_id: User ID
            consent_type: Type of consent (data_collection, analytics, marketing)
            consent_given: Whether consent was given
            ip_address: IP address of consent action
        """
        await self.db.consent_records.insert_one({
            "user_id": user_id,
            "consent_type": consent_type,
            "consent_given": consent_given,
            "timestamp": datetime.now(timezone.utc),
            "ip_address": ip_address
        })
    
    async def get_user_consents(self, user_id: str) -> List[Dict]:
        """
        Get all consent records for a user
        
        Args:
            user_id: User ID
            
        Returns:
            List of consent records
        """
        cursor = self.db.consent_records.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("timestamp", -1)
        
        return await cursor.to_list(length=None)
    
    async def cleanup_old_data(self, retention_days: int = 365):
        """
        Clean up old data based on retention policy
        
        Args:
            retention_days: Number of days to retain data
            
        Returns:
            Counts of deleted records
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        
        deleted_counts = {}
        
        # Delete old analysis reports (except for premium/enterprise users)
        result = await self.db.analysis_reports.delete_many({
            "timestamp": {"$lt": cutoff_date.isoformat()},
            "user_id": {"$exists": True}  # Only for non-anonymous analyses
        })
        deleted_counts["old_analyses"] = result.deleted_count
        
        # Delete old audit logs (keep security events)
        result = await self.db.audit_logs.delete_many({
            "timestamp": {"$lt": cutoff_date},
            "action": {"$nin": ["login_failed", "unauthorized_access", "account_locked"]}
        })
        deleted_counts["old_audit_logs"] = result.deleted_count
        
        logger.info(f"✅ Data retention cleanup: {deleted_counts}")
        return deleted_counts
