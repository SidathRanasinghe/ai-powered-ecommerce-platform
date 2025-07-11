"""
Configuration settings for the ML service
"""

import os
from typing import List
from pydantic import BaseSettings, Field
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    """Application settings"""
    
    # Database Configuration
    MONGODB_URI: str = Field(
        default="mongodb://localhost:27017/ecommerce",
        env="MONGODB_URI"
    )
    
    # Redis Configuration
    REDIS_URL: str = Field(
        default="redis://localhost:6379",
        env="REDIS_URL"
    )
    
    # Backend API Configuration
    BACKEND_URL: str = Field(
        default="http://localhost:3001",
        env="BACKEND_URL"
    )
    
    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:3001",
            "https://yourdomain.com"
        ],
        env="ALLOWED_ORIGINS"
    )
    
    # ML Model Configuration
    MODEL_SAVE_PATH: str = Field(
        default="./models/saved_models",
        env="MODEL_SAVE_PATH"
    )
    
    # Recommendation Parameters
    MIN_INTERACTIONS_FOR_TRAINING: int = Field(
        default=100,
        env="MIN_INTERACTIONS_FOR_TRAINING"
    )
    
    DEFAULT_RECOMMENDATIONS_COUNT: int = Field(
        default=10,
        env="DEFAULT_RECOMMENDATIONS_COUNT"
    )
    
    MAX_RECOMMENDATIONS_COUNT: int = Field(
        default=50,
        env="MAX_RECOMMENDATIONS_COUNT"
    )
    
    # Collaborative Filtering Parameters
    COLLABORATIVE_FILTERING_FACTORS: int = Field(
        default=50,
        env="COLLABORATIVE_FILTERING_FACTORS"
    )
    
    COLLABORATIVE_FILTERING_ITERATIONS: int = Field(
        default=30,
        env="COLLABORATIVE_FILTERING_ITERATIONS"
    )
    
    # Content-Based Filtering Parameters
    CONTENT_SIMILARITY_THRESHOLD: float = Field(
        default=0.1,
        env="CONTENT_SIMILARITY_THRESHOLD"
    )
    
    # Caching Configuration
    CACHE_RECOMMENDATIONS_TTL: int = Field(
        default=3600,  # 1 hour
        env="CACHE_RECOMMENDATIONS_TTL"
    )
    
    CACHE_SIMILAR_PRODUCTS_TTL: int = Field(
        default=86400,  # 24 hours
        env="CACHE_SIMILAR_PRODUCTS_TTL"
    )
    
    # Model Training Configuration
    AUTO_RETRAIN_THRESHOLD: int = Field(
        default=1000,  # Retrain after 1000 new interactions
        env="AUTO_RETRAIN_THRESHOLD"
    )
    
    MODEL_RETRAIN_INTERVAL_HOURS: int = Field(
        default=24,
        env="MODEL_RETRAIN_INTERVAL_HOURS"
    )
    
    # Logging Configuration
    LOG_LEVEL: str = Field(
        default="INFO",
        env="LOG_LEVEL"
    )
    
    # Performance Configuration
    MAX_CONCURRENT_REQUESTS: int = Field(
        default=100,
        env="MAX_CONCURRENT_REQUESTS"
    )
    
    REQUEST_TIMEOUT_SECONDS: int = Field(
        default=30,
        env="REQUEST_TIMEOUT_SECONDS"
    )
    
    # Data Processing Configuration
    BATCH_SIZE: int = Field(
        default=1000,
        env="BATCH_SIZE"
    )
    
    # Feature Engineering
    ENABLE_FEATURE_ENGINEERING: bool = Field(
        default=True,
        env="ENABLE_FEATURE_ENGINEERING"
    )
    
    # Cold Start Problem Solutions
    ENABLE_POPULARITY_FALLBACK: bool = Field(
        default=True,
        env="ENABLE_POPULARITY_FALLBACK"
    )
    
    ENABLE_CONTENT_FALLBACK: bool = Field(
        default=True,
        env="ENABLE_CONTENT_FALLBACK"
    )
    
    # Monitoring and Analytics
    ENABLE_RECOMMENDATION_TRACKING: bool = Field(
        default=True,
        env="ENABLE_RECOMMENDATION_TRACKING"
    )
    
    ENABLE_PERFORMANCE_MONITORING: bool = Field(
        default=True,
        env="ENABLE_PERFORMANCE_MONITORING"
    )
    
    class Config:
        env_file = ".env"
        case_sensitive = True