import httpx
import asyncio
from typing import Dict, List, Optional, Any
import logging
from ..config.settings import Settings
from ..utils.helpers import retry_with_backoff

logger = logging.getLogger(__name__)

class BackendAPIClient:
    """Client for communicating with the main backend API"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.base_url = settings.BACKEND_API_URL
        self.api_key = settings.BACKEND_API_KEY
        self.timeout = httpx.Timeout(30.0)
        
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
        headers: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to backend API"""
        
        default_headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Service": "ml-service"
        }
        
        if headers:
            default_headers.update(headers)
            
        url = f"{self.base_url}{endpoint}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    json=data,
                    params=params,
                    headers=default_headers
                )
                response.raise_for_status()
                return response.json()
                
            except httpx.HTTPError as e:
                logger.error(f"HTTP error calling {endpoint}: {str(e)}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error calling {endpoint}: {str(e)}")
                raise
    
    @retry_with_backoff(max_retries=3)
    async def get_user_data(self, user_id: str) -> Dict[str, Any]:
        """Get user profile and preferences"""
        return await self._make_request("GET", f"/api/users/{user_id}")
    
    @retry_with_backoff(max_retries=3)
    async def get_user_purchase_history(self, user_id: str, limit: int = 100) -> List[Dict]:
        """Get user's purchase history"""
        params = {"limit": limit}
        response = await self._make_request(
            "GET", 
            f"/api/users/{user_id}/orders", 
            params=params
        )
        return response.get("orders", [])
    
    @retry_with_backoff(max_retries=3)
    async def get_user_interactions(self, user_id: str, days: int = 30) -> List[Dict]:
        """Get user's recent interactions (views, clicks, etc.)"""
        params = {"days": days}
        response = await self._make_request(
            "GET", 
            f"/api/users/{user_id}/interactions", 
            params=params
        )
        return response.get("interactions", [])
    
    @retry_with_backoff(max_retries=3)
    async def get_products_batch(self, product_ids: List[str]) -> List[Dict]:
        """Get multiple products by IDs"""
        data = {"product_ids": product_ids}
        response = await self._make_request("POST", "/api/products/batch", data=data)
        return response.get("products", [])
    
    @retry_with_backoff(max_retries=3)
    async def get_all_products(self, category: Optional[str] = None, active_only: bool = True) -> List[Dict]:
        """Get all products with optional filtering"""
        params = {
            "active_only": active_only,
            "include_ml_features": True
        }
        if category:
            params["category"] = category
            
        response = await self._make_request("GET", "/api/products", params=params)
        return response.get("products", [])
    
    @retry_with_backoff(max_retries=3)
    async def get_product_analytics(self, product_id: str, days: int = 30) -> Dict:
        """Get product analytics data"""
        params = {"days": days}
        response = await self._make_request(
            "GET", 
            f"/api/products/{product_id}/analytics", 
            params=params
        )
        return response
    
    @retry_with_backoff(max_retries=3)
    async def update_product_recommendations(self, product_id: str, recommendations: List[str]) -> bool:
        """Update product's recommendation list in backend"""
        data = {"recommended_products": recommendations}
        try:
            await self._make_request(
                "PATCH", 
                f"/api/products/{product_id}/recommendations", 
                data=data
            )
            return True
        except Exception as e:
            logger.error(f"Failed to update recommendations for product {product_id}: {str(e)}")
            return False
    
    @retry_with_backoff(max_retries=3)
    async def track_recommendation_click(self, user_id: str, product_id: str, recommendation_id: str) -> bool:
        """Track when a user clicks on a recommendation"""
        data = {
            "user_id": user_id,
            "product_id": product_id,
            "recommendation_id": recommendation_id,
            "event_type": "recommendation_click"
        }
        try:
            await self._make_request("POST", "/api/analytics/track", data=data)
            return True
        except Exception as e:
            logger.error(f"Failed to track recommendation click: {str(e)}")
            return False
    
    @retry_with_backoff(max_retries=3)
    async def get_trending_data(self, category: Optional[str] = None, time_period: str = "week") -> List[Dict]:
        """Get trending products data from backend"""
        params = {"time_period": time_period}
        if category:
            params["category"] = category
            
        response = await self._make_request("GET", "/api/analytics/trending", params=params)
        return response.get("trending_products", [])
    
    @retry_with_backoff(max_retries=3)
    async def get_category_data(self) -> List[Dict]:
        """Get all categories with metadata"""
        response = await self._make_request("GET", "/api/categories")
        return response.get("categories", [])
    
    async def bulk_update_user_embeddings(self, user_embeddings: Dict[str, List[float]]) -> bool:
        """Bulk update user embeddings in backend"""
        data = {"user_embeddings": user_embeddings}
        try:
            await self._make_request("POST", "/api/ml/user-embeddings", data=data)
            return True
        except Exception as e:
            logger.error(f"Failed to bulk update user embeddings: {str(e)}")
            return False
    
    async def bulk_update_product_embeddings(self, product_embeddings: Dict[str, List[float]]) -> bool:
        """Bulk update product embeddings in backend"""
        data = {"product_embeddings": product_embeddings}
        try:
            await self._make_request("POST", "/api/ml/product-embeddings", data=data)
            return True
        except Exception as e:
            logger.error(f"Failed to bulk update product embeddings: {str(e)}")
            return False
    
    async def health_check(self) -> bool:
        """Check if backend API is healthy"""
        try:
            response = await self._make_request("GET", "/health")
            return response.get("status") == "healthy"
        except Exception:
            return False