"""
Threat Intelligence Module
Integrates with external threat databases and APIs
"""
import logging
import aiohttp
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ThreatIntelligence:
    """
    Threat Intelligence aggregator for external threat feeds
    """
    
    def __init__(self, db):
        self.db = db
        self.google_safe_browsing_key = None  # Will be set from env
        self.virustotal_key = None  # Will be set from env
        logger.info("✅ Threat Intelligence module initialized")
    
    async def check_url_reputation(self, url: str) -> Dict[str, Any]:
        """
        Check URL reputation across multiple threat intelligence sources
        
        Args:
            url: URL to check
        
        Returns:
            Aggregated threat intelligence report
        """
        results = {
            "url": url,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "is_malicious": False,
            "threat_level": "safe",
            "sources": []
        }
        
        # Check Google Safe Browsing
        gsb_result = await self._check_google_safe_browsing(url)
        if gsb_result:
            results["sources"].append(gsb_result)
            if gsb_result.get("is_malicious"):
                results["is_malicious"] = True
                results["threat_level"] = "high"
        
        # Check VirusTotal
        vt_result = await self._check_virustotal(url)
        if vt_result:
            results["sources"].append(vt_result)
            if vt_result.get("is_malicious"):
                results["is_malicious"] = True
                if results["threat_level"] == "safe":
                    results["threat_level"] = "medium"
        
        # Check PhishTank
        pt_result = await self._check_phishtank(url)
        if pt_result:
            results["sources"].append(pt_result)
            if pt_result.get("is_malicious"):
                results["is_malicious"] = True
                results["threat_level"] = "high"
        
        # Check local database
        local_result = await self._check_local_database(url)
        if local_result:
            results["sources"].append(local_result)
            if local_result.get("is_malicious"):
                results["is_malicious"] = True
        
        # Store result in cache
        await self._cache_url_check(url, results)
        
        return results
    
    async def check_file_hash(self, file_hash: str) -> Dict[str, Any]:
        """
        Check file hash reputation
        
        Args:
            file_hash: SHA-256 hash of file
        
        Returns:
            Threat intelligence report
        """
        results = {
            "file_hash": file_hash,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "is_malicious": False,
            "threat_level": "safe",
            "sources": []
        }
        
        # Check VirusTotal
        vt_result = await self._check_virustotal_hash(file_hash)
        if vt_result:
            results["sources"].append(vt_result)
            if vt_result.get("is_malicious"):
                results["is_malicious"] = True
                results["threat_level"] = "high"
        
        return results
    
    async def get_threat_feeds(self) -> List[Dict[str, Any]]:
        """
        Get latest threat feeds from various sources
        
        Returns:
            List of recent threats
        """
        threats = []
        
        # Get from PhishTank recent submissions
        pt_threats = await self._get_phishtank_recent()
        threats.extend(pt_threats)
        
        # Get from local database (recent verified scams)
        local_threats = await self._get_local_threats()
        threats.extend(local_threats)
        
        return threats[:50]  # Return top 50
    
    async def _check_google_safe_browsing(self, url: str) -> Optional[Dict]:
        """
        Check URL against Google Safe Browsing API
        Note: Requires API key setup
        """
        if not self.google_safe_browsing_key:
            logger.debug("Google Safe Browsing API key not configured")
            return None
        
        try:
            api_url = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={self.google_safe_browsing_key}"
            
            payload = {
                "client": {
                    "clientId": "verisure",
                    "clientVersion": "1.0.0"
                },
                "threatInfo": {
                    "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                    "platformTypes": ["ANY_PLATFORM"],
                    "threatEntryTypes": ["URL"],
                    "threatEntries": [{"url": url}]
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(api_url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        is_malicious = "matches" in data and len(data["matches"]) > 0
                        
                        return {
                            "source": "Google Safe Browsing",
                            "is_malicious": is_malicious,
                            "details": data.get("matches", []),
                            "checked_at": datetime.now(timezone.utc).isoformat()
                        }
        except Exception as e:
            logger.warning(f"Google Safe Browsing check failed: {str(e)}")
        
        return None
    
    async def _check_virustotal(self, url: str) -> Optional[Dict]:
        """
        Check URL against VirusTotal API
        Note: Requires API key setup
        """
        if not self.virustotal_key:
            logger.debug("VirusTotal API key not configured")
            return None
        
        try:
            # URL encode the URL
            url_id = hashlib.sha256(url.encode()).hexdigest()
            
            api_url = f"https://www.virustotal.com/api/v3/urls/{url_id}"
            headers = {"x-apikey": self.virustotal_key}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                        malicious_count = stats.get("malicious", 0)
                        
                        is_malicious = malicious_count > 0
                        
                        return {
                            "source": "VirusTotal",
                            "is_malicious": is_malicious,
                            "malicious_count": malicious_count,
                            "total_scans": sum(stats.values()),
                            "details": stats,
                            "checked_at": datetime.now(timezone.utc).isoformat()
                        }
        except Exception as e:
            logger.warning(f"VirusTotal check failed: {str(e)}")
        
        return None
    
    async def _check_virustotal_hash(self, file_hash: str) -> Optional[Dict]:
        """Check file hash against VirusTotal"""
        if not self.virustotal_key:
            return None
        
        try:
            api_url = f"https://www.virustotal.com/api/v3/files/{file_hash}"
            headers = {"x-apikey": self.virustotal_key}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                        malicious_count = stats.get("malicious", 0)
                        
                        return {
                            "source": "VirusTotal",
                            "is_malicious": malicious_count > 0,
                            "malicious_count": malicious_count,
                            "total_scans": sum(stats.values()),
                            "details": stats
                        }
        except Exception as e:
            logger.warning(f"VirusTotal hash check failed: {str(e)}")
        
        return None
    
    async def _check_phishtank(self, url: str) -> Optional[Dict]:
        """
        Check URL against PhishTank database
        PhishTank provides a free API for phishing URL detection
        """
        try:
            # PhishTank free API (no key required for basic lookups)
            api_url = "https://checkurl.phishtank.com/checkurl/"
            
            payload = {
                "url": url,
                "format": "json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(api_url, data=payload, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        is_phishing = data.get("results", {}).get("in_database", False)
                        
                        return {
                            "source": "PhishTank",
                            "is_malicious": is_phishing,
                            "details": data.get("results", {}),
                            "checked_at": datetime.now(timezone.utc).isoformat()
                        }
        except Exception as e:
            logger.warning(f"PhishTank check failed: {str(e)}")
        
        return None
    
    async def _check_local_database(self, url: str) -> Optional[Dict]:
        """Check URL against local scam database"""
        try:
            # Search in scam reports
            result = await self.db.scam_reports.find_one({
                "metadata.urls": {"$in": [url]},
                "verified": True
            })
            
            if result:
                return {
                    "source": "VeriSure Database",
                    "is_malicious": True,
                    "scam_type": result.get("scam_type"),
                    "report_count": result.get("report_count", 1),
                    "severity": result.get("severity"),
                    "checked_at": datetime.now(timezone.utc).isoformat()
                }
        except Exception as e:
            logger.warning(f"Local database check failed: {str(e)}")
        
        return None
    
    async def _cache_url_check(self, url: str, results: Dict):
        """Cache URL check results"""
        try:
            await self.db.url_checks.update_one(
                {"url": url},
                {
                    "$set": {
                        "url": url,
                        "results": results,
                        "checked_at": datetime.now(timezone.utc),
                        "expires_at": datetime.now(timezone.utc).timestamp() + 86400  # 24 hours
                    }
                },
                upsert=True
            )
        except Exception as e:
            logger.warning(f"Failed to cache URL check: {str(e)}")
    
    async def _get_phishtank_recent(self) -> List[Dict]:
        """Get recent PhishTank submissions"""
        # This would require PhishTank data feed subscription
        # For now, return empty list
        return []
    
    async def _get_local_threats(self) -> List[Dict]:
        """Get recent verified threats from local database"""
        try:
            cursor = self.db.scam_reports.find({
                "verified": True,
                "severity": {"$in": ["high", "critical"]}
            }).sort("created_at", -1).limit(20)
            
            threats = await cursor.to_list(length=20)
            
            result = []
            for threat in threats:
                result.append({
                    "source": "VeriSure Community",
                    "scam_id": threat.get("scam_id"),
                    "scam_type": threat.get("scam_type"),
                    "severity": threat.get("severity"),
                    "content": threat.get("content", "")[:200],  # First 200 chars
                    "report_count": threat.get("report_count", 1),
                    "created_at": threat.get("created_at").isoformat() if isinstance(threat.get("created_at"), datetime) else threat.get("created_at")
                })
            
            return result
        except Exception as e:
            logger.warning(f"Failed to get local threats: {str(e)}")
            return []
