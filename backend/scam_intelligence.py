"""
Phase 4: Scam Intelligence System
Handles public scam database, pattern learning, and threat intelligence
"""
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone, timedelta
from collections import Counter
import re

logger = logging.getLogger(__name__)


class ScamIntelligence:
    """
    Scam Intelligence System for pattern learning and threat aggregation
    """
    
    def __init__(self, db):
        self.db = db
        logger.info("✅ Scam Intelligence System initialized")
    
    async def report_scam(
        self,
        content: str,
        scam_type: str,
        reported_by: Optional[str] = None,
        source_type: str = "user_report",
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Report a new scam to the public database
        
        Args:
            content: Scam content/description
            scam_type: Type of scam (e.g., "phishing", "lottery", "police_threat")
            reported_by: User ID or anonymous
            source_type: "user_report", "analysis", "external_feed"
            metadata: Additional metadata (URLs, phone numbers, etc.)
        
        Returns:
            Scam report document
        """
        scam_id = f"scam_{datetime.now(timezone.utc).timestamp()}"
        
        scam_report = {
            "scam_id": scam_id,
            "content": content,
            "scam_type": scam_type,
            "reported_by": reported_by or "anonymous",
            "source_type": source_type,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc),
            "verified": False,
            "verified_by": None,
            "verified_at": None,
            "report_count": 1,
            "status": "pending",  # pending, verified, rejected, duplicate
            "severity": self._calculate_severity(scam_type, content),
            "extracted_patterns": self._extract_patterns(content),
            "geographic_tags": ["India"],  # Default to India for now
            "view_count": 0,
            "upvotes": 0,
            "downvotes": 0
        }
        
        # Check for duplicate
        existing = await self._find_similar_scam(content)
        if existing:
            # Increment report count for existing scam
            await self.db.scam_reports.update_one(
                {"scam_id": existing["scam_id"]},
                {
                    "$inc": {"report_count": 1},
                    "$set": {"last_reported": datetime.now(timezone.utc)}
                }
            )
            logger.info(f"📊 Duplicate scam found, incremented report count for {existing['scam_id']}")
            return existing
        
        # Insert new scam report
        await self.db.scam_reports.insert_one(scam_report)
        
        logger.info(f"🚨 New scam reported: {scam_id} (type: {scam_type}, severity: {scam_report['severity']})")
        
        return scam_report
    
    async def get_recent_scams(
        self,
        limit: int = 20,
        skip: int = 0,
        verified_only: bool = False,
        scam_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get recent scams from the database
        
        Args:
            limit: Number of scams to return
            skip: Number to skip (pagination)
            verified_only: Only return verified scams
            scam_type: Filter by scam type
        
        Returns:
            List of scam reports with pagination info
        """
        query = {}
        
        if verified_only:
            query["verified"] = True
        
        if scam_type:
            query["scam_type"] = scam_type
        
        # Get total count
        total = await self.db.scam_reports.count_documents(query)
        
        # Get scams
        cursor = self.db.scam_reports.find(query).sort("created_at", -1).skip(skip).limit(limit)
        scams = await cursor.to_list(length=limit)
        
        # Remove MongoDB _id field
        for scam in scams:
            scam.pop("_id", None)
            # Convert datetime to ISO string
            if isinstance(scam.get("created_at"), datetime):
                scam["created_at"] = scam["created_at"].isoformat()
            if isinstance(scam.get("verified_at"), datetime):
                scam["verified_at"] = scam["verified_at"].isoformat()
        
        return {
            "total": total,
            "limit": limit,
            "skip": skip,
            "scams": scams
        }
    
    async def search_scams(
        self,
        query: str,
        limit: int = 20,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        Search scams by keyword
        
        Args:
            query: Search query
            limit: Results limit
            skip: Pagination skip
        
        Returns:
            Matching scams
        """
        search_query = {
            "$or": [
                {"content": {"$regex": query, "$options": "i"}},
                {"scam_type": {"$regex": query, "$options": "i"}},
                {"extracted_patterns": {"$regex": query, "$options": "i"}}
            ]
        }
        
        total = await self.db.scam_reports.count_documents(search_query)
        
        cursor = self.db.scam_reports.find(search_query).sort("created_at", -1).skip(skip).limit(limit)
        scams = await cursor.to_list(length=limit)
        
        for scam in scams:
            scam.pop("_id", None)
            if isinstance(scam.get("created_at"), datetime):
                scam["created_at"] = scam["created_at"].isoformat()
            if isinstance(scam.get("verified_at"), datetime):
                scam["verified_at"] = scam["verified_at"].isoformat()
        
        return {
            "total": total,
            "query": query,
            "scams": scams
        }
    
    async def get_scam_stats(self) -> Dict[str, Any]:
        """
        Get scam statistics
        
        Returns:
            Statistics about scam reports
        """
        total_reports = await self.db.scam_reports.count_documents({})
        verified_reports = await self.db.scam_reports.count_documents({"verified": True})
        pending_reports = await self.db.scam_reports.count_documents({"status": "pending"})
        
        # Recent activity (last 7 days)
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        recent_reports = await self.db.scam_reports.count_documents({
            "created_at": {"$gte": seven_days_ago}
        })
        
        # Scam type breakdown
        pipeline = [
            {"$group": {"_id": "$scam_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        scam_types = await self.db.scam_reports.aggregate(pipeline).to_list(length=10)
        
        # Top patterns (most reported)
        top_scams_cursor = self.db.scam_reports.find(
            {"verified": True}
        ).sort("report_count", -1).limit(10)
        top_scams = await top_scams_cursor.to_list(length=10)
        
        for scam in top_scams:
            scam.pop("_id", None)
            if isinstance(scam.get("created_at"), datetime):
                scam["created_at"] = scam["created_at"].isoformat()
        
        return {
            "total_reports": total_reports,
            "verified_reports": verified_reports,
            "pending_reports": pending_reports,
            "recent_reports_7days": recent_reports,
            "scam_type_breakdown": [
                {"type": item["_id"], "count": item["count"]} 
                for item in scam_types
            ],
            "top_reported_scams": top_scams
        }
    
    async def verify_scam(
        self,
        scam_id: str,
        verified_by: str,
        status: str = "verified"
    ) -> bool:
        """
        Verify a scam report (admin only)
        
        Args:
            scam_id: Scam ID to verify
            verified_by: Admin user ID
            status: "verified" or "rejected"
        
        Returns:
            Success status
        """
        result = await self.db.scam_reports.update_one(
            {"scam_id": scam_id},
            {
                "$set": {
                    "verified": status == "verified",
                    "verified_by": verified_by,
                    "verified_at": datetime.now(timezone.utc),
                    "status": status
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"✅ Scam {scam_id} {status} by {verified_by}")
            return True
        
        return False
    
    async def extract_patterns_from_reports(
        self,
        min_occurrences: int = 3,
        confidence_threshold: float = 0.8
    ) -> List[Dict[str, Any]]:
        """
        Auto-learn patterns from multiple scam reports
        
        Args:
            min_occurrences: Minimum number of times a pattern must appear
            confidence_threshold: Minimum confidence score (0.0-1.0)
        
        Returns:
            List of learned patterns with confidence scores
        """
        # Get all verified scams
        cursor = self.db.scam_reports.find({"verified": True})
        scams = await cursor.to_list(length=1000)
        
        # Extract all patterns
        all_patterns = []
        for scam in scams:
            patterns = scam.get("extracted_patterns", [])
            all_patterns.extend(patterns)
        
        # Count pattern occurrences
        pattern_counts = Counter(all_patterns)
        
        # Calculate confidence scores
        learned_patterns = []
        total_scams = len(scams)
        
        for pattern, count in pattern_counts.items():
            if count >= min_occurrences:
                confidence = min(count / total_scams, 1.0)
                
                if confidence >= confidence_threshold:
                    learned_patterns.append({
                        "pattern": pattern,
                        "occurrences": count,
                        "confidence": round(confidence, 2),
                        "severity": self._estimate_pattern_severity(pattern, count)
                    })
        
        # Sort by confidence
        learned_patterns.sort(key=lambda x: x["confidence"], reverse=True)
        
        logger.info(f"🧠 Learned {len(learned_patterns)} patterns from {total_scams} scams")
        
        return learned_patterns
    
    async def get_trending_patterns(
        self,
        days: int = 7,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get trending scam patterns in recent days
        
        Args:
            days: Number of days to look back
            limit: Maximum patterns to return
        
        Returns:
            Trending patterns
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get recent scams
        cursor = self.db.scam_reports.find({
            "created_at": {"$gte": cutoff_date},
            "verified": True
        })
        recent_scams = await cursor.to_list(length=1000)
        
        # Extract patterns
        pattern_data = {}
        for scam in recent_scams:
            for pattern in scam.get("extracted_patterns", []):
                if pattern not in pattern_data:
                    pattern_data[pattern] = {
                        "pattern": pattern,
                        "count": 0,
                        "scam_type": scam.get("scam_type"),
                        "first_seen": scam.get("created_at"),
                        "last_seen": scam.get("created_at")
                    }
                
                pattern_data[pattern]["count"] += 1
                pattern_data[pattern]["last_seen"] = max(
                    pattern_data[pattern]["last_seen"],
                    scam.get("created_at")
                )
        
        # Sort by count
        trending = sorted(pattern_data.values(), key=lambda x: x["count"], reverse=True)[:limit]
        
        # Convert datetime to ISO
        for item in trending:
            if isinstance(item.get("first_seen"), datetime):
                item["first_seen"] = item["first_seen"].isoformat()
            if isinstance(item.get("last_seen"), datetime):
                item["last_seen"] = item["last_seen"].isoformat()
        
        return trending
    
    def _calculate_severity(self, scam_type: str, content: str) -> str:
        """Calculate severity based on scam type and content"""
        high_risk_types = ["phishing", "police_threat", "banking_fraud", "credential_harvesting"]
        critical_keywords = ["otp", "password", "cvv", "pin", "police", "arrest", "account blocked"]
        
        if scam_type in high_risk_types:
            return "high"
        
        content_lower = content.lower()
        for keyword in critical_keywords:
            if keyword in content_lower:
                return "high"
        
        return "medium"
    
    def _extract_patterns(self, content: str) -> List[str]:
        """Extract common scam patterns from content"""
        patterns = []
        content_lower = content.lower()
        
        # Pattern categories
        pattern_map = {
            "urgency": ["urgent", "immediate", "now", "today", "expires", "last chance"],
            "authority": ["police", "bank", "government", "officer", "court"],
            "threat": ["arrest", "block", "suspend", "fine", "penalty", "legal action"],
            "reward": ["lottery", "prize", "won", "winner", "reward", "congratulations"],
            "credential": ["otp", "password", "pin", "cvv", "verify", "confirm"],
            "payment": ["pay", "transfer", "deposit", "send money", "bank account"],
            "secrecy": ["don't tell", "secret", "confidential", "private"],
            "contact": ["call", "whatsapp", "message", "reply"]
        }
        
        for category, keywords in pattern_map.items():
            for keyword in keywords:
                if keyword in content_lower:
                    patterns.append(category)
                    break
        
        return list(set(patterns))
    
    async def _find_similar_scam(self, content: str) -> Optional[Dict]:
        """Find similar existing scam using fuzzy matching"""
        # Simple implementation: check for 80% keyword overlap
        keywords = set(content.lower().split())
        
        if len(keywords) < 5:
            return None
        
        # Get recent scams (last 30 days)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        cursor = self.db.scam_reports.find({
            "created_at": {"$gte": thirty_days_ago}
        }).limit(100)
        
        existing_scams = await cursor.to_list(length=100)
        
        for scam in existing_scams:
            scam_keywords = set(scam.get("content", "").lower().split())
            
            if len(scam_keywords) < 5:
                continue
            
            # Calculate Jaccard similarity
            intersection = len(keywords.intersection(scam_keywords))
            union = len(keywords.union(scam_keywords))
            similarity = intersection / union if union > 0 else 0
            
            if similarity > 0.7:  # 70% similar
                return scam
        
        return None
    
    def _estimate_pattern_severity(self, pattern: str, count: int) -> str:
        """Estimate pattern severity based on category and frequency"""
        high_severity_patterns = ["credential", "threat", "authority", "payment"]
        
        if pattern in high_severity_patterns:
            return "high"
        
        if count > 10:
            return "medium"
        
        return "low"
