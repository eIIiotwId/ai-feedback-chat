#!/bin/bash

# AI Chat Feedback System Setup Script

echo "🚀 Setting up AI Chat Feedback System..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.local/bin/env
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
make uv-sync

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Django Configuration
DEBUG=True
SECRET_KEY=$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
EOF
    echo "⚠️  Please set your GEMINI_API_KEY in the .env file"
fi

# Run migrations
echo "🗄️  Running database migrations..."
make migrate

# Build frontend
echo "🎨 Building frontend assets..."
make build-frontend

echo "✅ Setup complete!"
echo ""
echo "To start the development server:"
echo "  make run"
echo ""
echo "Don't forget to:"
echo "  1. Set your GEMINI_API_KEY in the .env file"
echo "  2. Visit http://127.0.0.1:8000/ to use the chat"
echo "  3. Visit http://127.0.0.1:8000/insights/ to view analytics"
