"""
Data preprocessing utilities for ML recommendation engine
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import logging
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
import re

logger = logging.getLogger(__name__)

class DataPreprocessor:
    """Handles data preprocessing for recommendation models"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            lowercase=True,
            ngram_range=(1, 2)
        )
    
    def preprocess_user_data(self, user_data: List[Dict]) -> pd.DataFrame:
        """Preprocess user data for recommendation models"""
        try:
            df = pd.DataFrame(user_data)
            
            # Handle missing values
            df = self._handle_missing_values(df, 'user')
            
            # Encode categorical variables
            categorical_cols = ['gender', 'location', 'preferred_category']
            for col in categorical_cols:
                if col in df.columns:
                    df[col] = self._encode_categorical(df[col], col)
            
            # Normalize numerical features
            numerical_cols = ['age', 'total_orders', 'total_spent']
            for col in numerical_cols:
                if col in df.columns:
                    df[col] = self._normalize_numerical(df[col])
            
            # Create user segments
            df['user_segment'] = self._create_user_segments(df)
            
            return df
            
        except Exception as e:
            logger.error(f"Error preprocessing user data: {str(e)}")
            raise
    
    def preprocess_product_data(self, product_data: List[Dict]) -> pd.DataFrame:
        """Preprocess product data for content-based filtering"""
        try:
            df = pd.DataFrame(product_data)
            
            # Handle missing values
            df = self._handle_missing_values(df, 'product')
            
            # Process text features
            if 'description' in df.columns:
                df['description_processed'] = df['description'].apply(
                    self._clean_text
                )
            
            # Encode categorical variables
            categorical_cols = ['category', 'brand', 'tags']
            for col in categorical_cols:
                if col in df.columns:
                    if col == 'tags':
                        df[col] = df[col].apply(self._process_tags)
                    else:
                        df[col] = self._encode_categorical(df[col], col)
            
            # Normalize numerical features
            numerical_cols = ['price', 'rating', 'review_count']
            for col in numerical_cols:
                if col in df.columns:
                    df[col] = self._normalize_numerical(df[col])
            
            # Create product features
            df['price_category'] = self._create_price_categories(df.get('price', []))
            df['popularity_score'] = self._calculate_popularity_score(df)
            
            return df
            
        except Exception as e:
            logger.error(f"Error preprocessing product data: {str(e)}")
            raise
    
    def preprocess_interaction_data(self, interaction_data: List[Dict]) -> pd.DataFrame:
        """Preprocess user-item interaction data"""
        try:
            df = pd.DataFrame(interaction_data)
            
            # Handle missing values
            df = self._handle_missing_values(df, 'interaction')
            
            # Process timestamps
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df['day_of_week'] = df['timestamp'].dt.dayofweek
                df['hour'] = df['timestamp'].dt.hour
                df['is_weekend'] = df['day_of_week'].isin([5, 6])
            
            # Encode interaction types
            if 'interaction_type' in df.columns:
                interaction_weights = {
                    'view': 1.0,
                    'add_to_cart': 2.0,
                    'purchase': 5.0,
                    'review': 3.0,
                    'wishlist': 1.5
                }
                df['interaction_weight'] = df['interaction_type'].map(
                    interaction_weights
                ).fillna(1.0)
            
            # Create recency features
            df['recency_days'] = self._calculate_recency(df['timestamp'])
            df['recency_weight'] = self._calculate_recency_weight(df['recency_days'])
            
            # Filter out old interactions
            df = self._filter_recent_interactions(df)
            
            return df
            
        except Exception as e:
            logger.error(f"Error preprocessing interaction data: {str(e)}")
            raise
    
    def create_user_item_matrix(self, interaction_df: pd.DataFrame) -> pd.DataFrame:
        """Create user-item interaction matrix"""
        try:
            # Create weighted interaction scores
            interaction_df['weighted_score'] = (
                interaction_df['interaction_weight'] * 
                interaction_df['recency_weight']
            )
            
            # Aggregate multiple interactions
            user_item_matrix = interaction_df.groupby(['user_id', 'product_id'])[
                'weighted_score'
            ].sum().reset_index()
            
            # Pivot to create matrix
            matrix = user_item_matrix.pivot(
                index='user_id', 
                columns='product_id', 
                values='weighted_score'
            ).fillna(0)
            
            return matrix
            
        except Exception as e:
            logger.error(f"Error creating user-item matrix: {str(e)}")
            raise
    
    def _handle_missing_values(self, df: pd.DataFrame, data_type: str) -> pd.DataFrame:
        """Handle missing values based on data type"""
        if data_type == 'user':
            df['age'] = df['age'].fillna(df['age'].median())
            df['gender'] = df['gender'].fillna('unknown')
            df['location'] = df['location'].fillna('unknown')
            df['total_orders'] = df['total_orders'].fillna(0)
            df['total_spent'] = df['total_spent'].fillna(0)
            
        elif data_type == 'product':
            df['price'] = df['price'].fillna(df['price'].median())
            df['rating'] = df['rating'].fillna(df['rating'].mean())
            df['review_count'] = df['review_count'].fillna(0)
            df['brand'] = df['brand'].fillna('unknown')
            df['description'] = df['description'].fillna('')
            
        elif data_type == 'interaction':
            df = df.dropna(subset=['user_id', 'product_id'])
            df['rating'] = df['rating'].fillna(3.0)
            
        return df
    
    def _encode_categorical(self, series: pd.Series, col_name: str) -> pd.Series:
        """Encode categorical variables"""
        if col_name not in self.label_encoders:
            self.label_encoders[col_name] = LabelEncoder()
            return self.label_encoders[col_name].fit_transform(series.astype(str))
        else:
            return self.label_encoders[col_name].transform(series.astype(str))
    
    def _normalize_numerical(self, series: pd.Series) -> pd.Series:
        """Normalize numerical features"""
        return (series - series.min()) / (series.max() - series.min())
    
    def _clean_text(self, text: str) -> str:
        """Clean text data"""
        if not isinstance(text, str):
            return ""
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove special characters
        text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text.lower()
    
    def _process_tags(self, tags) -> str:
        """Process product tags"""
        if isinstance(tags, list):
            return ' '.join(tags)
        elif isinstance(tags, str):
            return tags
        else:
            return ""
    
    def _create_user_segments(self, df: pd.DataFrame) -> pd.Series:
        """Create user segments based on behavior"""
        segments = []
        
        for _, row in df.iterrows():
            total_orders = row.get('total_orders', 0)
            total_spent = row.get('total_spent', 0)
            
            if total_orders >= 10 and total_spent >= 1000:
                segments.append('premium')
            elif total_orders >= 5 and total_spent >= 500:
                segments.append('regular')
            elif total_orders >= 1:
                segments.append('occasional')
            else:
                segments.append('new')
        
        return pd.Series(segments)
    
    def _create_price_categories(self, prices: pd.Series) -> pd.Series:
        """Create price categories"""
        if prices.empty:
            return pd.Series([])
        
        quantiles = prices.quantile([0.33, 0.66])
        
        def categorize_price(price):
            if price <= quantiles[0.33]:
                return 'low'
            elif price <= quantiles[0.66]:
                return 'medium'
            else:
                return 'high'
        
        return prices.apply(categorize_price)
    
    def _calculate_popularity_score(self, df: pd.DataFrame) -> pd.Series:
        """Calculate product popularity score"""
        rating = df.get('rating', 0)
        review_count = df.get('review_count', 0)
        
        # Weighted score considering both rating and review count
        popularity = (rating * 0.7) + (np.log1p(review_count) * 0.3)
        
        return popularity
    
    def _calculate_recency(self, timestamps: pd.Series) -> pd.Series:
        """Calculate recency in days"""
        now = datetime.now()
        return (now - timestamps).dt.days
    
    def _calculate_recency_weight(self, recency_days: pd.Series) -> pd.Series:
        """Calculate recency weight (more recent = higher weight)"""
        # Exponential decay: weight = exp(-lambda * days)
        lambda_decay = 0.01  # Adjust this value to control decay rate
        return np.exp(-lambda_decay * recency_days)
    
    def _filter_recent_interactions(self, df: pd.DataFrame, days: int = 365) -> pd.DataFrame:
        """Filter interactions to recent ones only"""
        cutoff_date = datetime.now() - timedelta(days=days)
        return df[df['timestamp'] >= cutoff_date]
    
    def get_content_features(self, product_df: pd.DataFrame) -> np.ndarray:
        """Extract content features for content-based filtering"""
        try:
            # Combine text features
            text_features = product_df['description_processed'].fillna('')
            
            # Create TF-IDF features
            tfidf_features = self.tfidf_vectorizer.fit_transform(text_features)
            
            # Get numerical features
            numerical_features = []
            for col in ['price', 'rating', 'review_count', 'popularity_score']:
                if col in product_df.columns:
                    numerical_features.append(product_df[col].values.reshape(-1, 1))
            
            if numerical_features:
                numerical_features = np.hstack(numerical_features)
                # Combine TF-IDF and numerical features
                content_features = np.hstack([
                    tfidf_features.toarray(),
                    numerical_features
                ])
            else:
                content_features = tfidf_features.toarray()
            
            return content_features
            
        except Exception as e:
            logger.error(f"Error extracting content features: {str(e)}")
            raise