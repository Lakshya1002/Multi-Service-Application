Write-Host "Building custom base image..."
docker build -t my-node-base:18-alpine ./base-image

Write-Host "Starting multi-service application..."
docker-compose up -d --build

Write-Host "Application is starting in the background. Run 'docker-compose ps' to check status."
