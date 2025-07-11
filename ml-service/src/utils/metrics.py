from prometheus_client import Counter, Histogram

# Recommendation metrics
RECOMMENDATION_REQUESTS = Counter(
    'recommendation_requests_total',
    'Total recommendation requests',
    ['algorithm', 'status']
)

RECOMMENDATION_LATENCY = Histogram(
    'recommendation_latency_seconds',
    'Recommendation request latency',
    ['algorithm']
)

# Error metrics
ERROR_COUNTER = Counter(
    'service_errors_total',
    'Total service errors',
    ['error_type']
)

def record_recommendation(algorithm: str, latency: float, success: bool = True):
    """Record recommendation metrics"""
    RECOMMENDATION_REQUESTS.labels(algorithm=algorithm, status="success" if success else "error").inc()
    RECOMMENDATION_LATENCY.labels(algorithm=algorithm).observe(latency)