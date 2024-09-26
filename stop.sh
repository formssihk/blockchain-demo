#!/bin/bash

# Stop and remove Docker containers, networks, and volumes created by docker-compose
echo "Stopping and removing Docker containers, networks, and volumes..."

docker-compose down

# Check if docker-compose down was successful
if [ $? -eq 0 ]; then
  echo "Docker containers, networks, and volumes stopped and removed successfully."
else
  echo "Failed to stop and remove Docker resources. Exiting..."
  exit 1
fi
