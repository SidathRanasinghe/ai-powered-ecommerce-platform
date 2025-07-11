import logging
from typing import Dict
from pymongo import MongoClient
import redis

logger = logging.getLogger(__name__)

class HealthChecker:
    def __init__(self, mongo_client: MongoClient, redis_client: redis.Redis):
        self.mongo = mongo_client
        self.redis = redis_client

    async def check_mongo(self) -> Dict:
        try:
            # Simple ping command to check connection
            await self.mongo.admin.command('ping')
            return {"status": "healthy"}
        except Exception as e:
            logger.error(f"MongoDB health check failed: {str(e)}")
            return {"status": "unhealthy", "error": str(e)}

    async def check_redis(self) -> Dict:
        try:
            return {"status": "healthy" if self.redis.ping() else "unhealthy"}
        except Exception as e:
            logger.error(f"Redis health check failed: {str(e)}")
            return {"status": "unhealthy", "error": str(e)}

    async def full_health_check(self) -> Dict:
        mongo_status = await self.check_mongo()
        redis_status = await self.check_redis()
        
        return {
            "mongo": mongo_status,
            "redis": redis_status,
            "status": "healthy" if all(
                s["status"] == "healthy" for s in [mongo_status, redis_status]
            ) else "degraded"
        }