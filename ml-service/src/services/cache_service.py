import redis.asyncio as redis
import json
import pickle
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
import hashlib
from ..config.settings import Settings

logger = logging.getLogger(__name__)

class CacheService:
    """Redis-based caching service for ML recommendations"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis_client = None
        
        # Cache TTL settings (in seconds)
        self.CACHE_TTL = {
            'user_recommendations': 3600,  # 1 hour
            'product_similarities': 86400,  # 24 hours
            'trending_products': 1800,      # 30 minutes
            'popular_products': 7200,       # 2 hours
            'user_data': 3600,              # 1 hour
            'product_data': 7200,           # 2 hours
            'category_data': 14400,         # 4 hours
            'model_features': 86400,        # 24 hours
            'search_results': 1800,         # 30 minutes
        }
        
        # Cache key prefixes
        self.KEY_PREFIXES = {
            'user_rec': 'ml:user_rec:',
            'product_sim': 'ml:product_sim:',
            'trending': 'ml:trending:',
            'popular': 'ml:popular:',
            'user_data': 'ml:user_data:',
            'product_data': 'ml:product_data:',
            'category_data': 'ml:category_data:',
            'model_features': 'ml:model_features:',
            'search': 'ml:search:',
            'analytics': 'ml:analytics:'
        }
    
    async def connect(self):
        """Connect to Redis"""
        try:
            self.redis_client = redis.Redis(
                host=self.settings.REDIS_HOST,
                port=self.settings.REDIS_PORT,
                password=self.settings.REDIS_PASSWORD,
                db=self.settings.REDIS_DB_ML,
                decode_responses=False,  # We'll handle encoding ourselves
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30
            )
            
            # Test connection
            await self.redis_client.ping()
            logger.info("Connected to Redis successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Disconnected from Redis")
    
    def _generate_cache_key(self, prefix: str, *args: str) -> str:
        """Generate cache key with prefix and arguments"""
        key_parts = [prefix] + list(args)
        return ':'.join(key_parts)
    
    def _hash_key(self, key: str) -> str:
        """Generate hash for complex keys"""
        return hashlib.md5(key.encode()).hexdigest()
    
    async def _serialize_data(self, data: Any) -> bytes:
        """Serialize data for Redis storage"""
        try:
            # Try JSON first for simple data types
            if isinstance(data, (dict, list, str, int, float, bool)) or data is None:
                return json.dumps(data).encode('utf-8')
            else:
                # Use pickle for complex objects
                return pickle.dumps(data)
        except Exception as e:
            logger.error(f"Failed to serialize data: {str(e)}")
            raise
    
    async def _deserialize_data(self, data: bytes) -> Any:
        """Deserialize data from Redis"""
        try:
            # Try JSON first
            try:
                return json.loads(data.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                # Fall back to pickle
                return pickle.loads(data)
        except Exception as e:
            logger.error(f"Failed to deserialize data: {str(e)}")
            raise
    
    async def set_cache(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None,
        prefix: Optional[str] = None
    ) -> bool:
        """Set cache value"""
        try:
            if prefix:
                key = self._generate_cache_key(prefix, key)
            
            serialized_data = await self._serialize_data(value)
            
            if ttl:
                await self.redis_client.setex(key, ttl, serialized_data)
            else:
                await self.redis_client.set(key, serialized_data)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to set cache for key {key}: {str(e)}")
            return False
    
    async def get_cache(self, key: str, prefix: Optional[str] = None) -> Optional[Any]:
        """Get cache value"""
        try:
            if prefix:
                key = self._generate_cache_key(prefix, key)
            
            data = await self.redis_client.get(key)
            if data is None:
                return None
            
            return await self._deserialize_data(data)
            
        except Exception as e:
            logger.error(f"Failed to get cache for key {key}: {str(e)}")
            return None
    
    async def delete_cache(self, key: str, prefix: Optional[str] = None) -> bool:
        """Delete cache value"""
        try:
            if prefix:
                key = self._generate_cache_key(prefix, key)
            
            await self.redis_client.delete(key)
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete cache for key {key}: {str(e)}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            keys = await self.redis_client.keys(pattern)
            if keys:
                return await self.redis_client.delete(*keys)
            return 0
            
        except Exception as e:
            logger.error(f"Failed to delete pattern {pattern}: {str(e)}")
            return 0
    
    # User Recommendations Cache
    async def cache_user_recommendations(
        self, 
        user_id: str, 
        recommendations: List[Dict], 
        algorithm: str = "hybrid"
    ) -> bool:
        """Cache user recommendations"""
        key = f"{user_id}:{algorithm}"
        return await self.set_cache(
            key, 
            recommendations, 
            ttl=self.CACHE_TTL['user_recommendations'],
            prefix=self.KEY_PREFIXES['user_rec']
        )
    
    async def get_user_recommendations(
        self, 
        user_id: str, 
        algorithm: str = "hybrid"
    ) -> Optional[List[Dict]]:
        """Get cached user recommendations"""
        key = f"{user_id}:{algorithm}"
        return await self.get_cache(key, prefix=self.KEY_PREFIXES['user_rec'])
    
    async def invalidate_user_recommendations(self, user_id: str) -> bool:
        """Invalidate all user recommendations"""
        pattern = f"{self.KEY_PREFIXES['user_rec']}{user_id}:*"
        deleted_count = await self.delete_pattern(pattern)
        return deleted_count > 0
    
    # Product Similarities Cache
    async def cache_product_similarities(
        self, 
        product_id: str, 
        similarities: List[Dict]
    ) -> bool:
        """Cache product similarities"""
        return await self.set_cache(
            product_id, 
            similarities, 
            ttl=self.CACHE_TTL['product_similarities'],
            prefix=self.KEY_PREFIXES['product_sim']
        )
    
    async def get_product_similarities(self, product_id: str) -> Optional[List[Dict]]:
        """Get cached product similarities"""
        return await self.get_cache(product_id, prefix=self.KEY_PREFIXES['product_sim'])
    
    async def invalidate_product_recommendations(self, product_id: str) -> bool:
        """Invalidate product similarity cache"""
        return await self.delete_cache(product_id, prefix=self.KEY_PREFIXES['product_sim'])
    
    # Trending Products Cache
    async def cache_trending_products(
        self, 
        category: Optional[str], 
        time_period: str, 
        products: List[Dict]
    ) -> bool:
        """Cache trending products"""
        key = f"{category or 'all'}:{time_period}"
        return await self.set_cache(
            key, 
            products, 
            ttl=self.CACHE_TTL['trending_products'],
            prefix=self.KEY_PREFIXES['trending']
        )
    
    async def get_trending_products(
        self, 
        category: Optional[str], 
        time_period: str
    ) -> Optional[List[Dict]]:
        """Get cached trending products"""
        key = f"{category or 'all'}:{time_period}"
        return await self.get_cache(key, prefix=self.KEY_PREFIXES['trending'])
    
    async def update_trending_data(self, product_id: str, interaction_type: str) -> bool:
        """Update trending data for a product"""
        try:
            # Use Redis sorted sets for trending calculations
            current_time = datetime.now()
            score = current_time.timestamp()
            
            # Different weights for different interactions
            weights = {
                'view': 1,
                'click': 2,
                'add_to_cart': 3,
                'purchase': 5
            }
            
            weight = weights.get(interaction_type, 1)
            
            # Add to trending sets with different time periods
            trending_keys = [
                f"{self.KEY_PREFIXES['analytics']}trending:hour",
                f"{self.KEY_PREFIXES['analytics']}trending:day",
                f"{self.KEY_PREFIXES['analytics']}trending:week"
            ]
            
            for key in trending_keys:
                await self.redis_client.zincrby(key, weight, product_id)
            
            # Set expiration for trending keys
            await self.redis_client.expire(f"{self.KEY_PREFIXES['analytics']}trending:hour", 3600)
            await self.redis_client.expire(f"{self.KEY_PREFIXES['analytics']}trending:day", 86400)
            await self.redis_client.expire(f"{self.KEY_PREFIXES['analytics']}trending:week", 604800)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update trending data: {str(e)}")
            return False
    
    # Popular Products Cache
    async def cache_popular_products(
        self, 
        category: Optional[str], 
        products: List[Dict]
    ) -> bool:
        """Cache popular products"""
        key = category or 'all'
        return await self.set_cache(
            key, 
            products, 
            ttl=self.CACHE_TTL['popular_products'],
            prefix=self.KEY_PREFIXES['popular']
        )
    
    async def get_popular_products(self, category: Optional[str]) -> Optional[List[Dict]]:
        """Get cached popular products"""
        key = category or 'all'
        return await self.get_cache(key, prefix=self.KEY_PREFIXES['popular'])
    
    # User Data Cache
    async def cache_user_data(self, user_id: str, user_data: Dict) -> bool:
        """Cache user data"""
        return await self.set_cache(
            user_id, 
            user_data, 
            ttl=self.CACHE_TTL['user_data'],
            prefix=self.KEY_PREFIXES['user_data']
        )
    
    async def get_user_data(self, user_id: str) -> Optional[Dict]:
        """Get cached user data"""
        return await self.get_cache(user_id, prefix=self.KEY_PREFIXES['user_data'])
    
    async def invalidate_user_cache(self, user_id: str) -> bool:
        """Invalidate user data cache"""
        return await self.delete_cache(user_id, prefix=self.KEY_PREFIXES['user_data'])
    
    async def remove_user_data(self, user_id: str) -> bool:
        """Remove all user-related data from cache"""
        patterns = [
            f"{self.KEY_PREFIXES['user_rec']}{user_id}:*",
            f"{self.KEY_PREFIXES['user_data']}{user_id}",
        ]
        
        total_deleted = 0
        for pattern in patterns:
            deleted = await self.delete_pattern(pattern)
            total_deleted += deleted
        
        return total_deleted > 0
    
    # Product Data Cache
    async def cache_product_data(self, product_id: str, product_data: Dict) -> bool:
        """Cache product data"""
        return await self.set_cache(
            product_id, 
            product_data, 
            ttl=self.CACHE_TTL['product_data'],
            prefix=self.KEY_PREFIXES['product_data']
        )
    
    async def get_product_data(self, product_id: str) -> Optional[Dict]:
        """Get cached product data"""
        return await self.get_cache(product_id, prefix=self.KEY_PREFIXES['product_data'])
    
    async def invalidate_product_cache(self, product_id: str) -> bool:
        """Invalidate product data cache"""
        return await self.delete_cache(product_id, prefix=self.KEY_PREFIXES['product_data'])
    
    async def remove_product_data(self, product_id: str) -> bool:
        """Remove all product-related data from cache"""
        patterns = [
            f"{self.KEY_PREFIXES['product_sim']}{product_id}",
            f"{self.KEY_PREFIXES['product_data']}{product_id}",
        ]
        
        total_deleted = 0
        for pattern in patterns:
            deleted = await self.delete_pattern(pattern)
            total_deleted += deleted
        
        return total_deleted > 0
    
    async def update_product_availability(self, product_id: str, stock_level: int) -> bool:
        """Update product availability in cache"""
        try:
            # Update availability in a separate hash
            availability_key = f"{self.KEY_PREFIXES['product_data']}availability"
            await self.redis_client.hset(availability_key, product_id, stock_level)
            
            # Set expiration
            await self.redis_client.expire(availability_key, self.CACHE_TTL['product_data'])
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update product availability: {str(e)}")
            return False
    
    async def get_product_availability(self, product_id: str) -> Optional[int]:
        """Get product availability from cache"""
        try:
            availability_key = f"{self.KEY_PREFIXES['product_data']}availability"
            stock_level = await self.redis_client.hget(availability_key, product_id)
            return int(stock_level) if stock_level is not None else None
            
        except Exception as e:
            logger.error(f"Failed to get product availability: {str(e)}")
            return None
    
    # Category Data Cache
    async def cache_category_data(self, category_id: str, category_data: Dict) -> bool:
        """Cache category data"""
        return await self.set_cache(
            category_id, 
            category_data, 
            ttl=self.CACHE_TTL['category_data'],
            prefix=self.KEY_PREFIXES['category_data']
        )
    
    async def get_category_data(self, category_id: str) -> Optional[Dict]:
        """Get cached category data"""
        return await self.get_cache(category_id, prefix=self.KEY_PREFIXES['category_data'])
    
    async def invalidate_category_cache(self, category_id: str) -> bool:
        """Invalidate category cache"""
        return await self.delete_cache(category_id, prefix=self.KEY_PREFIXES['category_data'])
    
    # Model Features Cache
    async def cache_model_features(self, feature_key: str, features: Any) -> bool:
        """Cache model features (embeddings, etc.)"""
        return await self.set_cache(
            feature_key, 
            features, 
            ttl=self.CACHE_TTL['model_features'],
            prefix=self.KEY_PREFIXES['model_features']
        )
    
    async def get_model_features(self, feature_key: str) -> Optional[Any]:
        """Get cached model features"""
        return await self.get_cache(feature_key, prefix=self.KEY_PREFIXES['model_features'])
    
    # Search Results Cache
    async def cache_search_results(self, query: str, results: List[Dict]) -> bool:
        """Cache search results"""
        query_hash = self._hash_key(query.lower())
        return await self.set_cache(
            query_hash, 
            results, 
            ttl=self.CACHE_TTL['search_results'],
            prefix=self.KEY_PREFIXES['search']
        )
    
    async def get_search_results(self, query: str) -> Optional[List[Dict]]:
        """Get cached search results"""
        query_hash = self._hash_key(query.lower())
        return await self.get_cache(query_hash, prefix=self.KEY_PREFIXES['search'])
    
    # Batch Operations
    async def batch_cache_recommendations(self, recommendations_data: Dict[str, List[Dict]]) -> bool:
        """Batch cache multiple user recommendations"""
        try:
            pipe = self.redis_client.pipeline()
            
            for user_id, recommendations in recommendations_data.items():
                key = self._generate_cache_key(self.KEY_PREFIXES['user_rec'], f"{user_id}:hybrid")
                serialized_data = await self._serialize_data(recommendations)
                pipe.setex(key, self.CACHE_TTL['user_recommendations'], serialized_data)
            
            await pipe.execute()
            return True
            
        except Exception as e:
            logger.error(f"Failed to batch cache recommendations: {str(e)}")
            return False
    
    async def batch_invalidate_users(self, user_ids: List[str]) -> bool:
        """Batch invalidate multiple users"""
        try:
            patterns = []
            for user_id in user_ids:
                patterns.extend([
                    f"{self.KEY_PREFIXES['user_rec']}{user_id}:*",
                    f"{self.KEY_PREFIXES['user_data']}{user_id}"
                ])
            
            total_deleted = 0
            for pattern in patterns:
                deleted = await self.delete_pattern(pattern)
                total_deleted += deleted
            
            return total_deleted > 0
            
        except Exception as e:
            logger.error(f"Failed to batch invalidate users: {str(e)}")
            return False
    
    # Analytics and Metrics
    async def increment_cache_hit(self, cache_type: str) -> bool:
        """Increment cache hit counter"""
        try:
            key = f"{self.KEY_PREFIXES['analytics']}cache_hits:{cache_type}"
            await self.redis_client.incr(key)
            await self.redis_client.expire(key, 86400)  # 24 hours
            return True
            
        except Exception as e:
            logger.error(f"Failed to increment cache hit: {str(e)}")
            return False
    
    async def increment_cache_miss(self, cache_type: str) -> bool:
        """Increment cache miss counter"""
        try:
            key = f"{self.KEY_PREFIXES['analytics']}cache_misses:{cache_type}"
            await self.redis_client.incr(key)
            await self.redis_client.expire(key, 86400)  # 24 hours
            return True
            
        except Exception as e:
            logger.error(f"Failed to increment cache miss: {str(e)}")
            return False
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            stats = {}
            
            # Get hit/miss ratios
            hit_keys = await self.redis_client.keys(f"{self.KEY_PREFIXES['analytics']}cache_hits:*")
            miss_keys = await self.redis_client.keys(f"{self.KEY_PREFIXES['analytics']}cache_misses:*")
            
            for key in hit_keys:
                cache_type = key.split(':')[-1]
                hits = await self.redis_client.get(key)
                misses = await self.redis_client.get(f"{self.KEY_PREFIXES['analytics']}cache_misses:{cache_type}")
                
                hits = int(hits) if hits else 0
                misses = int(misses) if misses else 0
                total = hits + misses
                
                stats[cache_type] = {
                    'hits': hits,
                    'misses': misses,
                    'total': total,
                    'hit_rate': (hits / total * 100) if total > 0 else 0
                }
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get cache stats: {str(e)}")
            return {}
    
    async def clear_all_cache(self) -> bool:
        """Clear all ML-related cache (use with caution)"""
        try:
            pattern = "ml:*"
            deleted_count = await self.delete_pattern(pattern)
            logger.info(f"Cleared {deleted_count} cache entries")
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear cache: {str(e)}")
            return False
    
    async def health_check(self) -> Dict[str, Any]:
        """Check cache service health"""
        try:
            # Test basic operations
            test_key = "health_check_test"
            test_value = {"timestamp": datetime.now().isoformat()}
            
            # Test set
            await self.set_cache(test_key, test_value, ttl=60)
            
            # Test get
            retrieved = await self.get_cache(test_key)
            
            # Test delete
            await self.delete_cache(test_key)
            
            # Get Redis info
            redis_info = await self.redis_client.info()
            
            return {
                "status": "healthy",
                "redis_connected": True,
                "test_passed": retrieved is not None,
                "redis_memory_usage": redis_info.get('used_memory_human', 'unknown'),
                "redis_connected_clients": redis_info.get('connected_clients', 0)
            }
            
        except Exception as e:
            logger.error(f"Cache health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "redis_connected": False
            }