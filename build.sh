#!/bin/bash
# Build automation script for Render deployment
# This script builds the frontend and copies it to the backend static folder

echo "=========================================="
echo "Building frontend production bundle..."
echo "=========================================="

cd frontend
npm run build

if [ $? -ne 0 ]; then
    echo "Frontend build failed!"
    exit 1
fi

echo "Frontend build completed successfully!"
echo "=========================================="
echo "Copying frontend/dist to backend/app/static..."
echo "=========================================="

# Remove existing static folder contents
rm -rf ../backend/app/static/*

# Copy new build
cp -r dist/* ../backend/app/static/

if [ $? -ne 0 ]; then
    echo "Failed to copy frontend build to backend!"
    exit 1
fi

echo "Build and copy completed successfully!"
echo "=========================================="
