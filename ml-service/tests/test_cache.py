import pytest
from src.services.cache_service import CacheService
from src.config.settings import Settings

@pytest.fixture
def cache_service():
    settings = Settings(TESTING=True)
    return CacheService(settings)

def test_cache_set_get(cache_service):
    cache_service.set("test_key", {"data": 123}, ttl=10)
    result = cache_service.get("test_key")
    assert result == {"data": 123}

def test_cache_miss(cache_service):
    result = cache_service.get("non_existent_key")
    assert result is None