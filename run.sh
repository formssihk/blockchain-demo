#!/bin/bash

# Set the project name
PROJECT_NAME="blockchain-demo-app"

# Build the Docker image
echo "Building Docker image..."
docker build -t $PROJECT_NAME .

# Check if the build was successful
if [ $? -eq 0 ]; then
  echo "Docker image built successfully."
else
  echo "Docker build failed. Exiting..."
  exit 1
fi

# Run docker-compose in detached mode
echo "Running Docker Compose..."
docker-compose up -d

# Check if docker-compose ran successfully
if [ $? -eq 0 ]; then
  echo "Docker Compose started successfully."
  echo "You can check the logs using 'docker-compose logs'."
else
  echo "Docker Compose failed to start. Exiting..."
  exit 1
fi
