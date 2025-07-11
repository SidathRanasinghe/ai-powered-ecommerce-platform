from fastapi import Request, HTTPException
from typing import Dict, Any
import logging
import hmac
import hashlib
import json
from datetime import datetime

from ..config.settings import Settings
from ..services.cache_service import CacheService
from ..services.background_jobs import BackgroundJobService
from ..models.recommendation_engine import RecommendationEngine

logger = logging.getLogger(__name__)

class WebhookHandler:
    """Handle webhooks from the main backend for real-time updates"""
    
    def __init__(
        self, 
        settings: Settings,
        cache_service: CacheService,
        background_jobs: BackgroundJobService,
        recommendation_engine: RecommendationEngine
    ):
        self.settings = settings
        self.cache_service = cache_service
        self.background_jobs = background_jobs
        self.recommendation_engine = recommendation_engine
        self.webhook_secret = settings.WEBHOOK_SECRET
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature for security"""
        if not self.webhook_secret:
            logger.warning("No webhook secret configured - skipping signature verification")
            return True
            
        expected_signature = hmac.new(
            self.webhook_secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Compare signatures using hmac.compare_digest for security
        return hmac.compare_digest(f"sha256={expected_signature}", signature)
    
    async def handle_webhook(self, request: Request) -> Dict[str, Any]:
        """Main webhook handler"""
        try:
            # Get request body and signature
            body = await request.body()
            signature = request.headers.get("X-Webhook-Signature")
            
            # Verify signature
            if not self.verify_webhook_signature(body, signature):
                logger.error("Invalid webhook signature")
                raise HTTPException(status_code=401, detail="Invalid signature")
            
            # Parse JSON payload
            try:
                payload = json.loads(body.decode('utf-8'))
            except json.JSONDecodeError:
                logger.error("Invalid JSON payload")
                raise HTTPException(status_code=400, detail="Invalid JSON")
            
            # Get event type
            event_type = payload.get("event_type")
            if not event_type:
                logger.error("Missing event_type in webhook payload")
                raise HTTPException(status_code=400, detail="Missing event_type")
            
            # Route to appropriate handler
            handler_map = {
                "user.created": self.handle_user_created,
                "user.updated": self.handle_user_updated,
                "user.deleted": self.handle_user_deleted,
                "product.created": self.handle_product_created,
                "product.updated": self.handle_product_updated,
                "product.deleted": self.handle_product_deleted,
                "order.completed": self.handle_order_completed,
                "review.created": self.handle_review_created,
                "interaction.tracked": self.handle_interaction_tracked,
                "inventory.updated": self.handle_inventory_updated,
                "category.updated": self.handle_category_updated
            }
            
            handler = handler_map.get(event_type)
            if not handler:
                logger.warning(f"No handler for event type: {event_type}")
                return {"status": "ignored", "message": f"No handler for {event_type}"}
            
            # Call the handler
            result = await handler(payload.get("data", {}))
            
            logger.info(f"Successfully processed webhook: {event_type}")
            return {"status": "success", "event_type": event_type, "result": result}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")
    
    async def handle_user_created(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle new user creation"""
        user_id = data.get("user_id")
        if not user_id:
            logger.error("Missing user_id in user.created event")
            return {"status": "error", "message": "Missing user_id"}
        
        # Initialize user in recommendation engine
        await self.recommendation_engine.initialize_new_user(user_id, data)
        
        # Cache user data
        await self.cache_service.cache_user_data(user_id, data)
        
        return {"status": "processed", "user_id": user_id}
    
    async def handle_user_updated(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle user profile updates"""
        user_id = data.get("user_id")
        if not user_id:
            return {"status": "error", "message": "Missing user_id"}
        
        # Invalidate user cache
        await self.cache_service.invalidate_user_cache(user_id)
        
        # Update user preferences in recommendation engine
        await self.recommendation_engine.update_user_preferences(user_id, data)
        
        return {"status": "processed", "user_id": user_id}
    
    async def handle_user_deleted(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle user deletion"""
        user_id = data.get("user_id")
        if not user_id:
            return {"status": "error", "message": "Missing user_id"}
        
        # Remove user from all caches and models
        await self.cache_service.remove_user_data(user_id)
        await self.recommendation_engine.remove_user(user_id)
        
        return {"status": "processed", "user_id": user_id}
    
    async def handle_product_created(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle new product creation"""
        product_id = data.get("product_id")
        if not product_id:
            return {"status": "error", "message": "Missing product_id"}
        
        # Add product to recommendation engine
        await self.recommendation_engine.add_product(product_id, data)
        
        # Cache product data
        await self.cache_service.cache_product_data(product_id, data)
        
        # Schedule similarity calculations in background
        await self.background_jobs.schedule_product_similarity_update(product_id)
        
        return {"status": "processed", "product_id": product_id}
    
    async def handle_product_updated(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle product updates"""
        product_id = data.get("product_id")
        if not product_id:
            return {"status": "error", "message": "Missing product_id"}
        
        # Invalidate product cache
        await self.cache_service.invalidate_product_cache(product_id)
        
        # Update product in recommendation engine
        await self.recommendation_engine.update_product(product_id, data)
        
        # Recalculate similarities if significant changes
        changed_fields = data.get("changed_fields", [])
        if any(field in changed_fields for field in ['category', 'tags', 'description', 'price']):
            await self.background_jobs.schedule_product_similarity_update(product_id)
        
        return {"status": "processed", "product_id": product_id}
    
    async def handle_product_deleted(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle product deletion"""
        product_id = data.get("product_id")
        if not product_id:
            return {"status": "error", "message": "Missing product_id"}
        
        # Remove product from all caches and models
        await self.cache_service.remove_product_data(product_id)
        await self.recommendation_engine.remove_product(product_id)
        
        return {"status": "processed", "product_id": product_id}
    
    async def handle_order_completed(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle completed orders"""
        user_id = data.get("user_id")
        order_id = data.get("order_id")
        items = data.get("items", [])
        
        if not user_id or not items:
            return {"status": "error", "message": "Missing required fields"}
        
        # Update user purchase history
        await self.recommendation_engine.update_user_purchases(user_id, items)
        
        # Invalidate user recommendation cache
        await self.cache_service.invalidate_user_recommendations(user_id)
        
        # Schedule model retraining if needed
        await self.background_jobs.check_and_schedule_retraining()
        
        return {"status": "processed", "user_id": user_id, "order_id": order_id}
    
    async def handle_review_created(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle new product reviews"""
        user_id = data.get("user_id")
        product_id = data.get("product_id")
        rating = data.get("rating")
        
        if not all([user_id, product_id, rating]):
            return {"status": "error", "message": "Missing required fields"}
        
        # Update rating in recommendation engine
        await self.recommendation_engine.update_user_rating(user_id, product_id, rating)
        
        # Invalidate related caches
        await self.cache_service.invalidate_user_recommendations(user_id)
        await self.cache_service.invalidate_product_recommendations(product_id)
        
        return {"status": "processed", "user_id": user_id, "product_id": product_id}
    
    async def handle_interaction_tracked(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle user interaction tracking"""
        user_id = data.get("user_id")
        product_id = data.get("product_id")
        interaction_type = data.get("interaction_type")
        
        if not all([user_id, product_id, interaction_type]):
            return {"status": "error", "message": "Missing required fields"}
        
        # Update interaction in recommendation engine
        await self.recommendation_engine.track_interaction(user_id, product_id, interaction_type)
        
        # Update trending data if needed
        if interaction_type in ['view', 'click', 'add_to_cart']:
            await self.cache_service.update_trending_data(product_id, interaction_type)
        
        return {"status": "processed", "user_id": user_id, "product_id": product_id}
    
    async def handle_inventory_updated(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle inventory updates"""
        product_id = data.get("product_id")
        stock_level = data.get("stock_level")
        
        if not product_id:
            return {"status": "error", "message": "Missing product_id"}
        
        # Update product availability in cache
        await self.cache_service.update_product_availability(product_id, stock_level)
        
        # If out of stock, remove from active recommendations
        if stock_level == 0:
            await self.recommendation_engine.deactivate_product_recommendations(product_id)
        
        return {"status": "processed", "product_id": product_id}
    
    async def handle_category_updated(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle category updates"""
        category_id = data.get("category_id")
        
        if not category_id:
            return {"status": "error", "message": "Missing category_id"}
        
        # Invalidate category-based caches
        await self.cache_service.invalidate_category_cache(category_id)
        
        # Schedule category-based recommendation updates
        await self.background_jobs.schedule_category_recommendations_update(category_id)
        
        return {"status": "processed", "category_id": category_id}