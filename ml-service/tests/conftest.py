import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.config.database import DatabaseManager
from src.config.settings import Settings

@pytest.fixture
def test_client():
    return TestClient(app)

@pytest.fixture(scope="module")
def test_db():
    settings = Settings(TESTING=True)
    db_manager = DatabaseManager(settings)
    yield db_manager
    # Cleanup after tests
    db_manager.client.drop_database(settings.MONGODB_TEST_DB)

@pytest.fixture
def mock_recommendation_engine(mocker):
    mock = mocker.patch("src.services.recommendation_service.RecommendationEngine")
    mock.return_value.get_user_recommendations.return_value = [
        {"product_id": "1", "score": 0.9},
        {"product_id": "2", "score": 0.8}
    ]
    return mock