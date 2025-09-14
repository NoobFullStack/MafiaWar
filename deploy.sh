#!/bin/bash

# MafiaWar Discord Bot Deployment Script
# Usage: ./deploy.sh

set -e  # Exit on any error

echo "🚀 Deploying MafiaWar Discord Bot..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "src/bot.ts" ]; then
    print_error "This doesn't appear to be the MafiaWar directory!"
    print_error "Please run this script from the project root."
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 is not installed! Please install it first:"
    echo "npm install -g pm2"
    exit 1
fi

print_status "Pulling latest changes from Git..."
git pull origin main || {
    print_warning "Git pull failed or no changes to pull"
}

print_status "Installing/updating dependencies..."
npm install || {
    print_error "npm install failed!"
    exit 1
}

print_status "Building TypeScript..."
npm run build || {
    print_error "Build failed!"
    exit 1
}

print_status "Generating Prisma client..."
npm run db:generate || {
    print_error "Prisma generate failed!"
    exit 1
}

print_status "Running database migrations..."
npm run db:migrate || {
    print_warning "Database migration failed or no new migrations"
}

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    print_status "Creating logs directory..."
    mkdir -p logs
fi

# Check if the bot is already running
if pm2 describe mafia-war-bot > /dev/null 2>&1; then
    print_status "Restarting existing bot instance..."
    pm2 restart mafia-war-bot
else
    print_status "Starting new bot instance..."
    pm2 start ecosystem.config.js --env production
    
    print_status "Saving PM2 configuration..."
    pm2 save
fi

# Verify deployment
sleep 3
print_status "Verifying deployment..."

if pm2 describe mafia-war-bot > /dev/null 2>&1; then
    STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="mafia-war-bot") | .pm2_env.status')
    
    if [ "$STATUS" = "online" ]; then
        print_success "🎉 Deployment successful!"
        echo ""
        echo "Bot Status:"
        pm2 status mafia-war-bot
        echo ""
        echo "Recent logs:"
        pm2 logs mafia-war-bot --lines 10 --nostream
        echo ""
        print_success "✅ MafiaWar Discord Bot is running!"
        echo ""
        echo "Useful commands:"
        echo "  View logs:    pm2 logs mafia-war-bot"
        echo "  Restart bot:  pm2 restart mafia-war-bot"
        echo "  Stop bot:     pm2 stop mafia-war-bot"
        echo "  Monitor:      pm2 monit"
    else
        print_error "❌ Bot is not running properly!"
        echo "Current status: $STATUS"
        echo ""
        echo "Check logs for errors:"
        pm2 logs mafia-war-bot --lines 20 --nostream
        exit 1
    fi
else
    print_error "❌ Failed to start the bot!"
    exit 1
fi

print_success "🎯 Deployment complete! Your Discord bot is live!"
