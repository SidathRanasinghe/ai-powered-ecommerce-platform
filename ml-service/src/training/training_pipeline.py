"""
ML Training Pipeline for E-commerce Recommendation System
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
from ..config.database import DatabaseManager
from ..config.settings import Settings
from ..data.preprocessing import DataPreprocessor
from ..algorithms.collaborative_filtering import CollaborativeFilteringEngine
from ..algorithms.content_based_filtering import ContentBasedFilteringEngine
import joblib
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class MLTrainingPipeline:
    """Main training pipeline for ML recommendation models"""
    
    def __init__(self, db_manager: DatabaseManager, settings: Settings):
        self.db_manager = db_manager
        self.settings = settings
        self.preprocessor = DataPreprocessor()
        self.cf_engine = CollaborativeFilteringEngine(settings.MODEL_PATH)
        self.cb_engine = ContentBasedFilteringEngine(settings.MODEL_PATH)
        self.model_path = Path(settings.MODEL_PATH)
        self.model_path.mkdir(parents=True, exist_ok=True)
        
        # Training configuration
        self.min_interactions_per_user = 5
        self.min_interactions_per_item = 10
        self.training_data_days = 365
        self.validation_split = 0.2
        
    async def run_full_training_pipeline(self, force_retrain: bool = False) -> Dict:
        """Run the complete training pipeline"""
        try:
            logger.info("Starting full ML training pipeline...")
            
            # Check if retraining is needed
            if not force_retrain and not await self._should_retrain():
                logger.info("Retraining not needed. Skipping pipeline.")
                return {"status": "skipped", "reason": "retraining_not_needed"}
            
            # Load and preprocess data
            logger.info("Loading and preprocessing data...")
            data = await self._load_training_data()
            
            if not data:
                logger.error("No training data available")
                return {"status": "failed", "reason": "no_training_data"}
            
            # Preprocess data
            processed_data = await self._preprocess_data(data)
            
            # Train models
            training_results = await self._train_models(processed_data)
            
            # Evaluate models
            evaluation_results = await self._evaluate_models(processed_data)
            
            # Save training metadata
            await self._save_training_metadata(training_results, evaluation_results)
            
            # Update model status
            await self._update_model_status("trained", training_results)
            
            logger.info("Full training pipeline completed successfully")
            
            return {
                "status": "success",
                "training_results": training_results,
                "evaluation_results": evaluation_results
            }
        except Exception as e:
            logger.error(f"Error in full training pipeline: {e}", exc_info=True)
            await self._update_model_status("failed", {"error": str(e)})
            return {
                "status": "failed",
                "error": str(e)
            }
    
    async def _should_retrain(self) -> bool:
        """Check if retraining is needed based on new data"""
        try:
            # Get the latest interaction timestamp
            latest_interaction = await self.db_manager.get_latest_interaction_timestamp()
            if not latest_interaction:
                return False
            
            # Check if enough time has passed since last training
            last_training_time = await self.db_manager.get_last_training_time()
            if not last_training_time:
                return True
            
            time_since_last_training = datetime.now() - last_training_time
            if time_since_last_training > timedelta(days=self.settings.AUTO_RETRAIN_THRESHOLD):
                return True
            
            # Check if new interactions exceed threshold
            new_interactions_count = await self.db_manager.get_new_interactions_count(
                since=last_training_time
            )
            return new_interactions_count >= self.settings.AUTO_RETRAIN_THRESHOLD
        
        except Exception as e:
            logger.error(f"Error checking retraining condition: {e}", exc_info=True)
            return False
    
    async def _load_training_data(self) -> pd.DataFrame:
        """Load training data from the database"""
        try:
            # Fetch interactions data
            interactions = await self.db_manager.get_interactions(
                days=self.training_data_days,
                min_interactions_per_user=self.min_interactions_per_user,
                min_interactions_per_item=self.min_interactions_per_item
            )
            
            if interactions.empty:
                logger.warning("No interactions data found for training")
                return pd.DataFrame()
            
            return interactions
        
        except Exception as e:
            logger.error(f"Error loading training data: {e}", exc_info=True)
            return pd.DataFrame()
    
    async def _preprocess_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """Preprocess the training data"""
        try:
            logger.info("Preprocessing data...")
            processed_data = self.preprocessor.preprocess(data)
            
            if processed_data.empty:
                logger.warning("Preprocessed data is empty")
                return pd.DataFrame()
            
            return processed_data
        
        except Exception as e:
            logger.error(f"Error preprocessing data: {e}", exc_info=True)
            return pd.DataFrame()
    
    async def _train_models(self, data: pd.DataFrame) -> Dict:
        """Train collaborative and content-based models"""
        try:
            logger.info("Training collaborative filtering model...")
            cf_model = self.cf_engine.train(data)
            cf_model_path = self.model_path / "collaborative_filtering_model.pkl"
            joblib.dump(cf_model, cf_model_path)
            
            logger.info("Training content-based filtering model...")
            cb_model = self.cb_engine.train(data)
            cb_model_path = self.model_path / "content_based_filtering_model.pkl"
            joblib.dump(cb_model, cb_model_path)
            
            return {
                "cf_model_path": str(cf_model_path),
                "cb_model_path": str(cb_model_path)
            }
        
        except Exception as e:
            logger.error(f"Error training models: {e}", exc_info=True)
            return {"error": str(e)}
    
    async def _evaluate_models(self, data: pd.DataFrame) -> Dict:
        """Evaluate the trained models"""
        try:
            logger.info("Evaluating collaborative filtering model...")
            cf_metrics = self.cf_engine.evaluate(data)
            
            logger.info("Evaluating content-based filtering model...")
            cb_metrics = self.cb_engine.evaluate(data)
            
            return {
                "cf_metrics": cf_metrics,
                "cb_metrics": cb_metrics
            }
        
        except Exception as e:
            logger.error(f"Error evaluating models: {e}", exc_info=True)
            return {"error": str(e)}
    
    async def _save_training_metadata(self, training_results: Dict, evaluation_results: Dict):
        """Save training metadata to the database"""
        try:
            metadata = {
                "training_time": datetime.now(),
                "training_results": training_results,
                "evaluation_results": evaluation_results
            }
            await self.db_manager.save_training_metadata(metadata)
            logger.info("Training metadata saved successfully")
        
        except Exception as e:
            logger.error(f"Error saving training metadata: {e}", exc_info=True)
            raise e
    
    async def _update_model_status(self, status: str, details: Dict):
        """Update the model status in the database"""
        try:
            await self.db_manager.update_model_status(
                status=status,
                details=details,
                last_trained=datetime.now()
            )
            logger.info(f"Model status updated to '{status}'")
        
        except Exception as e:
            logger.error(f"Error updating model status: {e}", exc_info=True)
            raise e
        
async def main():
    # Example usage of the MLTrainingPipeline
    db_manager = DatabaseManager()
    settings = Settings()
    
    training_pipeline = MLTrainingPipeline(db_manager, settings)
    
    # Run the full training pipeline
    result = await training_pipeline.run_full_training_pipeline(force_retrain=True)
    
    print(result)
if __name__ == "__main__":
    asyncio.run(main())
else:
    logger.info("ML Training Pipeline module loaded")
    # This allows the module to be imported without executing the main function
    # when used in other parts of the application.
    