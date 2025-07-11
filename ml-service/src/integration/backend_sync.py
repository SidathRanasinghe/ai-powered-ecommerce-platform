"""
Backend Synchronization Service
"""

import asyncio
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import pandas as pd
from .api_client import BackendAPIClient
from ..config.settings import Settings
from ..config.database import DatabaseManager

logger = logging.getLogger(__name__)

class BackendSyncService:
    """Service for synchronizing data with backend"""
    
    def __init__(self, settings: Settings, db_manager: DatabaseManager):
        self.settings = settings
        self.db_manager = db_manager
        self.api_client = BackendAPIClient(settings)
        self.sync_interval = settings.BACKEND_SYNC_INTERVAL
        
    async def sync_all_data(self) -> Dict:
        """Sync all data from backend"""
        try:
            logger.info("Starting full data sync from backend...")
            
            async with self.api_client:
                # Sync users
                users_result = await self._sync_users()
                
                # Sync products
                products_result = await self._sync_products()
                
                # Sync interactions
                interactions_result = await self._sync_interactions()
                
                # Update sync timestamp
                await self.db_manager.update_last_sync_time(datetime.now())
                
                logger.info("Full data sync completed successfully")
                
                return {
                    'status': 'success',
                    'users': users_result,
                    'products': products_result,
                    'interactions': interactions_result,
                    'sync_time': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error in full data sync: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'sync_time': datetime.now().isoformat()
            }
            
    async def sync_incremental_data(self) -> Dict:
        """Sync only new/updated data since last sync"""
        try:
            logger.info("Starting incremental data sync...")
            
            last_sync = await self.db_manager.get_last_sync_time()
            
            if not last_sync:
                return await self.sync_all_data()
                
            async with self.api_client:
                # Sync new interactions
                interactions_result = await self._sync_recent_interactions(last_sync)
                
                # Sync updated products
                products_result = await self._sync_updated_products(last_sync)
                
                # Update sync timestamp
                await self.db_manager.update_last_sync_time(datetime.now())
                
                logger.info("Incremental data sync completed")
                
                return {
                    'status': 'success',
                    'interactions': interactions_result,
                    'products': products_result,
                    'sync_time': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error in incremental sync: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'sync_time': datetime.now().isoformat()
            }
            
    async def _sync_users(self) -> Dict:
        """Sync user data from backend"""
        try:
            users = await self.api_client.get_all_users()
            
            if users:
                # Convert to DataFrame for easier processing
                users_df = pd.DataFrame(users)
                
                # Store in database
                await self.db_manager.store_users(users_df)
                
                logger.info(f"Synced {len(users)} users")
                return {'synced': len(users)}
            else:
                logger.warning("No users received from backend")
                return {'synced': 0}
                
        except Exception as e:
            logger.error(f"Error syncing users: {e}")
            raise
            
    async def _sync_products(self) -> Dict:
        """Sync product data from backend"""
        try:
            products = await self.api_client.get_all_products()
            
            if products:
                # Convert to DataFrame
                products_df = pd.DataFrame(products)
                
                # Store in database
                await self.db_manager.store_products(products_df)
                
                logger.info(f"Synced {len(products)} products")
                return {'synced': len(products)}
            else:
                logger.warning("No products received from backend")
                return {'synced': 0}
                
        except Exception as e:
            logger.error(f"Error syncing products: {e}")
            raise
            
    async def _sync_interactions(self) -> Dict:
        """Sync interaction data from backend"""
        try:
            interactions = await self.api_client.get_all_interactions()
            
            if interactions:
                # Convert to DataFrame
                interactions_df = pd.DataFrame(interactions)
                
                # Store in database
                await self.db_manager.store_interactions(interactions_df)
                
                logger.info(f"Synced {len(interactions)} interactions")
                return {'synced': len(interactions)}
            else:
                logger.warning("No interactions received from backend")
                return {'synced': 0}
                
        except Exception as e:
            logger.error(f"Error syncing interactions: {e}")
            raise
            
    async def _sync_recent_interactions(self, since: datetime) -> Dict:
        """Sync recent interactions since last sync"""
        try:
            days_since = (datetime.now() - since).days + 1
            interactions = await self.api_client.get_all_interactions(days=days_since)
            
            if interactions:
                # Filter interactions newer than last sync
                recent_interactions = [
                    i for i in interactions 
                    if datetime.fromisoformat(i.get('timestamp', '1970-01-01')) > since
                ]
                
                if recent_interactions:
                    interactions_df = pd.DataFrame(recent_interactions)
                    await self.db_manager.store_interactions(interactions_df)
                    
                    logger.info(f"Synced {len(recent_interactions)} recent interactions")
                    return {'synced': len(recent_interactions)}
                    
            return {'synced': 0}
            
        except Exception as e:
            logger.error(f"Error syncing recent interactions: {e}")
            raise
            
    async def _sync_updated_products(self, since: datetime) -> Dict:
        """Sync products updated since last sync"""
        try:
            products = await self.api_client.get_all_products()
            
            if products:
                # Filter products updated since last sync
                updated_products = [
                    p for p in products 
                    if datetime.fromisoformat(p.get('updatedAt', '1970-01-01')) > since
                ]
                
                if updated_products:
                    products_df = pd.DataFrame(updated_products)
                    await self.db_manager.update_products(products_df)
                    
                    logger.info(f"Synced {len(updated_products)} updated products")
                    return {'synced': len(updated_products)}
                else:
                    logger.info("No updated products to sync")
                    return {'synced': 0}
            else:
                logger.info("No products received from backend")
                return {'synced': 0}

        except Exception as e:
            logger.error(f"Error syncing users: {e}")
            raise

    async def _sync_users(self) -> Dict:
        """Sync user data from backend"""
        try:
            users = await self.api_client.get_all_users()

            if users:
                # Convert to DataFrame
                users_df = pd.DataFrame(users)

                # Store in database
                await self.db_manager.store_users(users_df)

                logger.info(f"Synced {len(users)} users")
                return {'synced': len(users)}
            else:
                logger.warning("No users received from backend")
                return {'synced': 0}

        except Exception as e:
            logger.error(f"Error syncing users: {e}")
            raise

    async def _sync_cart(self) -> Dict:
        """Sync cart data from backend"""
        try:
            cart = await self.api_client.get_cart()
            if cart:
                cart_df = pd.DataFrame(cart)
                await self.db_manager.store_cart(cart_df)
                logger.info(f"Synced cart data")
                return {'synced': 1}
            else:
                logger.warning("No cart data received from backend")
                return {'synced': 0}
        except Exception as e:
            logger.error(f"Error syncing cart: {e}")
            raise

    async def _sync_wishlist(self) -> Dict:
        """Sync wishlist data from backend"""
        try:
            wishlist = await self.api_client.get_wishlist()
            if wishlist:
                wishlist_df = pd.DataFrame(wishlist)
                await self.db_manager.store_wishlist(wishlist_df)
                logger.info(f"Synced wishlist data")
                return {'synced': 1}
            else:
                logger.warning("No wishlist data received from backend")
                return {'synced': 0}
        except Exception as e:
            logger.error(f"Error syncing wishlist: {e}")
            raise

    async def _sync_orders(self) -> Dict:
        """Sync order data from backend"""
        try:
            orders = await self.api_client.get_all_orders()
            if orders:
                orders_df = pd.DataFrame(orders)
                await self.db_manager.store_orders(orders_df)
                logger.info(f"Synced {len(orders)} orders")
                return {'synced': len(orders)}
            else:
                logger.warning("No orders received from backend")
                return {'synced': 0}
        except Exception as e:
            logger.error(f"Error syncing orders: {e}")
            raise

    async def _sync_product_recommendations(self) -> Dict:
        """Sync product recommendations from backend"""
        try:
            products = await self.api_client.get_all_products()
            for product in products:
                product_id = product.get('id')
                recommendations = await self.api_client.get_product_recommendations(product_id)
                if recommendations:
                    recommendations_df = pd.DataFrame(recommendations)
                    await self.db_manager.store_product_recommendations(product_id, recommendations_df)
                    logger.info(f"Synced recommendations for product {product_id}")
                else:
                    logger.warning(f"No recommendations found for product {product_id}")
            return {'synced': len(products)}
        except Exception as e:
            logger.error(f"Error syncing product recommendations: {e}")
            raise
