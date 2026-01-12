#!/bin/bash

# Environment Setup Script
# This script creates .env files from .env.example templates

echo "Setting up environment variables..."

# Backend
if [ -f "feedme-backend/.env.example" ]; then
    if [ ! -f "feedme-backend/.env" ]; then
        cp feedme-backend/.env.example feedme-backend/.env
        echo "✓ Created feedme-backend/.env"
        echo "  Please edit feedme-backend/.env and update JWT_SECRET with a secure value"
    else
        echo "⚠ feedme-backend/.env already exists, skipping..."
    fi
else
    echo "✗ feedme-backend/.env.example not found"
fi

# Frontend
if [ -f "feedme-frontend/.env.example" ]; then
    if [ ! -f "feedme-frontend/.env.local" ]; then
        cp feedme-frontend/.env.example feedme-frontend/.env.local
        echo "✓ Created feedme-frontend/.env.local"
    else
        echo "⚠ feedme-frontend/.env.local already exists, skipping..."
    fi
else
    echo "✗ feedme-frontend/.env.example not found"
fi

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit feedme-backend/.env and set a secure JWT_SECRET"
echo "2. Edit feedme-frontend/.env.local if your backend runs on a different port"
