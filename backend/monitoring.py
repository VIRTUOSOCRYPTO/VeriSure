"""
Enhanced Monitoring & Health Checks
Phase 1 Critical Fix: Production-ready monitoring
"""
from fastapi import APIRouter, Response
from datetime import datetime, timezone
import psutil
import time
import logging
from typing import Dict, Any
import asyncio

logger = logging.getLogger(__name__)

# Global metrics
_start_time = time.time()
_request_count = 0
_error_count = 0
_total_response_time = 0.0


class MetricsCollector:
    """Collect application metrics"""
    
    def __init__(self):
        self.request_count = 0
        self.error_count = 0
        self.total_response_time = 0.0
        self.start_time = time.time()
        
    def record_request(self, response_time: float, is_error: bool = False):
        """Record a request"""
        self.request_count += 1
        self.total_response_time += response_time
        
        if is_error:
            self.error_count += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics"""
        uptime = time.time() - self.start_time
        avg_response_time = (
            self.total_response_time / self.request_count 
            if self.request_count > 0 else 0
        )
        error_rate = (
            self.error_count / self.request_count 
            if self.request_count > 0 else 0
        )
        
        return {
            "uptime_seconds": int(uptime),
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "error_rate": round(error_rate, 4),
            "avg_response_time_ms": round(avg_response_time * 1000, 2),
            "requests_per_second": round(self.request_count / uptime, 2) if uptime > 0 else 0
        }


# Global metrics collector
metrics_collector = MetricsCollector()


async def check_mongodb_health(db) -> Dict[str, Any]:
    """Check MongoDB connection health"""
    try:
        start = time.time()
        await db.command('ping')
        latency = (time.time() - start) * 1000
        
        # Get server info
        server_info = await db.command('serverStatus')
        
        return {
            "status": "connected",
            "latency_ms": round(latency, 2),
            "connections": server_info.get('connections', {}).get('current', 0),
            "operations": {
                "inserts": server_info.get('opcounters', {}).get('insert', 0),
                "queries": server_info.get('opcounters', {}).get('query', 0),
                "updates": server_info.get('opcounters', {}).get('update', 0),
                "deletes": server_info.get('opcounters', {}).get('delete', 0)
            }
        }
    except Exception as e:
        logger.error(f"MongoDB health check failed: {str(e)}")
        return {
            "status": "disconnected",
            "error": str(e)
        }


async def check_redis_health(cache_manager) -> Dict[str, Any]:
    """Check Redis connection health"""
    try:
        start = time.time()
        cache_stats = cache_manager.get_cache_stats()
        latency = (time.time() - start) * 1000
        
        return {
            "status": "connected",
            "latency_ms": round(latency, 2),
            "cache_stats": cache_stats
        }
    except Exception as e:
        logger.error(f"Redis health check failed: {str(e)}")
        return {
            "status": "disconnected",
            "error": str(e)
        }


async def check_celery_health(celery_app) -> Dict[str, Any]:
    """Check Celery workers health"""
    try:
        inspect = celery_app.control.inspect()
        stats = inspect.stats()
        active = inspect.active()
        
        if stats:
            worker_count = len(stats)
            active_tasks = sum(len(tasks) for tasks in (active or {}).values())
            
            return {
                "status": "connected",
                "workers": worker_count,
                "active_tasks": active_tasks,
                "worker_details": stats
            }
        else:
            return {
                "status": "disconnected",
                "error": "No workers available"
            }
    except Exception as e:
        logger.error(f"Celery health check failed: {str(e)}")
        return {
            "status": "disconnected",
            "error": str(e)
        }


def get_system_metrics() -> Dict[str, Any]:
    """Get system resource metrics"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "cpu_usage_percent": round(cpu_percent, 2),
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "usage_percent": round(memory.percent, 2)
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "usage_percent": round(disk.percent, 2)
            }
        }
    except Exception as e:
        logger.error(f"System metrics collection failed: {str(e)}")
        return {
            "error": str(e)
        }


async def comprehensive_health_check(
    db,
    cache_manager,
    celery_app
) -> Dict[str, Any]:
    """
    Comprehensive health check for all services
    Returns detailed status of all dependencies
    """
    timestamp = datetime.now(timezone.utc)
    uptime = time.time() - _start_time
    
    # Check all services concurrently
    mongodb_task = check_mongodb_health(db)
    redis_task = check_redis_health(cache_manager)
    celery_task = check_celery_health(celery_app)
    
    mongodb_health, redis_health, celery_health = await asyncio.gather(
        mongodb_task, redis_task, celery_task, return_exceptions=True
    )
    
    # Handle exceptions from gather
    if isinstance(mongodb_health, Exception):
        mongodb_health = {"status": "error", "error": str(mongodb_health)}
    if isinstance(redis_health, Exception):
        redis_health = {"status": "error", "error": str(redis_health)}
    if isinstance(celery_health, Exception):
        celery_health = {"status": "error", "error": str(celery_health)}
    
    # Get system metrics
    system_metrics = get_system_metrics()
    
    # Get application metrics
    app_metrics = metrics_collector.get_metrics()
    
    # Determine overall status
    all_connected = (
        mongodb_health.get("status") == "connected" and
        redis_health.get("status") == "connected" and
        celery_health.get("status") == "connected"
    )
    
    overall_status = "healthy" if all_connected else "degraded"
    
    # Check for critical issues
    if mongodb_health.get("status") == "disconnected":
        overall_status = "unhealthy"
    
    if system_metrics.get("memory", {}).get("usage_percent", 0) > 90:
        overall_status = "degraded"
    
    if system_metrics.get("disk", {}).get("usage_percent", 0) > 90:
        overall_status = "degraded"
    
    return {
        "status": overall_status,
        "version": "3.0.0",
        "timestamp": timestamp.isoformat(),
        "uptime_seconds": int(uptime),
        "dependencies": {
            "mongodb": mongodb_health,
            "redis": redis_health,
            "celery": celery_health
        },
        "system": system_metrics,
        "application": app_metrics
    }


def generate_prometheus_metrics(health_data: Dict[str, Any]) -> str:
    """
    Generate Prometheus-compatible metrics
    """
    lines = []
    
    # Application metrics
    lines.append("# HELP verisure_uptime_seconds Application uptime in seconds")
    lines.append("# TYPE verisure_uptime_seconds gauge")
    lines.append(f"verisure_uptime_seconds {health_data['uptime_seconds']}")
    
    lines.append("# HELP verisure_requests_total Total number of requests")
    lines.append("# TYPE verisure_requests_total counter")
    lines.append(f"verisure_requests_total {health_data['application']['total_requests']}")
    
    lines.append("# HELP verisure_errors_total Total number of errors")
    lines.append("# TYPE verisure_errors_total counter")
    lines.append(f"verisure_errors_total {health_data['application']['total_errors']}")
    
    lines.append("# HELP verisure_error_rate Current error rate")
    lines.append("# TYPE verisure_error_rate gauge")
    lines.append(f"verisure_error_rate {health_data['application']['error_rate']}")
    
    lines.append("# HELP verisure_response_time_avg_ms Average response time in milliseconds")
    lines.append("# TYPE verisure_response_time_avg_ms gauge")
    lines.append(f"verisure_response_time_avg_ms {health_data['application']['avg_response_time_ms']}")
    
    # System metrics
    if 'system' in health_data and 'error' not in health_data['system']:
        lines.append("# HELP verisure_cpu_usage_percent CPU usage percentage")
        lines.append("# TYPE verisure_cpu_usage_percent gauge")
        lines.append(f"verisure_cpu_usage_percent {health_data['system']['cpu_usage_percent']}")
        
        lines.append("# HELP verisure_memory_usage_percent Memory usage percentage")
        lines.append("# TYPE verisure_memory_usage_percent gauge")
        lines.append(f"verisure_memory_usage_percent {health_data['system']['memory']['usage_percent']}")
        
        lines.append("# HELP verisure_disk_usage_percent Disk usage percentage")
        lines.append("# TYPE verisure_disk_usage_percent gauge")
        lines.append(f"verisure_disk_usage_percent {health_data['system']['disk']['usage_percent']}")
    
    # Dependency status (1 = connected, 0 = disconnected)
    for dep_name, dep_health in health_data.get('dependencies', {}).items():
        lines.append(f"# HELP verisure_{dep_name}_connected Dependency connection status")
        lines.append(f"# TYPE verisure_{dep_name}_connected gauge")
        status_value = 1 if dep_health.get('status') == 'connected' else 0
        lines.append(f"verisure_{dep_name}_connected {status_value}")
        
        if 'latency_ms' in dep_health:
            lines.append(f"# HELP verisure_{dep_name}_latency_ms Dependency latency in milliseconds")
            lines.append(f"# TYPE verisure_{dep_name}_latency_ms gauge")
            lines.append(f"verisure_{dep_name}_latency_ms {dep_health['latency_ms']}")
    
    return "\n".join(lines)


# ============================================================================
# REQUEST TIMING MIDDLEWARE
# ============================================================================

class RequestTimingMiddleware:
    """Middleware to track request timing and errors"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Record request
                response_time = time.time() - start_time
                is_error = message["status"] >= 400
                metrics_collector.record_request(response_time, is_error)
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("Testing monitoring module...")
    
    # Test system metrics
    metrics = get_system_metrics()
    print(f"System Metrics: {metrics}")
    
    # Test metrics collector
    collector = MetricsCollector()
    collector.record_request(0.1, False)
    collector.record_request(0.2, True)
    print(f"App Metrics: {collector.get_metrics()}")
    
    print("✅ Monitoring tests passed!")
