import logging
from typing import Dict, List
import pandas as pd
from pymongo import MongoClient
from src.config.settings import Settings

logger = logging.getLogger(__name__)

class DataLoader:
    def __init__(self, db_client: MongoClient):
        self.db = db_client.get_database()

    def load_user_item_interactions(self) -> pd.DataFrame:
        """Load user-item interactions from MongoDB"""
        try:
            interactions = list(self.db.user_interactions.find(
                {},
                {'user_id': 1, 'product_id': 1, 'rating': 1, '_id': 0}
            ))
            return pd.DataFrame(interactions)
        except Exception as e:
            logger.error(f"Error loading interactions: {str(e)}")
            raise

    def load_product_features(self) -> List[Dict]:
        """Load product features for content-based filtering"""
        try:
            products = list(self.db.products.find(
                {},
                {
                    'product_id': 1,
                    'title': 1,
                    'description': 1,
                    'category': 1,
                    'price': 1,
                    'rating': 1,
                    '_id': 0
                }
            ))
            return products
        except Exception as e:
            logger.error(f"Error loading products: {str(e)}")
            raise