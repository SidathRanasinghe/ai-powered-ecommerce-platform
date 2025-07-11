#!/bin/bash

# Run tests with coverage
set -e

echo "Running tests with coverage..."
pytest --cov=src --cov-report=xml --cov-report=term-missing tests/

echo "Generating coverage report..."
coverage html

echo "Checking coverage threshold..."
coverage report --fail-under=80