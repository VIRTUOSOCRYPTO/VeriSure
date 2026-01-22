"""
Redis Cache Manager
Handles caching of analysis results to avoid duplicate processing
"""
import redis
import hashlib
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages Redis caching for content analysis"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379", ttl: int = 86400):
        """
        Initialize cache manager
        
        Args:
            redis_url: Redis connection URL
            ttl: Time to live for cache entries in seconds (default: 24 hours)
        """
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            self.ttl = ttl
            self.redis_client.ping()
            logger.info(f"✅ Redis cache connected successfully")
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {str(e)}")
            self.redis_client = None
    
    def get_cache_key(self, content_hash: str) -> str:
        """Generate cache key from content hash"""
        return f"analysis:{content_hash}"
    
    def get_cached_analysis(self, content_hash: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached analysis result"""
        if not self.redis_client:
            return None
        
        try:
            cache_key = self.get_cache_key(content_hash)
            cached_data = self.redis_client.get(cache_key)
            
            if cached_data:
                logger.info(f"✅ Cache HIT for content hash: {content_hash[:16]}...")
                return json.loads(cached_data)
            else:
                logger.info(f"❌ Cache MISS for content hash: {content_hash[:16]}...")
                return None
        except Exception as e:
            logger.error(f"Cache retrieval error: {str(e)}")
            return None
    
    def cache_analysis(self, content_hash: str, analysis_result: Dict[str, Any]) -> bool:
        """Cache analysis result"""
        if not self.redis_client:
            return False
        
        try:
            cache_key = self.get_cache_key(content_hash)
            self.redis_client.setex(
                cache_key,
                self.ttl,
                json.dumps(analysis_result)
            )
            logger.info(f"✅ Cached analysis for: {content_hash[:16]}... (TTL: {self.ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Cache storage error: {str(e)}")
            return False
    
    def invalidate_cache(self, content_hash: str) -> bool:
        """Invalidate cached analysis"""
        if not self.redis_client:
            return False
        
        try:
            cache_key = self.get_cache_key(content_hash)
            self.redis_client.delete(cache_key)
            logger.info(f"✅ Invalidated cache for: {content_hash[:16]}...")
            return True
        except Exception as e:
            logger.error(f"Cache invalidation error: {str(e)}")
            return False
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.redis_client:
            return {"status": "unavailable"}
        
        try:
            info = self.redis_client.info()
            keys_count = self.redis_client.dbsize()
            
            return {
                "status": "connected",
                "total_keys": keys_count,
                "used_memory": info.get("used_memory_human", "N/A"),
                "total_connections": info.get("total_connections_received", 0),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(info)
            }
        except Exception as e:
            logger.error(f"Cache stats error: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    def _calculate_hit_rate(self, info: Dict) -> float:
        """Calculate cache hit rate"""
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses
        
        if total == 0:
            return 0.0
        
        return round((hits / total) * 100, 2)
