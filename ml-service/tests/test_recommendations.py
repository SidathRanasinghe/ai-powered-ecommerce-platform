import pytest
from src.models.schemas import RecommendationRequest

def test_user_recommendations(test_client, mock_recommendation_engine):
    request_data = {
        "user_id": "test_user",
        "num_recommendations": 5,
        "exclude_purchased": True
    }
    
    response = test_client.post("/recommendations/user", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert len(data["recommendations"]) == 2
    assert data["algorithm_used"] == "hybrid"
    assert data["confidence_score"] == 0.85

def test_similar_products(test_client, mock_recommendation_engine):
    request_data = {
        "product_id": "test_product",
        "num_recommendations": 3
    }
    
    response = test_client.post("/recommendations/similar", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert "similar_products" in data
    assert data["algorithm_used"] == "content_based"