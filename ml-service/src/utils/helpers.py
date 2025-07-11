import json
import logging
from typing import Any, Dict
from datetime import datetime

logger = logging.getLogger(__name__)

def serialize_json(data: Any) -> str:
    """Serialize data to JSON with datetime support"""
    try:
        def default_serializer(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError(f"Type {type(obj)} not serializable")
        return json.dumps(data, default=default_serializer)
    except Exception as e:
        logger.error(f"Serialization error: {str(e)}")
        raise

def normalize_scores(scores: Dict[str, float]) -> Dict[str, float]:
    """Normalize recommendation scores to 0-1 range"""
    if not scores:
        return {}
    
    min_score = min(scores.values())
    max_score = max(scores.values())
    
    if min_score == max_score:
        return {k: 0.5 for k in scores.keys()}
    
    return {
        k: (v - min_score) / (max_score - min_score)
        for k, v in scores.items()
    }