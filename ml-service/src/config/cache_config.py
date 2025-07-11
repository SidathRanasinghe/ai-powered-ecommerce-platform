from typing import Dict, Any
from dataclasses import dataclass

@dataclass
class CacheConfig:
    """Configuration for cache settings"""
    
    # Redis connection settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB_ML: int = 2
    
    # Cache TTL settings (in seconds)
    CACHE_TTL: Dict[str, int] = None
    
    # Cache key prefixes
    KEY_PREFIXES: Dict[str, str] = None
    
    # Cache strategies
    CACHE_STRATEGIES: Dict[str, str] = None
    
    def __post_init__(self):
        if self.CACHE_TTL is None:
            self.CACHE_TTL = {
                # User-related caches
                'user_recommendations': 3600,      # 1 hour
                'user_data': 3600,                 # 1 hour
                'user_preferences': 7200,          # 2 hours
                'user_embeddings': 86400,          # 24 hours
                
                # Product-related caches
                'product_similarities': 86400,     # 24 hours
                'product_data': 7200,              # 2 hours
                'product_embeddings': 86400,       # 24 hours
                'product_features': 86400,         # 24 hours
                
                # Trending and popular
                'trending_products': 1800,         # 30 minutes
                'popular_products': 7200,          # 2 hours
                'trending_categories': 3600,       # 1 hour
                
                # Category and search
                'category_data': 14400,            # 4 hours
                'search_results': 1800,            # 30 minutes
                'search_suggestions': 3600,        # 1 hour
                
                # Model and analytics
                'model_features': 86400,           # 24 hours
                'model_predictions': 3600,         # 1 hour
                'analytics_data': 7200,            # 2 hours
                
                # System caches
                'system_stats': 300,               # 5 minutes
                'health_data': 60,                 # 1 minute
            }
        
        if self.KEY_PREFIXES is None:
            self.KEY_PREFIXES = {
                # User caches
                'user_rec': 'ml:user_rec:',
                'user_data': 'ml:user_data:',
                'user_prefs': 'ml:user_prefs:',
                'user_embed': 'ml:user_embed:',
                
                # Product caches
                'product_sim': 'ml:product_sim:',
                'product_data': 'ml:product_data:',
                'product_embed': 'ml:product_embed:',
                'product_features': 'ml:product_features:',
                
                # Trending and popular
                'trending': 'ml:trending:',
                'popular': 'ml:popular:',
                
                # Category and search
                'category_data': 'ml:category_data:',
                'search': 'ml:search:',
                'search_suggest': 'ml:search_suggest:',
                
                # Model and analytics
                'model_features': 'ml:model_features:',
                'model_pred': 'ml:model_pred:',
                'analytics': 'ml:analytics:',
                
                # System
                'system': 'ml:system:',
                'health': 'ml:health:',
            }
        
        if self.CACHE_STRATEGIES is None:
            self.CACHE_STRATEGIES = {
                # Cache-aside strategy (default)
                'user_recommendations': 'cache_aside',
                'product_similarities': 'cache_aside',
                
                # Write-through strategy
                'user_data': 'write_through',
                'product_data': 'write_through',
                
                # Write-behind strategy
                'analytics_data': 'write_behind',
                'trending_products': 'write_behind',
                
                # Refresh-ahead strategy
                'popular_products': 'refresh_ahead',
                'model_features': 'refresh_ahead',
            }

class CacheStrategy:
    """Cache strategy implementations"""
    
    @staticmethod
    def get_cache_warming_schedule() -> Dict[str, int]:
        """Get cache warming schedule in seconds"""
        return {
            'popular_products': 3600,       # Warm every hour
            'trending_products': 1800,      # Warm every 30 minutes
            'category_data': 14400,         # Warm every 4 hours
            'model_features': 86400,        # Warm every 24 hours
        }
    
    @staticmethod
    def get_cache_eviction_policies() -> Dict[str, str]:
        """Get cache eviction policies"""
        return {
            'user_recommendations': 'lru',     # Least Recently Used
            'product_similarities': 'lru',     # Least Recently Used
            'trending_products': 'ttl',        # Time To Live
            'popular_products': 'lfu',         # Least Frequently Used
            'search_results': 'fifo',          # First In First Out
        }
    
    @staticmethod
    def get_cache_compression_settings() -> Dict[str, bool]:
        """Get cache compression settings"""
        return {
            'user_embeddings': True,        # Compress large embeddings
            'product_embeddings': True,     # Compress large embeddings
            'model_features': True,         # Compress model data
            'analytics_data': True,         # Compress analytics
            'search_results': False,        # Don't compress search results
            'trending_products': False,     # Don't compress trending data
        }
    
    @staticmethod
    def get_cache_replication_settings() -> Dict[str, int]:
        """Get cache replication settings"""
        return {
            'critical_data': 2,             # Replicate critical data 2 times
            'user_recommendations': 1,      # Replicate user recommendations 1 time
            'product_similarities': 1,      # Replicate product similarities 1 time
            'analytics_data': 0,            # Don't replicate analytics data
        }

class CacheMetrics:
    """Cache metrics configuration"""
    
    @staticmethod
    def get_metrics_to_track() -> Dict[str, list]:
        """Get metrics to track for each cache type"""
        return {
            'user_recommendations': [
                'hit_rate',
                'miss_rate',
                'avg_response_time',
                'cache_size',
                'eviction_count'
            ],
            'product_similarities': [
                'hit_rate',
                'miss_rate',
                'avg_response_time',
                'cache_size',
                'update_frequency'
            ],
            'trending_products': [
                'hit_rate',
                'refresh_rate',
                'staleness_time',
                'popularity_score'
            ],
            'search_results': [
                'hit_rate',
                'query_patterns',
                'cache_effectiveness',
                'storage_efficiency'
            ]
        }
    
    @staticmethod
    def get_alerting_thresholds() -> Dict[str, Dict[str, float]]:
        """Get alerting thresholds for cache metrics"""
        return {
            'hit_rate': {
                'warning': 0.7,     # Alert if hit rate drops below 70%
                'critical': 0.5     # Critical if hit rate drops below 50%
            },
            'response_time': {
                'warning': 100,     # Alert if response time > 100ms
                'critical': 500     # Critical if response time > 500ms
            },
            'cache_size': {
                'warning': 0.8,     # Alert if cache size > 80% of limit
                'critical': 0.95    # Critical if cache size > 95% of limit
            },
            'eviction_rate': {
                'warning': 0.1,     # Alert if eviction rate > 10%
                'critical': 0.25    # Critical if eviction rate > 25%
            }
        }

class CacheOptimization:
    """Cache optimization strategies"""
    
    @staticmethod
    def get_batch_sizes() -> Dict[str, int]:
        """Get optimal batch sizes for different operations"""
        return {
            'user_recommendations': 50,     # Batch 50 users at once
            'product_similarities': 100,    # Batch 100 products at once
            'cache_warming': 200,           # Warm 200 items at once
            'cache_invalidation': 1000,     # Invalidate 1000 items at once
        }
    
    @staticmethod
    def get_prefetch_strategies() -> Dict[str, Dict[str, Any]]:
        """Get prefetch strategies for different cache types"""
        return {
            'user_recommendations': {
                'enabled': True,
                'trigger_threshold': 0.2,   # Prefetch when TTL < 20%
                'prefetch_count': 5,        # Prefetch next 5 items
                'background_refresh': True
            },
            'product_similarities': {
                'enabled': True,
                'trigger_threshold': 0.1,   # Prefetch when TTL < 10%
                'prefetch_count': 10,       # Prefetch next 10 items
                'background_refresh': True
            },
            'trending_products': {
                'enabled': True,
                'trigger_threshold': 0.5,   # Prefetch when TTL < 50%
                'prefetch_count': 20,       # Prefetch next 20 items
                'background_refresh': True
            }
        }
    
    @staticmethod
    def get_circuit_breaker_settings() -> Dict[str, Dict[str, Any]]:
        """Get circuit breaker settings for cache operations"""
        return {
            'redis_connection': {
                'failure_threshold': 5,     # Trip after 5 failures
                'recovery_timeout': 60,     # Try to recover after 60 seconds
                'expected_exception': 'RedisError'
            },
            'cache_operations': {
                'failure_threshold': 10,    # Trip after 10 failures
                'recovery_timeout': 30,     # Try to recover after 30 seconds
                'expected_exception': 'CacheError'
            }
        }