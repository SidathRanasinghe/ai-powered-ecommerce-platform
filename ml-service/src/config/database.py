"""
Database configuration and connection management for ML service
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
import redis.asyncio as redis
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime, timedelta

from .settings import Settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Manages database connections for the ML service"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.mongodb_client: Optional[AsyncIOMotorClient] = None
        self.mongodb_db = None
        self.redis_client: Optional[redis.Redis] = None
        self.sync_mongodb_client: Optional[MongoClient] = None
        
    async def connect(self):
        """Connect to databases"""
        try:
            # MongoDB connection
            self.mongodb_client = AsyncIOMotorClient(
                self.settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000
            )
            
            # Get database name from URI
            db_name = self.settings.MONGODB_URI.split('/')[-1]
            self.mongodb_db = self.mongodb_client[db_name]
            
            # Test MongoDB connection
            await self.mongodb_client.admin.command('ping')
            logger.info("Connected to MongoDB successfully")
            
            # Synchronous MongoDB client for some operations
            self.sync_mongodb_client = MongoClient(
                self.settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000
            )
            
            # Redis connection
            self.redis_client = redis.from_url(
                self.settings.REDIS_URL,
                decode_responses=True
            )
            
            # Test Redis connection
            await self.redis_client.ping()
            logger.info("Connected to Redis successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to databases: {str(e)}")
            raise
    
    async def close(self):
        """Close database connections"""
        if self.mongodb_client:
            self.mongodb_client.close()
        if self.sync_mongodb_client:
            self.sync_mongodb_client.close()
        if self.redis_client:
            await self.redis_client.close()
        logger.info("Database connections closed")
    
    async def get_user_interactions(self, user_id: str, limit: int = 1000) -> List[Dict]:
        """Get user interactions for collaborative filtering"""
        try:
            pipeline = [
                {
                    "$match": {
                        "user_id": user_id
                    }
                },
                {
                    "$sort": {"timestamp": -1}
                },
                {
                    "$limit": limit
                }
            ]
            
            cursor = self.mongodb_db.user_interactions.aggregate(pipeline)
            interactions = await cursor.to_list(length=limit)
            return interactions
            
        except Exception as e:
            logger.error(f"Error getting user interactions: {str(e)}")
            return []
    
    async def get_all_interactions(self, limit: int = 50000) -> List[Dict]:
        """Get all user interactions for training"""
        try:
            pipeline = [
                {
                    "$sort": {"timestamp": -1}
                },
                {
                    "$limit": limit
                }
            ]
            
            cursor = self.mongodb_db.user_interactions.aggregate(pipeline)
            interactions = await cursor.to_list(length=limit)
            return interactions
            
        except Exception as e:
            logger.error(f"Error getting all interactions: {str(e)}")
            return []
    
    async def get_product_features(self, product_id: str) -> Optional[Dict]:
        """Get product features for content-based filtering"""
        try:
            product = await self.mongodb_db.products.find_one(
                {"_id": product_id}
            )
            return product
            
        except Exception as e:
            logger.error(f"Error getting product features: {str(e)}")
            return None
    
    async def get_all_products(self, limit: int = 10000) -> List[Dict]:
        """Get all products for content-based filtering"""
        try:
            cursor = self.mongodb_db.products.find({}).limit(limit)
            products = await cursor.to_list(length=limit)
            return products
            
        except Exception as e:
            logger.error(f"Error getting all products: {str(e)}")
            return []
    
    async def get_user_purchased_products(self, user_id: str) -> List[str]:
        """Get list of product IDs purchased by a user"""
        try:
            # Query orders collection for user's purchases
            orders_collection = self.db["orders"]
            
            pipeline = [
                {"$match": {"user_id": user_id, "status": "completed"}},
                {"$unwind": "$items"},
                {"$group": {"_id": "$items.product_id"}},
                {"$project": {"product_id": "$_id", "_id": 0}}
            ]
            
            results = await orders_collection.aggregate(pipeline).to_list(None)
            return [result["product_id"] for result in results]
            
        except Exception as e:
            logger.error(f"Error getting user purchased products: {str(e)}")
            return []
    
    async def track_user_behavior(self, interaction_data: Dict) -> bool:
        """Track user behavior in database"""
        try:
            interaction_data["timestamp"] = datetime.utcnow()
            await self.mongodb_db.user_interactions.insert_one(interaction_data)
            return True
            
        except Exception as e:
            logger.error(f"Error tracking user behavior: {str(e)}")
            return False
    
    async def get_trending_products(self, category: Optional[str], start_time: datetime, limit: int) -> List[Dict]:
        """Get trending products based on interactions"""
        try:
            behavior_collection = self.db["user_behavior"]
            
            # Build match criteria
            match_criteria = {
                "timestamp": {"$gte": start_time},
                "behavior_type": {"$in": ["view", "add_to_cart", "purchase"]}
            }
            
            # Add category filter if specified
            if category:
                products_collection = self.db["products"]
                category_products = await products_collection.find(
                    {"category": category}
                ).to_list(None)
                
                if category_products:
                    product_ids = [str(p["_id"]) for p in category_products]
                    match_criteria["product_id"] = {"$in": product_ids}
            
            # Aggregation pipeline
            pipeline = [
                {"$match": match_criteria},
                {"$group": {
                    "_id": "$product_id",
                    "interaction_count": {"$sum": 1},
                    "unique_users": {"$addToSet": "$user_id"}
                }},
                {"$addFields": {
                    "unique_user_count": {"$size": "$unique_users"},
                    "trending_score": {"$multiply": ["$interaction_count", {"$size": "$unique_users"}]}
                }},
                {"$sort": {"trending_score": -1}},
                {"$limit": limit}
            ]
            
            trending_results = await behavior_collection.aggregate(pipeline).to_list(None)
            
            # Get product details
            if trending_results:
                product_ids = [result["_id"] for result in trending_results]
                products_collection = self.db["products"]
                products = await products_collection.find(
                    {"_id": {"$in": product_ids}}
                ).to_list(None)
                
                # Combine trending data with product details
                product_map = {str(p["_id"]): p for p in products}
                
                trending_products = []
                for result in trending_results:
                    product_id = result["_id"]
                    if product_id in product_map:
                        product = product_map[product_id]
                        product["trending_score"] = result["trending_score"]
                        product["interaction_count"] = result["interaction_count"]
                        product["unique_users"] = result["unique_user_count"]
                        trending_products.append(product)
                
                return trending_products
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting trending products: {str(e)}")
            return []
    
    async def get_popular_products(self, category: Optional[str] = None, 
                                 limit: int = 10) -> List[Dict]:
        """Get popular products for cold start problem"""
        try:
            pipeline = [
                {
                    "$lookup": {
                        "from": "user_interactions",
                        "localField": "_id",
                        "foreignField": "product_id",
                        "as": "interactions"
                    }
                }
            ]
            
            # Add category filter if specified
            if category:
                pipeline.insert(0, {
                    "$match": {
                        "category": category
                    }
                })
            
            # Calculate popularity score
            pipeline.extend([
                {
                    "$addFields": {
                        "interaction_count": {"$size": "$interactions"},
                        "purchase_count": {
                            "$size": {
                                "$filter": {
                                    "input": "$interactions",
                                    "cond": {"$eq": ["$this.interaction_type", "purchase"]}
                                }
                            }
                        },
                        "rating_sum": {"$sum": "$reviews.rating"},
                        "rating_count": {"$size": "$reviews"}
                    }
                },
                {
                    "$addFields": {
                        "avg_rating": {
                            "$cond": [
                                {"$gt": ["$rating_count", 0]},
                                {"$divide": ["$rating_sum", "$rating_count"]},
                                0
                            ]
                        },
                        "popularity_score": {
                            "$add": [
                                {"$multiply": ["$interaction_count", 1]},
                                {"$multiply": ["$purchase_count", 3]},
                                {"$multiply": ["$avg_rating", 2]}
                            ]
                        }
                    }
                },
                {
                    "$sort": {"popularity_score": -1}
                },
                {
                    "$limit": limit
                }
            ])
            
            cursor = self.mongodb_db.products.aggregate(pipeline)
            popular = await cursor.to_list(length=limit)
            return popular
            
        except Exception as e:
            logger.error(f"Error getting popular products: {str(e)}")
            return []
        
    # async def get_popular_products(self, category: Optional[str], limit: int) -> List[Dict]:
    #     """Get popular products based on overall statistics"""
    #     try:
    #         products_collection = self.db["products"]
            
    #         # Build match criteria
    #         match_criteria = {}
    #         if category:
    #             match_criteria["category"] = category
            
    #         # Sort by popularity metrics (you can adjust these based on your product schema)
    #         sort_criteria = [
    #             ("average_rating", -1),
    #             ("review_count", -1),
    #             ("purchase_count", -1)
    #         ]
            
    #         products = await products_collection.find(match_criteria).sort(sort_criteria).limit(limit).to_list(None)
            
    #         return products
            
    #     except Exception as e:
    #         logger.error(f"Error getting popular products: {str(e)}")
    #         return []

    async def get_cached_data(self, cache_key: str) -> Optional[List[Dict]]:
        """Get cached data by key"""
        try:
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                import json
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached data: {str(e)}")
            return None
        
    async def cache_data(self, cache_key: str, data: List[Dict], ttl: int):
        """Cache data with TTL"""
        try:
            import json
            await self.redis_client.setex(cache_key, ttl, json.dumps(data))
            
        except Exception as e:
            logger.error(f"Error caching data: {str(e)}")

    async def get_last_training_time(self) -> Optional[datetime]:
        """Get the last model training time"""
        try:
            model_status_collection = self.db["model_status"]
            status = await model_status_collection.find_one({"_id": "training_status"})
            
            if status and "last_trained" in status:
                return status["last_trained"]
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting last training time: {str(e)}")
            return None
        
    async def update_model_status(self, status: str):
        """Update model training status"""
        try:
            model_status_collection = self.db["model_status"]
            await model_status_collection.update_one(
                {"_id": "training_status"},
                {
                    "$set": {
                        "status": status,
                        "updated_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            
        except Exception as e:
            logger.error(f"Error updating model status: {str(e)}")
            raise
    
    async def get_user_preferences(self, user_id: str) -> Dict:
        """Get user preferences based on interaction history"""
        try:
            pipeline = [
                {
                    "$match": {
                        "user_id": user_id
                    }
                },
                {
                    "$lookup": {
                        "from": "products",
                        "localField": "product_id",
                        "foreignField": "_id",
                        "as": "product"
                    }
                },
                {
                    "$unwind": "$product"
                },
                {
                    "$group": {
                        "_id": "$product.category",
                        "interaction_count": {"$sum": 1},
                        "purchase_count": {
                            "$sum": {
                                "$cond": [{"$eq": ["$interaction_type", "purchase"]}, 1, 0]
                            }
                        },
                        "avg_price": {"$avg": "$product.price"},
                        "brands": {"$addToSet": "$product.brand"}
                    }
                },
                {
                    "$sort": {"interaction_count": -1}
                }
            ]
            
            cursor = self.mongodb_db.user_interactions.aggregate(pipeline)
            preferences = await cursor.to_list(length=None)
            return {
                "categories": preferences,
                "total_interactions": sum(p["interaction_count"] for p in preferences)
            }
            
        except Exception as e:
            logger.error(f"Error getting user preferences: {str(e)}")
            return {}
    
    # Redis caching methods
    async def cache_recommendations(self, user_id: str, recommendations: List[Dict], ttl: int = 3600):
        """Cache recommendations for a user"""
        try:
            cache_key = f"recommendations:{user_id}"
            import json
            await self.redis_client.setex(cache_key, ttl, json.dumps(recommendations))
            
        except Exception as e:
            logger.error(f"Error caching recommendations: {str(e)}")
    
    async def get_cached_recommendations(self, user_id: str) -> Optional[List[Dict]]:
        """Get cached recommendations for a user"""
        try:
            cache_key = f"recommendations:{user_id}"
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                import json
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached recommendations: {str(e)}")
            return None
    
    async def cache_similar_products(self, product_id: str, similar_products: List[Dict], ttl: int = 7200):
        """Cache similar products"""
        try:
            cache_key = f"similar_products:{product_id}"
            import json
            await self.redis_client.setex(cache_key, ttl, json.dumps(similar_products))
            
        except Exception as e:
            logger.error(f"Error caching similar products: {str(e)}")
    
    async def store_user_behavior(self, behavior_data: Dict):
        """Store user behavior data"""
        try:
            behavior_collection = self.db["user_behavior"]
            await behavior_collection.insert_one(behavior_data)
            
        except Exception as e:
            logger.error(f"Error storing user behavior: {str(e)}")
            raise

    async def clear_cached_recommendations(self, user_id: str):
        """Clear cached recommendations for a user"""
        try:
            cache_key = f"recommendations:{user_id}"
            await self.redis_client.delete(cache_key)
            
        except Exception as e:
            logger.error(f"Error clearing cached recommendations: {str(e)}")
    
    async def get_cached_similar_products(self, product_id: str) -> Optional[List[Dict]]:
        """Get cached similar products"""
        try:
            cache_key = f"similar_products:{product_id}"
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                import json
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached similar products: {str(e)}")
            return None
    
    async def increment_interaction_counter(self, counter_key: str) -> int:
        """Increment interaction counter for auto-retraining"""
        try:
            count = await self.redis_client.incr(counter_key)
            return count
            
        except Exception as e:
            logger.error(f"Error incrementing counter: {str(e)}")
            return 0
    
    async def get_model_metadata(self, model_name: str) -> Optional[Dict]:
        """Get model metadata from database"""
        try:
            metadata = await self.mongodb_db.model_metadata.find_one(
                {"model_name": model_name}
            )
            return metadata
            
        except Exception as e:
            logger.error(f"Error getting model metadata: {str(e)}")
            return None
    
    async def save_model_metadata(self, model_name: str, metadata: Dict) -> bool:
        """Save model metadata to database"""
        try:
            await self.mongodb_db.model_metadata.update_one(
                {"model_name": model_name},
                {"$set": metadata},
                upsert=True
            )
            return True
            
        except Exception as e:
            logger.error(f"Error saving model metadata: {str(e)}")
            return False