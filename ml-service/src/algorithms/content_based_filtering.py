"""
Content-Based Filtering Algorithm for Product Recommendations
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.decomposition import PCA
import logging
import joblib
import os

logger = logging.getLogger(__name__)

class ContentBasedFilteringEngine:
    """Content-based filtering recommendation engine"""
    
    def __init__(self, model_path: str = "models/"):
        self.model_path = model_path
        self.tfidf_vectorizer = None
        self.scaler = StandardScaler()
        self.pca = None
        self.product_features = None
        self.product_ids = None
        self.similarity_matrix = None
        self.feature_weights = {
            'text': 0.4,
            'category': 0.3,
            'price': 0.15,
            'rating': 0.15
        }
        
        # Ensure model directory exists
        os.makedirs(model_path, exist_ok=True)
    
    def train(self, products_df: pd.DataFrame, user_interactions_df: pd.DataFrame = None) -> None:
        """Train the content-based filtering model"""
        try:
            logger.info("Training content-based filtering model...")
            
            # Store product IDs
            self.product_ids = products_df['product_id'].tolist()
            
            # Extract and combine features
            features = self._extract_features(products_df)
            
            # Apply PCA for dimensionality reduction if needed
            if features.shape[1] > 500:
                self.pca = PCA(n_components=500)
                features = self.pca.fit_transform(features)
            
            self.product_features = features
            
            # Calculate similarity matrix
            self.similarity_matrix = cosine_similarity(features)
            
            # Adjust feature weights based on user interactions if available
            if user_interactions_df is not None:
                self._adjust_feature_weights(user_interactions_df, products_df)
            
            # Save model components
            self._save_model()
            
            logger.info("Content-based filtering model trained successfully")
            
        except Exception as e:
            logger.error(f"Error training content-based filtering model: {str(e)}")
            raise
    
    def get_similar_products(self, product_id: str, n_recommendations: int = 10) -> List[Dict]:
        """Get products similar to a given product"""
        try:
            if product_id not in self.product_ids:
                logger.warning(f"Product {product_id} not found in training data")
                return []
            
            product_idx = self.product_ids.index(product_id)
            similarities = self.similarity_matrix[product_idx]
            
            # Get indices of most similar products (excluding the product itself)
            similar_indices = np.argsort(similarities)[::-1][1:n_recommendations + 1]
            
            similar_products = []
            for idx in similar_indices:
                similar_products.append({
                    'product_id': self.product_ids[idx],
                    'similarity_score': float(similarities[idx]),
                    'confidence': min(float(similarities[idx]), 1.0)
                })
            
            return similar_products
            
        except Exception as e:
            logger.error(f"Error getting similar products: {str(e)}")
            return []
    
    def get_user_recommendations(self, user_id: str, user_profile: Dict, 
                               products_df: pd.DataFrame, n_recommendations: int = 10) -> List[Dict]:
        """Get content-based recommendations for a user based on their profile"""
        try:
            logger.info(f"Getting content-based recommendations for user {user_id}")
            
            # Create user profile vector
            user_vector = self._create_user_profile_vector(user_profile, products_df)
            
            if user_vector is None:
                logger.warning(f"Could not create user profile vector for user {user_id}")
                return []
            
            # Calculate similarity between user profile and all products
            similarities = cosine_similarity([user_vector], self.product_features)[0]
            
            # Get indices of most similar products
            similar_indices = np.argsort(similarities)[::-1][:n_recommendations]
            
            recommendations = []
            for idx in similar_indices:
                recommendations.append({
                    'product_id': self.product_ids[idx],
                    'similarity_score': float(similarities[idx]),
                    'confidence': min(float(similarities[idx]), 1.0)
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting user recommendations: {str(e)}")
            return []
    
    def get_category_recommendations(self, category: str, products_df: pd.DataFrame, 
                                   n_recommendations: int = 10) -> List[Dict]:
        """Get recommendations for a specific category"""
        try:
            # Filter products by category
            category_products = products_df[products_df['category'] == category]
            
            if category_products.empty:
                return []
            
            # Calculate popularity scores
            category_products = category_products.copy()
            category_products['popularity_score'] = (
                category_products['rating'] * 0.7 + 
                np.log1p(category_products['review_count']) * 0.3
            )
            
            # Sort by popularity and return top N
            top_products = category_products.nlargest(n_recommendations, 'popularity_score')
            
            recommendations = []
            for _, product in top_products.iterrows():
                recommendations.append({
                    'product_id': product['product_id'],
                    'popularity_score': float(product['popularity_score']),
                    'confidence': min(float(product['popularity_score']) / 5.0, 1.0)
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting category recommendations: {str(e)}")
            return []
    
    def _extract_features(self, products_df: pd.DataFrame) -> np.ndarray:
        """Extract and combine features from product data"""
        try:
            all_features = []
            
            # Text features (description, title, tags)
            text_features = self._extract_text_features(products_df)
            if text_features is not None:
                all_features.append(text_features)
            
            # Categorical features
            categorical_features = self._extract_categorical_features(products_df)
            if categorical_features is not None:
                all_features.append(categorical_features)
            
            # Numerical features
            numerical_features = self._extract_numerical_features(products_df)
            if numerical_features is not None:
                all_features.append(numerical_features)
            
            # Combine all features
            if all_features:
                combined_features = np.hstack(all_features)
                return combined_features
            else:
                raise ValueError("No features could be extracted")
                
        except Exception as e:
            logger.error(f"Error extracting features: {str(e)}")
            raise
    
    def _extract_text_features(self, products_df: pd.DataFrame) -> Optional[np.ndarray]:
        """Extract TF-IDF features from text data"""
        try:
            # Combine text fields
            text_data = []
            for _, product in products_df.iterrows():
                text_parts = []
                
                # Add title
                if 'title' in product and pd.notna(product['title']):
                    text_parts.append(str(product['title']))
                
                # Add description
                if 'description' in product and pd.notna(product['description']):
                    text_parts.append(str(product['description']))
                
                # Add tags
                if 'tags' in product and pd.notna(product['tags']):
                    if isinstance(product['tags'], list):
                        text_parts.extend(product['tags'])
                    else:
                        text_parts.append(str(product['tags']))
                
                # Add brand
                if 'brand' in product and pd.notna(product['brand']):
                    text_parts.append(str(product['brand']))
                
                combined_text = ' '.join(text_parts)
                text_data.append(combined_text)
            
            # Create TF-IDF vectorizer
            if self.tfidf_vectorizer is None:
                self.tfidf_vectorizer = TfidfVectorizer(
                    max_features=1000,
                    stop_words='english',
                    lowercase=True,
                    ngram_range=(1, 2),
                    min_df=2,
                    max_df=0.8
                )
                tfidf_features = self.tfidf_vectorizer.fit_transform(text_data)
            else:
                tfidf_features = self.tfidf_vectorizer.transform(text_data)
            
            return tfidf_features.toarray()
            
        except Exception as e:
            logger.error(f"Error extracting text features: {str(e)}")
            return None
    
    def _extract_categorical_features(self, products_df: pd.DataFrame) -> Optional[np.ndarray]:
        """Extract categorical features using one-hot encoding"""
        try:
            categorical_features = []
            
            # Category features
            if 'category' in products_df.columns:
                categories = pd.get_dummies(products_df['category'], prefix='category')
                categorical_features.append(categories.values)
            
            # Brand features
            if 'brand' in products_df.columns:
                # Only include top N brands to avoid high dimensionality
                top_brands = products_df['brand'].value_counts().head(50).index
                products_df_copy = products_df.copy()
                products_df_copy['brand'] = products_df_copy['brand'].apply(
                    lambda x: x if x in top_brands else 'other'
                )
                brands = pd.get_dummies(products_df_copy['brand'], prefix='brand')
                categorical_features.append(brands.values)
            
            if categorical_features:
                return np.hstack(categorical_features)
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error extracting categorical features: {str(e)}")
            return None
    
    def _extract_numerical_features(self, products_df: pd.DataFrame) -> Optional[np.ndarray]:
        """Extract and normalize numerical features"""
        try:
            numerical_features = []
            
            # Price features
            if 'price' in products_df.columns:
                prices = products_df['price'].fillna(products_df['price'].median())
                # Normalize prices
                prices_normalized = (prices - prices.min()) / (prices.max() - prices.min())
                numerical_features.append(prices_normalized.values.reshape(-1, 1))
                
                # Price categories
                price_categories = pd.cut(prices, bins=5, labels=['very_low', 'low', 'medium', 'high', 'very_high'])
                price_cat_encoded = pd.get_dummies(price_categories, prefix='price_cat')
                numerical_features.append(price_cat_encoded.values)
            
            # Rating features
            if 'rating' in products_df.columns:
                ratings = products_df['rating'].fillna(products_df['rating'].mean())
                ratings_normalized = ratings / 5.0  # Normalize to 0-1
                numerical_features.append(ratings_normalized.values.reshape(-1, 1))
            
            # Review count features
            if 'review_count' in products_df.columns:
                review_counts = products_df['review_count'].fillna(0)
                # Log transform and normalize
                review_counts_log = np.log1p(review_counts)
                review_counts_normalized = (review_counts_log - review_counts_log.min()) / (review_counts_log.max() - review_counts_log.min())
                numerical_features.append(review_counts_normalized.values.reshape(-1, 1))
            
            # Availability features
            if 'in_stock' in products_df.columns:
                in_stock = products_df['in_stock'].astype(int)
                numerical_features.append(in_stock.values.reshape(-1, 1))
            
            if numerical_features:
                return np.hstack(numerical_features)
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error extracting numerical features: {str(e)}")
            return None
    
    def _create_user_profile_vector(self, user_profile: Dict, products_df: pd.DataFrame) -> Optional[np.ndarray]:
        """Create a user profile vector based on user preferences and history"""
        try:
            # Get user's preferred categories
            preferred_categories = user_profile.get('preferred_categories', [])
            
            # Get user's interaction history
            purchased_products = user_profile.get('purchased_products', [])
            viewed_products = user_profile.get('viewed_products', [])
            
            # Create user profile based on interacted products
            user_vectors = []
            
            # Add vectors for purchased products (higher weight)
            for product_id in purchased_products:
                if product_id in self.product_ids:
                    idx = self.product_ids.index(product_id)
                    user_vectors.append(self.product_features[idx] * 2.0)  # Double weight for purchases
            
            # Add vectors for viewed products (lower weight)
            for product_id in viewed_products:
                if product_id in self.product_ids:
                    idx = self.product_ids.index(product_id)
                    user_vectors.append(self.product_features[idx])
            
            # If no interaction history, create profile based on preferences
            if not user_vectors and preferred_categories:
                # Create average vector for preferred categories
                category_products = products_df[products_df['category'].isin(preferred_categories)]
                if not category_products.empty:
                    category_vectors = []
                    for _, product in category_products.iterrows():
                        if product['product_id'] in self.product_ids:
                            idx = self.product_ids.index(product['product_id'])
                            category_vectors.append(self.product_features[idx])
                    
                    if category_vectors:
                        user_vectors = category_vectors
            
            # Calculate average user profile vector
            if user_vectors:
                user_profile_vector = np.mean(user_vectors, axis=0)
                return user_profile_vector
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error creating user profile vector: {str(e)}")
            return None
    
    def _adjust_feature_weights(self, user_interactions_df: pd.DataFrame, products_df: pd.DataFrame) -> None:
        """Adjust feature weights based on user interaction patterns"""
        try:
            # Analyze which features correlate with user preferences
            # This is a simplified approach - in practice, you'd use more sophisticated methods
            
            # Count interactions by category
            category_interactions = user_interactions_df.groupby('product_id').size()
            
            # Calculate category preferences
            product_categories = products_df.set_index('product_id')['category']
            category_preferences = {}
            
            for product_id, interaction_count in category_interactions.items():
                if product_id in product_categories.index:
                    category = product_categories[product_id]
                    if category not in category_preferences:
                        category_preferences[category] = 0
                    category_preferences[category] += interaction_count
            
            # Adjust weights based on category diversity
            if len(category_preferences) > 5:
                # High category diversity - increase text weight
                self.feature_weights['text'] = 0.5
                self.feature_weights['category'] = 0.2
            else:
                # Low category diversity - increase category weight
                self.feature_weights['category'] = 0.4
                self.feature_weights['text'] = 0.3
            
            logger.info(f"Adjusted feature weights: {self.feature_weights}")
            
        except Exception as e:
            logger.error(f"Error adjusting feature weights: {str(e)}")
    
    def _save_model(self) -> None:
        """Save model components to disk"""
        try:
            model_data = {
                'tfidf_vectorizer': self.tfidf_vectorizer,
                'scaler': self.scaler,
                'pca': self.pca,
                'product_features': self.product_features,
                'product_ids': self.product_ids,
                'similarity_matrix': self.similarity_matrix,
                'feature_weights': self.feature_weights
            }
            
            filepath = os.path.join(self.model_path, "content_based_model.pkl")
            joblib.dump(model_data, filepath)
            logger.info(f"Content-based model saved to {filepath}")
            
        except Exception as e:
            logger.error(f"Error saving content-based model: {str(e)}")
    
    def load_model(self) -> None:
        """Load model components from disk"""
        try:
            filepath = os.path.join(self.model_path, "content_based_model.pkl")
            
            if os.path.exists(filepath):
                model_data = joblib.load(filepath)
                
                self.tfidf_vectorizer = model_data['tfidf_vectorizer']
                self.scaler = model_data['scaler']
                self.pca = model_data['pca']
                self.product_features = model_data['product_features']
                self.product_ids = model_data['product_ids']
                self.similarity_matrix = model_data['similarity_matrix']
                self.feature_weights = model_data['feature_weights']
                
                logger.info(f"Content-based model loaded from {filepath}")
            else:
                logger.warning(f"Model file not found: {filepath}")
                
        except Exception as e:
            logger.error(f"Error loading content-based model: {str(e)}")
    
    def get_model_info(self) -> Dict:
        """Get information about the loaded model"""
        return {
            'model_trained': self.product_features is not None,
            'num_products': len(self.product_ids) if self.product_ids else 0,
            'feature_dimensions': self.product_features.shape[1] if self.product_features is not None else 0,
            'feature_weights': self.feature_weights,
            'tfidf_vocabulary_size': len(self.tfidf_vectorizer.vocabulary_) if self.tfidf_vectorizer else 0
        }