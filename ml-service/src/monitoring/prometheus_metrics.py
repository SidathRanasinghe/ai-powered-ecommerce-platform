from prometheus_client import Counter, Gauge, Histogram, start_http_server
import time

# Recommendation metrics
RECOMMENDATION_REQUESTS = Counter(
    'recommendation_requests_total',
    'Total number of recommendation requests',
    ['algorithm']
)

RECOMMENDATION_LATENCY = Histogram(
    'recommendation_latency_seconds',
    'Latency of recommendation requests',
    ['algorithm']
)

# Model metrics
MODEL_TRAINING_TIME = Gauge(
    'model_training_time_seconds',
    'Time taken to train the recommendation models'
)

MODEL_ACCURACY = Gauge(
    'model_accuracy_score',
    'Accuracy score of the recommendation models',
    ['model_type']
)

def start_metrics_server(port: int = 8002):
    """Start Prometheus metrics server"""
    start_http_server(port)