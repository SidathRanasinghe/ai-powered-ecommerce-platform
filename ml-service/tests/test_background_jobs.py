import pytest
from unittest.mock import AsyncMock, patch
from src.services.background_jobs import train_models_periodically

@pytest.mark.asyncio
async def test_train_models_periodically():
    with patch('src.services.recommendation_service.RecommendationService.retrain_models') as mock_retrain:
        mock_retrain.return_value = AsyncMock(return_value=True)
        await train_models_periodically()
        mock_retrain.assert_called_once_with(force=False)