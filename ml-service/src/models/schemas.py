"""
Pydantic schemas for the ML service
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class BehaviorType(str, Enum):
    """Types of user behavior"""
    VIEW = "view"
    CLICK = "click"
    ADD_TO_CART = "add_to_cart"
    PURCHASE = "purchase"
    LIKE = "like"
    SHARE = "share"
    REVIEW = "review"
    WISHLIST = "wishlist"

class RecommendationAlgorithm(str, Enum):
    """Types of recommendation algorithms"""
    COLLABORATIVE = "collaborative"
    CONTENT_BASED = "content_based"
    HYBRID = "hybrid"
    POPULARITY = "popularity"
    TRENDING = "trending"

class RecommendationRequest(BaseModel):
    """Request schema for user recommendations"""
    user_id: str = Field(..., description="User ID for recommendations")
    num_recommendations: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Number of recommendations to return"
    )
    exclude_purchased: bool = Field(
        default=True,
        description="Whether to exclude already purchased products"
    )
    category_filter: Optional[str] = Field(
        default=None,
        description="Filter recommendations by category"
    )
    price_range: Optional[Dict[str, float]] = Field(
        default=None,
        description="Price range filter {min: float, max: float}"
    )
    
    @validator('price_range')
    def validate_price_range(cls, v):
        if v is not None:
            if 'min' not in v or 'max' not in v:
                raise ValueError('Price range must contain min and max keys')
            if v['min'] < 0 or v['max'] < 0:
                raise ValueError('Price range values must be positive')
            if v['min'] > v['max']:
                raise ValueError('Minimum price cannot be greater than maximum price')
        return v

class ProductRecommendation(BaseModel):
    """Individual product recommendation"""
    product_id: str = Field(..., description="Product ID")
    score: float = Field(..., ge=0, le=1, description="Recommendation score")
    reason: Optional[str] = Field(
        default=None,
        description="Reason for recommendation"
    )
    product_name: Optional[str] = Field(
        default=None,
        description="Product name"
    )
    product_price: Optional[float] = Field(
        default=None,
        description="Product price"
    )
    product_category: Optional[str] = Field(
        default=None,
        description="Product category"
    )
    product_image: Optional[str] = Field(
        default=None,
        description="Product image URL"
    )

class RecommendationResponse(BaseModel):
    """Response schema for recommendations"""
    user_id: str = Field(..., description="User ID")
    recommendations: List[ProductRecommendation] = Field(
        ..., description="List of recommended products"
    )
    algorithm_used: RecommendationAlgorithm = Field(
        ..., description="Algorithm used for recommendations"
    )
    confidence_score: float = Field(
        ..., ge=0, le=1, description="Overall confidence score"
    )
    generated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when recommendations were generated"
    )
    cache_hit: bool = Field(
        default=False,
        description="Whether recommendations were served from cache"
    )

class ProductSimilarityRequest(BaseModel):
    """Request schema for similar products"""
    product_id: str = Field(..., description="Product ID to find similar products for")
    num_recommendations: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Number of similar products to return"
    )
    similarity_threshold: float = Field(
        default=0.1,
        ge=0,
        le=1,
        description="Minimum similarity score threshold"
    )

class UserBehaviorRequest(BaseModel):
    """Request schema for tracking user behavior"""
    user_id: str = Field(..., description="User ID")
    product_id: str = Field(..., description="Product ID")
    behavior_type: BehaviorType = Field(..., description="Type of behavior")
    rating: Optional[float] = Field(
        default=None,
        ge=1,
        le=5,
        description="Rating (1-5) for review behavior"
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Session ID for tracking"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp of behavior"
    )
    additional_data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional behavior data"
    )

class TrainingRequest(BaseModel):
    """Request schema for model training"""
    force_retrain: bool = Field(
        default=False,
        description="Force retrain even if not needed"
    )
    algorithm: Optional[RecommendationAlgorithm] = Field(
        default=None,
        description="Specific algorithm to retrain"
    )
    training_data_limit: Optional[int] = Field(
        default=None,
        description="Limit training data size"
    )

class ModelStatus(BaseModel):
    """Model status response"""
    is_trained: bool = Field(..., description="Whether model is trained")
    last_training_time: Optional[datetime] = Field(
        default=None,
        description="Last training timestamp"
    )
    training_data_size: int = Field(
        default=0,
        description="Size of training data"
    )
    model_accuracy: Optional[float] = Field(
        default=None,
        description="Model accuracy score"
    )
    algorithms_available: List[RecommendationAlgorithm] = Field(
        ..., description="Available algorithms"
    )
    next_retrain_time: Optional[datetime] = Field(
        default=None,
        description="Next scheduled retrain time"
    )

class TrendingProductsResponse(BaseModel):
    """Response schema for trending products"""
    products: List[ProductRecommendation] = Field(
        ..., description="List of trending products"
    )
    time_period: str = Field(..., description="Time period for trending analysis")
    category: Optional[str] = Field(
        default=None,
        description="Category filter applied"
    )
    generated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when trends were generated"
    )

class PopularProductsResponse(BaseModel):
    """Response schema for popular products"""
    products: List[ProductRecommendation] = Field(
        ..., description="List of popular products"
    )
    category: Optional[str] = Field(
        default=None,
        description="Category filter applied"
    )
    generated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when popularity was calculated"
    )

class UserInteraction(BaseModel):
    """User interaction data model"""
    user_id: str = Field(..., description="User ID")
    product_id: str = Field(..., description="Product ID")
    interaction_type: BehaviorType = Field(..., description="Type of interaction")
    weight: float = Field(..., description="Weight of interaction")
    timestamp: datetime = Field(..., description="Interaction timestamp")
    session_id: Optional[str] = Field(default=None, description="Session ID")

class ProductFeatures(BaseModel):
    """Product features for content-based filtering"""
    product_id: str = Field(..., description="Product ID")
    category: str = Field(..., description="Product category")
    price: float = Field(..., description="Product price")
    brand: Optional[str] = Field(default=None, description="Product brand")
    features: Dict[str, Any] = Field(
        ..., description="Product features dictionary"
    )
    text_features: Optional[str] = Field(
        default=None,
        description="Combined text features"
    )

class RecommendationMetrics(BaseModel):
    """Recommendation performance metrics"""
    algorithm: RecommendationAlgorithm = Field(..., description="Algorithm")
    precision: float = Field(..., description="Precision score")
    recall: float = Field(..., description="Recall score")
    f1_score: float = Field(..., description="F1 score")
    coverage: float = Field(..., description="Catalog coverage")
    diversity: float = Field(..., description="Recommendation diversity")
    novelty: float = Field(..., description="Recommendation novelty")
    calculated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Calculation timestamp"
    )