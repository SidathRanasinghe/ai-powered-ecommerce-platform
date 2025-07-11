#!/bin/bash

# Start development server
set -e

echo "Starting ML service in development mode..."
uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload