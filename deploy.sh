#!/bin/bash

# ChainScope Frontend Deployment Script
set -e

echo "🚀 Deploying ChainScope Frontend to VPS..."

# Configuration
VPS_HOST="root@144.202.11.220"
REMOTE_DIR="/root/chainscope-frontend"
LOCAL_DIR="/home/trap/code/wallet-analytics-demo"

# Create remote directory if it doesn't exist
echo "📁 Creating remote directory..."
ssh $VPS_HOST "mkdir -p $REMOTE_DIR"

# Sync files to VPS (excluding node_modules and .next)
echo "📤 Syncing files to VPS..."
rsync -avz --exclude 'node_modules' \
           --exclude '.next' \
           --exclude '.git' \
           --exclude 'deploy.sh' \
           $LOCAL_DIR/ $VPS_HOST:$REMOTE_DIR/

# Deploy on VPS
echo "🐳 Building and starting Docker container..."
ssh $VPS_HOST << 'ENDSSH'
cd /root/chainscope-frontend

# Stop and remove existing container
docker compose -f docker-compose.production.yml down

# Build and start new container
docker compose -f docker-compose.production.yml up -d --build

# Show logs
echo "📋 Container logs:"
docker compose -f docker-compose.production.yml logs --tail=50
ENDSSH

echo "✅ Deployment complete!"
echo "🌐 Frontend should be accessible at: http://144.202.11.220:3001"
