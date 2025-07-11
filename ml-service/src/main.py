"""
AI-Powered E-commerce ML Service
FastAPI application for product recommendations
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import our custom modules
from .config.settings import Settings
from .config.database import DatabaseManager
from .models.recommendation_engine import RecommendationEngine
from .models.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    ProductSimilarityRequest,
    UserBehaviorRequest,
    TrainingRequest
)
from .services.recommendation_service import RecommendationService
from .utils.logger import setup_logger

# Initialize logger
logger = setup_logger(__name__)

# Initialize settings
settings = Settings()

# Initialize database manager
db_manager = DatabaseManager(settings)

# Initialize recommendation engine
recommendation_engine = RecommendationEngine(db_manager, settings)

# Initialize recommendation service
recommendation_service = RecommendationService(recommendation_engine, db_manager)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events"""
    # Startup
    logger.info("Starting ML Service...")
    await db_manager.connect()
    await recommendation_engine.initialize()
    logger.info("ML Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ML Service...")
    await db_manager.close()
    logger.info("ML Service shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="AI E-commerce ML Service",
    description="Machine Learning service for product recommendations",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ml-service",
        "version": "1.0.0"
    }

# Model status endpoint
@app.get("/model/status")
async def model_status():
    """Check model training status"""
    try:
        status = await recommendation_service.get_model_status()
        return status
    except Exception as e:
        logger.error(f"Error checking model status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check model status")

# Get recommendations for a user
@app.post("/recommendations/user", response_model=RecommendationResponse)
async def get_user_recommendations(
    request: RecommendationRequest,
    background_tasks: BackgroundTasks
):
    """Get personalized product recommendations for a user"""
    try:
        recommendations = await recommendation_service.get_user_recommendations(
            user_id=request.user_id,
            num_recommendations=request.num_recommendations,
            exclude_purchased=request.exclude_purchased
        )
        
        # Track recommendation request in background
        background_tasks.add_task(
            recommendation_service.track_recommendation_request,
            request.user_id,
            recommendations
        )
        
        return RecommendationResponse(
            user_id=request.user_id,
            recommendations=recommendations,
            algorithm_used="hybrid",
            confidence_score=0.85
        )
    
    except Exception as e:
        logger.error(f"Error getting user recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get recommendations")

# Get similar products
@app.post("/recommendations/similar")
async def get_similar_products(request: ProductSimilarityRequest):
    """Get products similar to a given product"""
    try:
        similar_products = await recommendation_service.get_similar_products(
            product_id=request.product_id,
            num_recommendations=request.num_recommendations
        )
        
        return {
            "product_id": request.product_id,
            "similar_products": similar_products,
            "algorithm_used": "content_based"
        }
    
    except Exception as e:
        logger.error(f"Error getting similar products: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get similar products")

# Track user behavior
@app.post("/behavior/track")
async def track_user_behavior(request: UserBehaviorRequest):
    """Track user behavior for improving recommendations"""
    try:
        await recommendation_service.track_user_behavior(
            user_id=request.user_id,
            product_id=request.product_id,
            behavior_type=request.behavior_type,
            rating=request.rating,
            session_id=request.session_id
        )
        
        return {"status": "success", "message": "Behavior tracked successfully"}
    
    except Exception as e:
        logger.error(f"Error tracking user behavior: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track behavior")

# Trigger model retraining
@app.post("/model/retrain")
async def retrain_model(
    request: TrainingRequest,
    background_tasks: BackgroundTasks
):
    """Trigger model retraining"""
    try:
        # Start retraining in background
        background_tasks.add_task(
            recommendation_service.retrain_models,
            request.force_retrain
        )
        
        return {
            "status": "training_started",
            "message": "Model retraining initiated"
        }
    
    except Exception as e:
        logger.error(f"Error starting model retraining: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start retraining")

# Get trending products
@app.get("/recommendations/trending")
async def get_trending_products(
    category: Optional[str] = None,
    time_period: str = "week",
    limit: int = 10
):
    """Get trending products based on user interactions"""
    try:
        trending_products = await recommendation_service.get_trending_products(
            category=category,
            time_period=time_period,
            limit=limit
        )
        
        return {
            "trending_products": trending_products,
            "category": category,
            "time_period": time_period
        }
    
    except Exception as e:
        logger.error(f"Error getting trending products: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get trending products")

# Get popular products for new users
@app.get("/recommendations/popular")
async def get_popular_products(
    category: Optional[str] = None,
    limit: int = 10
):
    """Get popular products for new users (cold start problem)"""
    try:
        popular_products = await recommendation_service.get_popular_products(
            category=category,
            limit=limit
        )
        
        return {
            "popular_products": popular_products,
            "category": category,
            "algorithm_used": "popularity_based"
        }
    
    except Exception as e:
        logger.error(f"Error getting popular products: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get popular products")

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status": "error"}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "status": "error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("ML_SERVICE_PORT", 8001)),
        reload=True
    )