"""
Recommendation service that orchestrates the ML engine with caching and business logic
"""

import asyncio
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from collections import defaultdict

from ..models.recommendation_engine import RecommendationEngine
from ..models.schemas import ProductRecommendation, BehaviorType
from ..config.database import DatabaseManager
from ..config.settings import Settings

logger = logging.getLogger(__name__)

class RecommendationService:
    """High-level service for managing recommendations"""
    
    def __init__(self, recommendation_engine: RecommendationEngine, 
                 db_manager: DatabaseManager):
        self.recommendation_engine = recommendation_engine
        self.db_manager = db_manager
        self.settings = Settings()
        
    async def get_user_recommendations(self, user_id: str, 
                                     num_recommendations: int = 10,
                                     exclude_purchased: bool = True) -> List[ProductRecommendation]:
        """Get personalized recommendations for a user"""
        try:
            # Check cache first
            cached_recommendations = await self.db_manager.get_cached_recommendations(user_id)
            if cached_recommendations:
                logger.info(f"Returning cached recommendations for user {user_id}")
                return [ProductRecommendation(**rec) for rec in cached_recommendations]
            
            # Get user's purchased products if we need to exclude them
            purchased_products = []
            if exclude_purchased:
                purchased_products = await self.db_manager.get_user_purchased_products(user_id)
            
            # Try hybrid approach first
            recommendations = await self.recommendation_engine.get_hybrid_recommendations(
                user_id, num_recommendations * 2  # Get more to filter
            )
            
            # If not enough recommendations, fall back to individual algorithms
            if len(recommendations) < num_recommendations:
                # Try collaborative filtering
                collaborative_recs = await self.recommendation_engine.get_collaborative_recommendations(
                    user_id, num_recommendations
                )
                
                # Try content-based filtering
                content_recs = await self.recommendation_engine.get_content_based_recommendations(
                    user_id, num_recommendations
                )
                
                # Combine recommendations using a smart merging strategy
                all_recommendations = {}
                
                # Add hybrid recommendations (highest priority)
                for rec in recommendations:
                    all_recommendations[rec.product_id] = rec
                
                # Add collaborative filtering recommendations
                for rec in collaborative_recs:
                    if rec.product_id not in all_recommendations:
                        all_recommendations[rec.product_id] = rec
                
                # Add content-based recommendations
                for rec in content_recs:
                    if rec.product_id not in all_recommendations:
                        all_recommendations[rec.product_id] = rec
                
                # Convert back to list
                recommendations = list(all_recommendations.values())
            
            # Filter out purchased products
            if exclude_purchased and purchased_products:
                recommendations = [rec for rec in recommendations 
                                 if rec.product_id not in purchased_products]
            
            # Sort by confidence score and limit results
            recommendations = sorted(recommendations, 
                                   key=lambda x: x.confidence_score, 
                                   reverse=True)[:num_recommendations]
            
            # If still not enough recommendations, get popular products
            if len(recommendations) < num_recommendations:
                needed = num_recommendations - len(recommendations)
                popular_products = await self.get_popular_products(limit=needed)
                
                # Convert popular products to recommendations
                for product in popular_products:
                    if product['_id'] not in [rec.product_id for rec in recommendations]:
                        recommendations.append(ProductRecommendation(
                            product_id=product['_id'],
                            title=product['title'],
                            confidence_score=0.5,  # Lower confidence for popular items
                            reason="Popular product"
                        ))
            
            # Cache the recommendations
            await self.db_manager.cache_recommendations(user_id, 
                                                       [rec.dict() for rec in recommendations])
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting user recommendations: {str(e)}")
            # Fallback to popular products
            return await self._get_fallback_recommendations(num_recommendations)
    
    async def get_similar_products(self, product_id: str, 
                                 num_recommendations: int = 10) -> List[ProductRecommendation]:
        """Get products similar to a given product"""
        try:
            # Check cache first
            cached_similar = await self.db_manager.get_cached_similar_products(product_id)
            if cached_similar:
                logger.info(f"Returning cached similar products for product {product_id}")
                return [ProductRecommendation(**rec) for rec in cached_similar]
            
            # Get similar products from recommendation engine
            similar_products = await self.recommendation_engine.get_similar_products(
                product_id, num_recommendations
            )
            
            # Cache the results
            await self.db_manager.cache_similar_products(product_id, 
                                                        [rec.dict() for rec in similar_products])
            
            return similar_products
            
        except Exception as e:
            logger.error(f"Error getting similar products: {str(e)}")
            return []
    
    async def track_user_behavior(self, user_id: str, product_id: str, 
                                behavior_type: BehaviorType, rating: Optional[float] = None,
                                session_id: Optional[str] = None):
        """Track user behavior for improving recommendations"""
        try:
            behavior_data = {
                "user_id": user_id,
                "product_id": product_id,
                "behavior_type": behavior_type.value,
                "rating": rating,
                "session_id": session_id,
                "timestamp": datetime.utcnow()
            }
            
            # Store behavior in database
            await self.db_manager.store_user_behavior(behavior_data)
            
            # Update real-time user preferences
            await self.recommendation_engine.update_user_preferences(user_id, behavior_data)
            
            # Clear cached recommendations if behavior is significant
            if behavior_type in [BehaviorType.PURCHASE, BehaviorType.RATING, BehaviorType.ADD_TO_CART]:
                await self.db_manager.clear_cached_recommendations(user_id)
            
            logger.info(f"Tracked {behavior_type.value} behavior for user {user_id} on product {product_id}")
            
        except Exception as e:
            logger.error(f"Error tracking user behavior: {str(e)}")
            raise
    
    async def get_trending_products(self, category: Optional[str] = None, 
                                  time_period: str = "week", limit: int = 10) -> List[Dict]:
        """Get trending products based on user interactions"""
        try:
            # Define time range
            time_ranges = {
                "day": timedelta(days=1),
                "week": timedelta(weeks=1),
                "month": timedelta(days=30)
            }
            
            start_time = datetime.utcnow() - time_ranges.get(time_period, timedelta(weeks=1))
            
            # Get trending products from database
            trending_products = await self.db_manager.get_trending_products(
                category=category,
                start_time=start_time,
                limit=limit
            )
            
            return trending_products
            
        except Exception as e:
            logger.error(f"Error getting trending products: {str(e)}")
            return []
    
    async def get_popular_products(self, category: Optional[str] = None, 
                                 limit: int = 10) -> List[Dict]:
        """Get popular products for new users (cold start problem)"""
        try:
            # Check cache first
            cache_key = f"popular_products_{category}_{limit}"
            cached_popular = await self.db_manager.get_cached_data(cache_key)
            if cached_popular:
                return cached_popular
            
            # Get popular products from database
            popular_products = await self.db_manager.get_popular_products(
                category=category,
                limit=limit
            )
            
            # Cache the results for 1 hour
            await self.db_manager.cache_data(cache_key, popular_products, ttl=3600)
            
            return popular_products
            
        except Exception as e:
            logger.error(f"Error getting popular products: {str(e)}")
            return []
    
    async def get_model_status(self) -> Dict:
        """Get current model training status"""
        try:
            status = await self.recommendation_engine.get_model_status()
            return {
                "status": status.get("status", "unknown"),
                "last_trained": status.get("last_trained"),
                "training_progress": status.get("training_progress", 0),
                "model_version": status.get("model_version", "1.0"),
                "total_users": status.get("total_users", 0),
                "total_products": status.get("total_products", 0),
                "total_interactions": status.get("total_interactions", 0)
            }
        except Exception as e:
            logger.error(f"Error getting model status: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    async def retrain_models(self, force_retrain: bool = False):
        """Retrain recommendation models"""
        try:
            logger.info("Starting model retraining...")
            
            # Check if retraining is needed
            if not force_retrain:
                last_training = await self.db_manager.get_last_training_time()
                if last_training:
                    time_since_training = datetime.utcnow() - last_training
                    if time_since_training < timedelta(hours=24):
                        logger.info("Model was recently trained, skipping retraining")
                        return
            
            # Update model status
            await self.db_manager.update_model_status("training")
            
            # Clear all cached recommendations
            await self.db_manager.clear_all_cached_recommendations()
            
            # Retrain models
            await self.recommendation_engine.retrain_models()
            
            # Update training timestamp
            await self.db_manager.update_last_training_time()
            
            # Update model status
            await self.db_manager.update_model_status("completed")
            
            logger.info("Model retraining completed successfully")
            
        except Exception as e:
            logger.error(f"Error during model retraining: {str(e)}")
            await self.db_manager.update_model_status("error")
            raise
    
    async def track_recommendation_request(self, user_id: str, 
                                         recommendations: List[ProductRecommendation]):
        """Track recommendation requests for analytics"""
        try:
            request_data = {
                "user_id": user_id,
                "recommendations": [rec.product_id for rec in recommendations],
                "timestamp": datetime.utcnow(),
                "num_recommendations": len(recommendations)
            }
            
            await self.db_manager.store_recommendation_request(request_data)
            
        except Exception as e:
            logger.error(f"Error tracking recommendation request: {str(e)}")
    
    async def get_recommendation_analytics(self, days: int = 30) -> Dict:
        """Get analytics on recommendation performance"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            analytics = await self.db_manager.get_recommendation_analytics(start_date)
            
            return {
                "total_requests": analytics.get("total_requests", 0),
                "unique_users": analytics.get("unique_users", 0),
                "avg_recommendations_per_request": analytics.get("avg_recommendations", 0),
                "top_recommended_products": analytics.get("top_products", []),
                "recommendation_click_rate": analytics.get("click_rate", 0),
                "conversion_rate": analytics.get("conversion_rate", 0)
            }
            
        except Exception as e:
            logger.error(f"Error getting recommendation analytics: {str(e)}")
            return {}
    
    async def _get_fallback_recommendations(self, num_recommendations: int) -> List[ProductRecommendation]:
        """Get fallback recommendations when other methods fail"""
        try:
            popular_products = await self.get_popular_products(limit=num_recommendations)
            
            recommendations = []
            for product in popular_products:
                recommendations.append(ProductRecommendation(
                    product_id=product['_id'],
                    title=product['title'],
                    confidence_score=0.3,  # Low confidence for fallback
                    reason="Popular product (fallback)"
                ))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting fallback recommendations: {str(e)}")
            return []
    
    async def get_user_preferences(self, user_id: str) -> Dict:
        """Get user preferences based on their behavior"""
        try:
            preferences = await self.db_manager.get_user_preferences(user_id)
            return preferences
            
        except Exception as e:
            logger.error(f"Error getting user preferences: {str(e)}")
            return {}
    
    async def update_product_features(self, product_id: str, features: Dict):
        """Update product features for better recommendations"""
        try:
            await self.db_manager.update_product_features(product_id, features)
            
            # Clear cached similar products
            await self.db_manager.clear_cached_similar_products(product_id)
            
            logger.info(f"Updated features for product {product_id}")
            
        except Exception as e:
            logger.error(f"Error updating product features: {str(e)}")
            raise
    
    async def get_category_recommendations(self, category: str, 
                                         limit: int = 10) -> List[ProductRecommendation]:
        """Get recommendations for a specific category"""
        try:
            # Get popular products in the category
            popular_products = await self.get_popular_products(category=category, limit=limit)
            
            recommendations = []
            for product in popular_products:
                recommendations.append(ProductRecommendation(
                    product_id=product['_id'],
                    title=product['title'],
                    confidence_score=0.6,
                    reason=f"Popular in {category}"
                ))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting category recommendations: {str(e)}")
            return []
    
    async def bulk_update_user_preferences(self, user_preferences: List[Dict]):
        """Bulk update user preferences"""
        try:
            await self.db_manager.bulk_update_user_preferences(user_preferences)
            logger.info(f"Bulk updated {len(user_preferences)} user preferences")
            
        except Exception as e:
            logger.error(f"Error bulk updating user preferences: {str(e)}")
            raise
    
    async def cleanup_old_data(self, days: int = 90):
        """Clean up old behavioral data and cached recommendations"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Clean up old behavior data
            await self.db_manager.cleanup_old_behavior_data(cutoff_date)
            
            # Clean up old cached recommendations
            await self.db_manager.cleanup_old_cached_data(cutoff_date)
            
            logger.info(f"Cleaned up data older than {days} days")
            
        except Exception as e:
            logger.error(f"Error cleaning up old data: {str(e)}")
            raise