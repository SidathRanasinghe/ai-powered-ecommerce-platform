"""
Core recommendation engine with collaborative filtering and content-based filtering
"""

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import StandardScaler
import joblib
import os
from typing import List, Dict, Optional, Tuple
import logging
from datetime import datetime, timedelta
from collections import defaultdict
import asyncio

from ..config.settings import Settings
from ..config.database import DatabaseManager

logger = logging.getLogger(__name__)

class RecommendationEngine:
    """Main recommendation engine class"""
    
    def __init__(self, db_manager: DatabaseManager, settings: Settings):
        self.db_manager = db_manager
        self.settings = settings
        
        # Models
        self.collaborative_model = None
        self.content_vectorizer = None
        self.content_similarity_matrix = None
        self.product_features_df = None
        self.user_item_matrix = None
        self.item_features_matrix = None
        
        # Scalers
        self.scaler = StandardScaler()
        
        # Model paths
        self.model_dir = self.settings.MODEL_SAVE_PATH
        os.makedirs(self.model_dir, exist_ok=True)
        
        # Training status
        self.is_trained = False
        self.last_training_time = None
        self.training_data_size = 0
        
    async def initialize(self):
        """Initialize the recommendation engine"""
        logger.info("Initializing recommendation engine...")
        
        # Try to load existing models
        await self._load_models()
        
        # Check if we need to train models
        if not self.is_trained:
            logger.info("No trained models found. Starting initial training...")
            await self.train_models()
        
        logger.info("Recommendation engine initialized successfully")
    
    async def train_models(self, force_retrain: bool = False):
        """Train all recommendation models"""
        logger.info("Starting model training...")
        
        try:
            # Get training data
            interactions = await self.db_manager.get_all_interactions()
            products = await self.db_manager.get_all_products()
            
            if len(interactions) < self.settings.MIN_INTERACTIONS_FOR_TRAINING:
                logger.warning(f"Not enough interactions for training. "
                             f"Need at least {self.settings.MIN_INTERACTIONS_FOR_TRAINING}, "
                             f"got {len(interactions)}")
                return False
            
            # Train collaborative filtering model
            await self._train_collaborative_filtering(interactions)
            
            # Train content-based filtering model
            await self._train_content_based_filtering(products)
            
            # Save models
            await self._save_models()
            
            # Update training status
            self.is_trained = True
            self.last_training_time = datetime.utcnow()
            self.training_data_size = len(interactions)
            
            # Save metadata
            await self._save_training_metadata()
            
            logger.info("Model training completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error during model training: {str(e)}")
            return False
    
    async def _train_collaborative_filtering(self, interactions: List[Dict]):
        """Train collaborative filtering model"""
        logger.info("Training collaborative filtering model...")
        
        try:
            # Convert interactions to DataFrame
            df = pd.DataFrame(interactions)
            
            # Create user-item interaction matrix
            interaction_weights = {
                'view': 1.0,
                'click': 1.5,
                'add_to_cart': 2.0,
                'like': 2.5,
                'purchase': 5.0,
                'review': 3.0
            }
            
            # Add weights to interactions
            df['weight'] = df['interaction_type'].map(interaction_weights).fillna(1.0)
            
            # Create pivot table
            user_item_matrix = df.pivot_table(
                index='user_id',
                columns='product_id',
                values='weight',
                aggfunc='sum',
                fill_value=0
            )
            
            self.user_item_matrix = user_item_matrix
            
            # Apply matrix factorization using SVD
            svd = TruncatedSVD(
                n_components=min(self.settings.COLLABORATIVE_FILTERING_FACTORS, 
                               min(user_item_matrix.shape) - 1),
                random_state=42
            )
            
            # Fit the model
            user_factors = svd.fit_transform(user_item_matrix)
            item_factors = svd.components_
            
            self.collaborative_model = {
                'svd': svd,
                'user_factors': user_factors,
                'item_factors': item_factors,
                'user_index': user_item_matrix.index.tolist(),
                'item_index': user_item_matrix.columns.tolist()
            }
            
            logger.info("Collaborative filtering model trained successfully")
            
        except Exception as e:
            logger.error(f"Error training collaborative filtering: {str(e)}")
            raise
    
    async def _train_content_based_filtering(self, products: List[Dict]):
        """Train content-based filtering model"""
        logger.info("Training content-based filtering model...")
        
        try:
            # Convert products to DataFrame
            df = pd.DataFrame(products)
            
            # Create text features
            text_features = []
            for _, product in df.iterrows():
                features = []
                
                # Add category
                if 'category' in product and product['category']:
                    features.append(str(product['category']))
                
                # Add brand
                if 'brand' in product and product['brand']:
                    features.append(str(product['brand']))
                
                # Add description
                if 'description' in product and product['description']:
                    features.append(str(product['description']))
                
                # Add tags
                if 'tags' in product and product['tags']:
                    if isinstance(product['tags'], list):
                        features.extend([str(tag) for tag in product['tags']])
                    else:
                        features.append(str(product['tags']))
                
                text_features.append(' '.join(features))
            
            # Create TF-IDF vectors
            self.content_vectorizer = TfidfVectorizer(
                max_features=5000,
                stop_words='english',
                lowercase=True,
                ngram_range=(1, 2)
            )
            
            tfidf_matrix = self.content_vectorizer.fit_transform(text_features)
            
            # Calculate cosine similarity
            self.content_similarity_matrix = cosine_similarity(tfidf_matrix)
            
            # Store product features
            self.product_features_df = df
            
            logger.info("Content-based filtering model trained successfully")
            
        except Exception as e:
            logger.error(f"Error training content-based filtering: {str(e)}")
            raise
    
    async def get_collaborative_recommendations(self, user_id: str, 
                                             num_recommendations: int = 10) -> List[Dict]:
        """Get recommendations using collaborative filtering"""
        if not self.collaborative_model:
            return []
        
        try:
            user_index = self.collaborative_model['user_index']
            item_index = self.collaborative_model['item_index']
            
            if user_id not in user_index:
                return []
            
            user_idx = user_index.index(user_id)
            user_factors = self.collaborative_model['user_factors']
            item_factors = self.collaborative_model['item_factors']
            
            # Calculate scores for all items
            user_vector = user_factors[user_idx]
            scores = np.dot(user_vector, item_factors)
            
            # Get top recommendations
            top_indices = np.argsort(scores)[::-1][:num_recommendations * 2]
            
            recommendations = []
            for idx in top_indices:
                if len(recommendations) >= num_recommendations:
                    break
                
                product_id = item_index[idx]
                score = scores[idx]
                
                # Skip if user already interacted with this product
                if self.user_item_matrix.loc[user_id, product_id] > 0:
                    continue
                
                recommendations.append({
                    'product_id': product_id,
                    'score': float(score),
                    'algorithm': 'collaborative'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting collaborative recommendations: {str(e)}")
            return []
    
    async def get_content_based_recommendations(self, user_id: str, 
                                             num_recommendations: int = 10) -> List[Dict]:
        """Get recommendations using content-based filtering"""
        if self.content_similarity_matrix is None or self.product_features_df is None:
            return []
        
        try:
            # Get user's interaction history
            user_interactions = await self.db_manager.get_user_interactions(user_id)
            
            if not user_interactions:
                return []
            
            # Get products user interacted with
            interacted_products = [interaction['product_id'] for interaction in user_interactions]
            
            # Calculate similarity scores
            similarity_scores = defaultdict(float)
            
            for product_id in interacted_products:
                if product_id in self.product_features_df['_id'].values:
                    product_idx = self.product_features_df[
                        self.product_features_df['_id'] == product_id
                    ].index[0]
                    
                    # Get similarity scores for this product
                    sim_scores = self.content_similarity_matrix[product_idx]
                    
                    # Add to overall similarity scores
                    for idx, score in enumerate(sim_scores):
                        target_product_id = self.product_features_df.iloc[idx]['_id']
                        if target_product_id not in interacted_products:
                            similarity_scores[target_product_id] += score
            
            # Sort by similarity score
            sorted_products = sorted(
                similarity_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            recommendations = []
            for product_id, score in sorted_products[:num_recommendations]:
                if score > self.settings.CONTENT_SIMILARITY_THRESHOLD:
                    recommendations.append({
                        'product_id': product_id,
                        'score': float(score),
                        'algorithm': 'content_based'
                    })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting content-based recommendations: {str(e)}")
            return []
    
    async def get_hybrid_recommendations(self, user_id: str, 
                                       num_recommendations: int = 10) -> List[Dict]:
        """Get recommendations using hybrid approach"""
        try:
            # Get recommendations from both algorithms
            collaborative_recs = await self.get_collaborative_recommendations(
                user_id, num_recommendations
            )
            content_recs = await self.get_content_based_recommendations(
                user_id, num_recommendations
            )
            
            # Combine recommendations
            combined_scores = defaultdict(float)
            
            # Weight collaborative filtering more heavily
            collaborative_weight = 0.7
            content_weight = 0.3
            
            for rec in collaborative_recs:
                combined_scores[rec['product_id']] += rec['score'] * collaborative_weight
            
            for rec in content_recs:
                combined_scores[rec['product_id']] += rec['score'] * content_weight
            
            # Sort by combined score
            sorted_recommendations = sorted(
                combined_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            recommendations = []
            for product_id, score in sorted_recommendations[:num_recommendations]:
                recommendations.append({
                    'product_id': product_id,
                    'score': float(score),
                    'algorithm': 'hybrid'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting hybrid recommendations: {str(e)}")
            return []
    
    async def get_similar_products(self, product_id: str, 
                                 num_recommendations: int = 10) -> List[Dict]:
        """Get products similar to a given product"""
        if self.content_similarity_matrix is None or self.product_features_df is None:
            return []
        
        try:
            # Find product index
            product_row = self.product_features_df[
                self.product_features_df['_id'] == product_id
            ]
            
            if product_row.empty:
                return []
            
            product_idx = product_row.index[0]
            
            # Get similarity scores
            sim_scores = self.content_similarity_matrix[product_idx]
            
            # Get top similar products
            similar_indices = np.argsort(sim_scores)[::-1][1:num_recommendations + 1]
            
            recommendations = []
            for idx in similar_indices:
                similar_product_id = self.product_features_df.iloc[idx]['_id']
                score = sim_scores[idx]
                
                if score > self.settings.CONTENT_SIMILARITY_THRESHOLD:
                    recommendations.append({
                        'product_id': similar_product_id,
                        'score': float(score),
                        'algorithm': 'content_based'
                    })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting similar products: {str(e)}")
            return []
    
    async def _save_models(self):
        """Save trained models to disk"""
        try:
            # Save collaborative filtering model
            if self.collaborative_model:
                joblib.dump(
                    self.collaborative_model,
                    os.path.join(self.model_dir, 'collaborative_model.pkl')
                )
            
            # Save content-based model components
            if self.content_vectorizer:
                joblib.dump(
                    self.content_vectorizer,
                    os.path.join(self.model_dir, 'content_vectorizer.pkl')
                )
            
            if self.content_similarity_matrix is not None:
                np.save(
                    os.path.join(self.model_dir, 'content_similarity_matrix.npy'),
                    self.content_similarity_matrix
                )
            
            if self.product_features_df is not None:
                self.product_features_df.to_pickle(
                    os.path.join(self.model_dir, 'product_features_df.pkl')
                )
            
            logger.info("Models saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving models: {str(e)}")
            raise
    
    async def _load_models(self):
        """Load trained models from disk"""
        try:
            # Load collaborative filtering model
            collaborative_path = os.path.join(self.model_dir, 'collaborative_model.pkl')
            if os.path.exists(collaborative_path):
                self.collaborative_model = joblib.load(collaborative_path)
            
            # Load content-based model components
            vectorizer_path = os.path.join(self.model_dir, 'content_vectorizer.pkl')
            if os.path.exists(vectorizer_path):
                self.content_vectorizer = joblib.load(vectorizer_path)
            
            similarity_path = os.path.join(self.model_dir, 'content_similarity_matrix.npy')
            if os.path.exists(similarity_path):
                self.content_similarity_matrix = np.load(similarity_path)
            
            features_path = os.path.join(self.model_dir, 'product_features_df.pkl')
            if os.path.exists(features_path):
                self.product_features_df = pd.read_pickle(features_path)
            
            # Check if models are loaded
            if (self.collaborative_model is not None and 
                self.content_vectorizer is not None and
                self.content_similarity_matrix is not None):
                self.is_trained = True
                logger.info("Models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
    
    async def _save_training_metadata(self):
        """Save training metadata to database"""
        metadata = {
            'model_name': 'recommendation_engine',
            'is_trained': self.is_trained,
            'last_training_time': self.last_training_time,
            'training_data_size': self.training_data_size,
            'settings': {
                'collaborative_factors': self.settings.COLLABORATIVE_FILTERING_FACTORS,
                'min_interactions': self.settings.MIN_INTERACTIONS_FOR_TRAINING
            }
        }
        
        await self.db_manager.save_model_metadata('recommendation_engine', metadata)