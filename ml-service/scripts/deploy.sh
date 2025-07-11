#!/bin/bash

# Deploy ML service to Kubernetes
set -e

echo "Building Docker image..."
docker build -t ai-ecommerce-ml-service:latest -f deployment/docker/Dockerfile.prod .

echo "Tagging and pushing to ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
docker tag ai-ecommerce-ml-service:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/ai-ecommerce-ml-service:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/ai-ecommerce-ml-service:latest

echo "Applying Kubernetes configurations..."
kubectl apply -f deployment/kubernetes/configmap.yaml
kubectl apply -f deployment/kubernetes/deployment.yaml
kubectl apply -f deployment/kubernetes/service.yaml

echo "Deployment complete!"