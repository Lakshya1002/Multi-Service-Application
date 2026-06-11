#!/bin/bash
echo "Building custom base image..."
docker build -t my-node-base:18-alpine ./base-image

echo "Starting multi-service application..."
docker-compose up -d --build

echo "Application is starting in the background. Run 'docker-compose ps' to check status."
