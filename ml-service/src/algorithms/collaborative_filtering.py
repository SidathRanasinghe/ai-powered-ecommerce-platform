"""
Collaborative Filtering Algorithms for Product Recommendations
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import logging
from surprise import Dataset, Reader, SVD, NMF, KNNBasic, accuracy
from surprise.model_selection import cross_validate, GridSearchCV
import joblib
import os

logger = logging.getLogger(__name__)

class CollaborativeFilteringEngine:
    """Collaborative filtering recommendation engine"""
    
    def __init__(self, model_path: str = "models/"):
        self.model_path = model_path
        self.user_based_model = None
        self.item_based_model = None
        self.matrix_factorization_model = None
        self.user_item_matrix = None
        self.user_similarity_matrix = None
        self.item_similarity_matrix = None
        self.user_ids = None
        self.item_ids = None
        
        # Ensure model directory exists
        os.makedirs(model_path, exist_ok=True)
    
    def train_user_based_cf(self, user_item_matrix: pd.DataFrame, k: int = 50) -> None:
        """Train user-based collaborative filtering model"""
        try:
            logger.info("Training user-based collaborative filtering model...")
            
            self.user_item_matrix = user_item_matrix
            self.user_ids = user_item_matrix.index.tolist()
            self.item_ids = user_item_matrix.columns.tolist()
            
            # Calculate user similarity matrix
            user_matrix = user_item_matrix.values
            self.user_similarity_matrix = cosine_similarity(user_matrix)
            
            # Create user-based KNN model using Surprise
            reader = Reader(rating_scale=(0, 5))
            data = self._prepare_surprise_data(user_item_matrix)
            dataset = Dataset.load_from_df(data, reader)
            
            # Configure KNN parameters
            sim_options = {
                'name': 'cosine',
                'user_based': True
            }
            
            self.user_based_model = KNNBasic(k=k, sim_options=sim_options)
            
            # Train the model
            trainset = dataset.build_full_trainset()
            self.user_based_model.fit(trainset)
            
            # Save model
            self._save_model(self.user_based_model, "user_based_cf.pkl")
            
            logger.info("User-based CF model trained successfully")
            
        except Exception as e:
            logger.error(f"Error training user-based CF model: {str(e)}")
            raise
    
    def train_item_based_cf(self, user_item_matrix: pd.DataFrame, k: int = 50) -> None:
        """Train item-based collaborative filtering model"""
        try:
            logger.info("Training item-based collaborative filtering model...")
            
            self.user_item_matrix = user_item_matrix
            self.user_ids = user_item_matrix.index.tolist()
            self.item_ids = user_item_matrix.columns.tolist()
            
            # Calculate item similarity matrix
            item_matrix = user_item_matrix.T.values
            self.item_similarity_matrix = cosine_similarity(item_matrix)
            
            # Create item-based KNN model using Surprise
            reader = Reader(rating_scale=(0, 5))
            data = self._prepare_surprise_data(user_item_matrix)
            dataset = Dataset.load_from_df(data, reader)
            
            # Configure KNN parameters
            sim_options = {
                'name': 'cosine',
                'user_based': False
            }
            
            self.item_based_model = KNNBasic(k=k, sim_options=sim_options)
            
            # Train the model
            trainset = dataset.build_full_trainset()
            self.item_based_model.fit(trainset)
            
            # Save model
            self._save_model(self.item_based_model, "item_based_cf.pkl")
            
            logger.info("Item-based CF model trained successfully")
            
        except Exception as e:
            logger.error(f"Error training item-based CF model: {str(e)}")
            raise
    
    def train_matrix_factorization(self, user_item_matrix: pd.DataFrame, 
                                 algorithm: str = 'SVD') -> None:
        """Train matrix factorization model"""
        try:
            logger.info(f"Training matrix factorization model ({algorithm})...")
            
            # Prepare data for Surprise
            reader = Reader(rating_scale=(0, 5))
            data = self._prepare_surprise_data(user_item_matrix)
            dataset = Dataset.load_from_df(data, reader)
            
            # Choose algorithm
            if algorithm == 'SVD':
                self.matrix_factorization_model = SVD(
                    n_factors=100,
                    n_epochs=20,
                    lr_all=0.005,
                    reg_all=0.02
                )
            elif algorithm == 'NMF':
                self.matrix_factorization_model = NMF(
                    n_factors=50,
                    n_epochs=50
                )
            else:
                raise ValueError(f"Unsupported algorithm: {algorithm}")
            
            # Train the model
            trainset = dataset.build_full_trainset()
            self.matrix_factorization_model.fit(trainset)
            
            # Save model
            self._save_model(self.matrix_factorization_model, f"matrix_factorization_{algorithm.lower()}.pkl")
            
            logger.info(f"Matrix factorization model ({algorithm}) trained successfully")
            
        except Exception as e:
            logger.error(f"Error training matrix factorization model: {str(e)}")
            raise
    
    def get_user_recommendations(self, user_id: str, n_recommendations: int = 10,
                               method: str = 'hybrid') -> List[Dict]:
        """Get recommendations for a user"""
        try:
            recommendations = []
            
            if method == 'user_based' and self.user_based_model:
                recommendations = self._get_user_based_recommendations(
                    user_id, n_recommendations
                )
            elif method == 'item_based' and self.item_based_model:
                recommendations = self._get_item_based_recommendations(
                    user_id, n_recommendations
                )
            elif method == 'matrix_factorization' and self.matrix_factorization_model:
                recommendations = self._get_matrix_factorization_recommendations(
                    user_id, n_recommendations
                )
            elif method == 'hybrid':
                recommendations = self._get_hybrid_recommendations(
                    user_id, n_recommendations
                )
            else:
                logger.warning(f"Method {method} not available or model not trained")
                return []
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting recommendations for user {user_id}: {str(e)}")
            return []
    
    def _get_user_based_recommendations(self, user_id: str, n_recommendations: int) -> List[Dict]:
        """Get user-based collaborative filtering recommendations"""
        try:
            if user_id not in self.user_ids:
                return []
            
            user_idx = self.user_ids.index(user_id)
            user_similarities = self.user_similarity_matrix[user_idx]
            
            # Get user's rated items
            user_ratings = self.user_item_matrix.loc[user_id]
            unrated_items = user_ratings[user_ratings == 0].index.tolist()
            
            # Calculate predicted ratings for unrated items
            predictions = []
            for item_id in unrated_items:
                pred_rating = self.user_based_model.predict(user_id, item_id).est
                predictions.append({
                    'product_id': item_id,
                    'predicted_rating': pred_rating,
                    'confidence': min(pred_rating / 5.0, 1.0)
                })
            
            # Sort by predicted rating and return top N
            predictions.sort(key=lambda x: x['predicted_rating'], reverse=True)
            return predictions[:n_recommendations]
            
        except Exception as e:
            logger.error(f"Error in user-based recommendations: {str(e)}")
            return []
    
    def _get_item_based_recommendations(self, user_id: str, n_recommendations: int) -> List[Dict]:
        """Get item-based collaborative filtering recommendations"""
        try:
            if user_id not in self.user_ids:
                return []
            
            # Get user's rated items
            user_ratings = self.user_item_matrix.loc[user_id]
            rated_items = user_ratings[user_ratings > 0].index.tolist()
            unrated_items = user_ratings[user_ratings == 0].index.tolist()
            
            # Calculate predicted ratings for unrated items
            predictions = []
            for item_id in unrated_items:
                pred_rating = self.item_based_model.predict(user_id, item_id).est
                predictions.append({
                    'product_id': item_id,
                    'predicted_rating': pred_rating,
                    'confidence': min(pred_rating / 5.0, 1.0)
                })
            
            # Sort by predicted rating and return top N
            predictions.sort(key=lambda x: x['predicted_rating'], reverse=True)
            return predictions[:n_recommendations]
            
        except Exception as e:
            logger.error(f"Error in item-based recommendations: {str(e)}")
            return []
    
    def _get_matrix_factorization_recommendations(self, user_id: str, n_recommendations: int) -> List[Dict]:
        """Get matrix factorization recommendations"""
        try:
            if user_id not in self.user_ids:
                return []
            
            # Get user's rated items
            user_ratings = self.user_item_matrix.loc[user_id]
            unrated_items = user_ratings[user_ratings == 0].index.tolist()
            
            # Calculate predicted ratings for unrated items
            predictions = []
            for item_id in unrated_items:
                pred_rating = self.matrix_factorization_model.predict(user_id, item_id).est
                predictions.append({
                    'product_id': item_id,
                    'predicted_rating': pred_rating,
                    'confidence': min(pred_rating / 5.0, 1.0)
                })
            
            # Sort by predicted rating and return top N
            predictions.sort(key=lambda x: x['predicted_rating'], reverse=True)
            return predictions[:n_recommendations]
            
        except Exception as e:
            logger.error(f"Error in matrix factorization recommendations: {str(e)}")
            return []
    
    def _get_hybrid_recommendations(self, user_id: str, n_recommendations: int) -> List[Dict]:
        """Get hybrid recommendations combining multiple methods"""
        try:
            all_recommendations = {}
            
            # Get recommendations from different methods
            if self.user_based_model:
                user_based_recs = self._get_user_based_recommendations(
                    user_id, n_recommendations * 2
                )
                for rec in user_based_recs:
                    prod_id = rec['product_id']
                    if prod_id not in all_recommendations:
                        all_recommendations[prod_id] = {
                            'product_id': prod_id,
                            'scores': [],
                            'methods': []
                        }
                    all_recommendations[prod_id]['scores'].append(rec['predicted_rating'])
                    all_recommendations[prod_id]['methods'].append('user_based')
            
            if self.item_based_model:
                item_based_recs = self._get_item_based_recommendations(
                    user_id, n_recommendations * 2
                )
                for rec in item_based_recs:
                    prod_id = rec['product_id']
                    if prod_id not in all_recommendations:
                        all_recommendations[prod_id] = {
                            'product_id': prod_id,
                            'scores': [],
                            'methods': []
                        }
                    all_recommendations[prod_id]['scores'].append(rec['predicted_rating'])
                    all_recommendations[prod_id]['methods'].append('item_based')
            
            if self.matrix_factorization_model:
                mf_recs = self._get_matrix_factorization_recommendations(
                    user_id, n_recommendations * 2
                )
                for rec in mf_recs:
                    prod_id = rec['product_id']
                    if prod_id not in all_recommendations:
                        all_recommendations[prod_id] = {
                            'product_id': prod_id,
                            'scores': [],
                            'methods': []
                        }
                    all_recommendations[prod_id]['scores'].append(rec['predicted_rating'])
                    all_recommendations[prod_id]['methods'].append('matrix_factorization')
            
            # Calculate hybrid scores
            hybrid_recommendations = []
            for prod_id, data in all_recommendations.items():
                # Average the scores from different methods
                avg_score = np.mean(data['scores'])
                # Boost score if recommended by multiple methods
                method_boost = len(data['methods']) * 0.1
                final_score = avg_score + method_boost
                
                hybrid_recommendations.append({
                    'product_id': prod_id,
                    'predicted_rating': final_score,
                    'confidence': min(final_score / 5.0, 1.0),
                    'methods_used': data['methods']
                })
            
            # Sort by final score and return top N
            hybrid_recommendations.sort(key=lambda x: x['predicted_rating'], reverse=True)
            return hybrid_recommendations[:n_recommendations]
            
        except Exception as e:
            logger.error(f"Error in hybrid recommendations: {str(e)}")
            return []
    
    def get_similar_users(self, user_id: str, n_similar: int = 10) -> List[Dict]:
        """Get similar users for a given user"""
        try:
            if user_id not in self.user_ids or self.user_similarity_matrix is None:
                return []
            
            user_idx = self.user_ids.index(user_id)
            similarities = self.user_similarity_matrix[user_idx]
            
            # Get indices of most similar users (excluding the user itself)
            similar_indices = np.argsort(similarities)[::-1][1:n_similar + 1]
            
            similar_users = []
            for idx in similar_indices:
                similar_users.append({
                    'user_id': self.user_ids[idx],
                    'similarity_score': similarities[idx]
                })
            
            return similar_users
            
        except Exception as e:
            logger.error(f"Error getting similar users: {str(e)}")
            return []
    
    def get_similar_items(self, item_id: str, n_similar: int = 10) -> List[Dict]:
        """Get similar items for a given item"""
        try:
            if item_id not in self.item_ids or self.item_similarity_matrix is None:
                return []
            
            item_idx = self.item_ids.index(item_id)
            similarities = self.item_similarity_matrix[item_idx]
            
            # Get indices of most similar items (excluding the item itself)
            similar_indices = np.argsort(similarities)[::-1][1:n_similar + 1]
            
            similar_items = []
            for idx in similar_indices:
                similar_items.append({
                    'product_id': self.item_ids[idx],
                    'similarity_score': similarities[idx]
                })
            
            return similar_items
            
        except Exception as e:
            logger.error(f"Error getting similar items: {str(e)}")
            return []
    
    def evaluate_model(self, user_item_matrix: pd.DataFrame, test_size: float = 0.2) -> Dict:
        """Evaluate the collaborative filtering models"""
        try:
            # Prepare data for evaluation
            reader = Reader(rating_scale=(0, 5))
            data = self._prepare_surprise_data(user_item_matrix)
            dataset = Dataset.load_from_df(data, reader)
            
            results = {}
            
            # Evaluate each model if available
            if self.user_based_model:
                cv_results = cross_validate(self.user_based_model, dataset, measures=['RMSE', 'MAE'], cv=5)
                results['user_based'] = {
                    'rmse': np.mean(cv_results['test_rmse']),
                    'mae': np.mean(cv_results['test_mae'])
                }
            
            if self.item_based_model:
                cv_results = cross_validate(self.item_based_model, dataset, measures=['RMSE', 'MAE'], cv=5)
                results['item_based'] = {
                    'rmse': np.mean(cv_results['test_rmse']),
                    'mae': np.mean(cv_results['test_mae'])
                }
            
            if self.matrix_factorization_model:
                cv_results = cross_validate(self.matrix_factorization_model, dataset, measures=['RMSE', 'MAE'], cv=5)
                results['matrix_factorization'] = {
                    'rmse': np.mean(cv_results['test_rmse']),
                    'mae': np.mean(cv_results['test_mae'])
                }
            
            return results
            
        except Exception as e:
            logger.error(f"Error evaluating models: {str(e)}")
            return {}
    
    def tune_hyperparameters(self, user_item_matrix: pd.DataFrame, algorithm: str = 'SVD') -> Dict:
        """Tune hyperparameters for the specified algorithm"""
        try:
            logger.info(f"Tuning hyperparameters for {algorithm}...")
            
            # Prepare data
            reader = Reader(rating_scale=(0, 5))
            data = self._prepare_surprise_data(user_item_matrix)
            dataset = Dataset.load_from_df(data, reader)
            
            if algorithm == 'SVD':
                param_grid = {
                    'n_factors': [50, 100, 150],
                    'n_epochs': [20, 30, 40],
                    'lr_all': [0.002, 0.005, 0.01],
                    'reg_all': [0.02, 0.05, 0.1]
                }
                gs = GridSearchCV(SVD, param_grid, measures=['rmse'], cv=3)
                
            elif algorithm == 'NMF':
                param_grid = {
                    'n_factors': [25, 50, 75],
                    'n_epochs': [30, 50, 70]
                }
                gs = GridSearchCV(NMF, param_grid, measures=['rmse'], cv=3)
                
            else:
                raise ValueError(f"Hyperparameter tuning not supported for {algorithm}")
            
            gs.fit(dataset)
            
            best_params = gs.best_params['rmse']
            best_score = gs.best_score['rmse']
            
            logger.info(f"Best parameters for {algorithm}: {best_params}")
            logger.info(f"Best RMSE score: {best_score}")
            
            return {
                'best_params': best_params,
                'best_score': best_score,
                'algorithm': algorithm
            }
            
        except Exception as e:
            logger.error(f"Error tuning hyperparameters: {str(e)}")
            return {}
    
    def _prepare_surprise_data(self, user_item_matrix: pd.DataFrame) -> pd.DataFrame:
        """Prepare data for Surprise library"""
        data = []
        for user_id in user_item_matrix.index:
            for item_id in user_item_matrix.columns:
                rating = user_item_matrix.loc[user_id, item_id]
                if rating > 0:  # Only include non-zero ratings
                    data.append([user_id, item_id, rating])
        
        return pd.DataFrame(data, columns=['user_id', 'item_id', 'rating'])
    
    def _save_model(self, model, filename: str) -> None:
        """Save trained model to disk"""
        try:
            filepath = os.path.join(self.model_path, filename)
            joblib.dump(model, filepath)
            logger.info(f"Model saved to {filepath}")
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
    
    def _load_model(self, filename: str):
        """Load trained model from disk"""
        try:
            filepath = os.path.join(self.model_path, filename)
            if os.path.exists(filepath):
                model = joblib.load(filepath)
                logger.info(f"Model loaded from {filepath}")
                return model
            else:
                logger.warning(f"Model file not found: {filepath}")
                return None
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            return None
    
    def load_models(self) -> None:
        """Load all trained models"""
        try:
            self.user_based_model = self._load_model("user_based_cf.pkl")
            self.item_based_model = self._load_model("item_based_cf.pkl")
            self.matrix_factorization_model = self._load_model("matrix_factorization_svd.pkl")
            
            if not self.matrix_factorization_model:
                self.matrix_factorization_model = self._load_model("matrix_factorization_nmf.pkl")
            
            logger.info("Models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
    
    def get_model_info(self) -> Dict:
        """Get information about loaded models"""
        return {
            'user_based_model': self.user_based_model is not None,
            'item_based_model': self.item_based_model is not None,
            'matrix_factorization_model': self.matrix_factorization_model is not None,
            'user_item_matrix_shape': self.user_item_matrix.shape if self.user_item_matrix is not None else None,
            'num_users': len(self.user_ids) if self.user_ids else 0,
            'num_items': len(self.item_ids) if self.item_ids else 0
        }