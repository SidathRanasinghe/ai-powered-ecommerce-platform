import asyncio
import logging
from src.services.recommendation_service import RecommendationService
from src.config.database import DatabaseManager
from src.config.settings import Settings

logger = logging.getLogger(__name__)

async def train_models_periodically(interval_hours: int = 24):
    """Periodically retrain recommendation models"""
    settings = Settings()
    db_manager = DatabaseManager(settings)
    service = RecommendationService(db_manager=db_manager)
    
    while True:
        try:
            logger.info("Starting periodic model retraining...")
            await service.retrain_models(force=False)
            logger.info("Periodic model retraining completed")
        except Exception as e:
            logger.error(f"Error during periodic training: {str(e)}")
        
        await asyncio.sleep(interval_hours * 3600)