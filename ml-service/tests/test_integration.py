import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.config.database import DatabaseManager
from src.config.settings import Settings

client = TestClient(app)

@pytest.fixture(scope="module")
def test_db():
    settings = Settings(TESTING=True)
    db_manager = DatabaseManager(settings)
    yield db_manager
    db_manager.client.drop_database(settings.MONGODB_TEST_DB)

def test_full_recommendation_flow(test_db):
    # Setup test data
    test_db.db.users.insert_one({
        "user_id": "test_user",
        "preferences": {"categories": ["electronics"]}
    })
    
    # Test recommendation endpoint
    response = client.post("/recommendations/user", json={
        "user_id": "test_user",
        "num_recommendations": 5
    })
    
    assert response.status_code == 200
    assert len(response.json()["recommendations"]) > 0