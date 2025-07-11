"""
Logging utilities for the ML service
"""

import logging
import sys
from datetime import datetime
from pythonjsonlogger import jsonlogger
from typing import Optional
import os

def setup_logger(name: str, level: Optional[str] = None) -> logging.Logger:
    """
    Set up a logger with JSON formatting
    
    Args:
        name: Logger name
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    
    Returns:
        Configured logger instance
    """
    # Get log level from environment or use default
    log_level = level or os.getenv("LOG_LEVEL", "INFO")
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level.upper()))
    
    # Create JSON formatter
    json_formatter = jsonlogger.JsonFormatter(
        fmt='%(asctime)s %(name)s %(levelname)s %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Create regular formatter for development
    regular_formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Use JSON formatter in production, regular formatter in development
    if os.getenv("NODE_ENV") == "production":
        console_handler.setFormatter(json_formatter)
    else:
        console_handler.setFormatter(regular_formatter)
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    return logger

class MLServiceLogger:
    """Custom logger for ML service with additional context"""
    
    def __init__(self, name: str):
        self.logger = setup_logger(name)
    
    def log_recommendation_request(self, user_id: str, num_recommendations: int, 
                                 algorithm: str, response_time: float):
        """Log recommendation request with context"""
        self.logger.info(
            "Recommendation request processed",
            extra={
                "user_id": user_id,
                "num_recommendations": num_recommendations,
                "algorithm": algorithm,
                "response_time_ms": round(response_time * 1000, 2),
                "event_type": "recommendation_request"
            }
        )
    
    def log_model_training(self, model_type: str, training_time: float, 
                          data_size: int, performance_metrics: dict):
        """Log model training with metrics"""
        self.logger.info(
            "Model training completed",
            extra={
                "model_type": model_type,
                "training_time_seconds": round(training_time, 2),
                "data_size": data_size,
                "performance_metrics": performance_metrics,
                "event_type": "model_training"
            }
        )
    
    def log_error(self, error_type: str, error_message: str, context: dict = None):
        """Log error with context"""
        extra_data = {
            "error_type": error_type,
            "error_message": error_message,
            "event_type": "error"
        }
        
        if context:
            extra_data.update(context)
        
        self.logger.error("ML Service Error", extra=extra_data)
    
    def log_cache_operation(self, operation: str, key: str, hit: bool = None):
        """Log cache operations"""
        extra_data = {
            "cache_operation": operation,
            "cache_key": key,
            "event_type": "cache_operation"
        }
        
        if hit is not None:
            extra_data["cache_hit"] = hit
        
        self.logger.debug("Cache operation", extra=extra_data)
    
    def log_database_operation(self, operation: str, collection: str, 
                              execution_time: float, result_count: int = None):
        """Log database operations"""
        extra_data = {
            "db_operation": operation,
            "collection": collection,
            "execution_time_ms": round(execution_time * 1000, 2),
            "event_type": "database_operation"
        }
        
        if result_count is not None:
            extra_data["result_count"] = result_count
        
        self.logger.debug("Database operation", extra=extra_data)