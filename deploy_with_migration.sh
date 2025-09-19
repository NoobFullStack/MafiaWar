#!/bin/bash

# MafiaWar Discord Bot VPS Deployment Script - Complete SQLite Migration
# This script will deploy to VPS and migrate all data from Supabase to SQLite
# Usage: ./deploy_with_migration.sh

set -e  # Exit on any error

echo "🚀 Deploying MafiaWar Discord Bot with COMPLETE Supabase→SQLite Migration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_migration() {
    echo -e "${PURPLE}[MIGRATION]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "src/bot.ts" ]; then
    print_error "This doesn't appear to be the MafiaWar directory!"
    print_error "Please run this script from the project root."
    exit 1
fi

# Check environment variables
print_status "Checking environment configuration..."
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    exit 1
fi

# Check for required environment variables
if ! grep -q "SOURCE_DATABASE_URL" .env; then
    print_error "SOURCE_DATABASE_URL not found in .env (needed for Supabase migration)"
    exit 1
fi

if ! grep -q "DATABASE_URL.*sqlite" .env; then
    print_error "DATABASE_URL not configured for SQLite in .env"
    exit 1
fi

print_success "Environment configuration looks good!"

# Backup existing database if it exists
DB_PATH=$(grep "DATABASE_URL" .env | cut -d'"' -f2 | sed 's/file://' | sed 's/\.\///')
if [ -f "$DB_PATH" ]; then
    BACKUP_PATH="${DB_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
    print_status "Backing up existing database to $BACKUP_PATH"
    cp "$DB_PATH" "$BACKUP_PATH"
    print_success "Database backed up!"
fi

# Check dependencies
print_status "Installing dependencies..."
yarn install --frozen-lockfile || {
    print_error "Dependency installation failed!"
    exit 1
}

print_status "Building TypeScript..."
yarn build || {
    print_error "Build failed!"
    exit 1
}

print_status "Generating Prisma client..."
yarn db:generate || {
    print_error "Prisma generate failed!"
    exit 1
}

# SQLite database setup
print_status "Setting up SQLite database structure..."

# Create data directory if it doesn't exist
DATA_DIR=$(dirname "$DB_PATH")
if [ ! -d "$DATA_DIR" ]; then
    print_status "Creating data directory: $DATA_DIR"
    mkdir -p "$DATA_DIR"
fi

# Initialize database schema
print_status "Initializing SQLite database schema..."
yarn db:migrate || {
    print_error "Database schema migration failed!"
    exit 1
}

# Critical Migration Step
print_migration "🔄 Starting Supabase → SQLite data migration..."
print_migration "This will copy ALL your production data from Supabase to SQLite"
print_migration "Supabase data will remain untouched as backup"

yarn migrate-supabase || {
    print_error "❌ Data migration from Supabase failed!"
    print_error "Your SQLite database schema is ready, but data migration failed."
    print_error "You can retry the migration later with: yarn migrate-supabase"
    exit 1
}

print_success "✅ Data migration completed successfully!"

# Verify migration
print_status "Verifying migrated data..."
USER_COUNT=$(yarn --silent -s node -e "
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
client.user.count().then(count => {
  console.log(count);
  client.\$disconnect();
}).catch(() => {
  console.log(0);
  client.\$disconnect();
});
")

CHAR_COUNT=$(yarn --silent -s node -e "
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
client.character.count().then(count => {
  console.log(count);
  client.\$disconnect();
}).catch(() => {
  console.log(0);
  client.\$disconnect();
});
")

ASSET_COUNT=$(yarn --silent -s node -e "
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
client.asset.count().then(count => {
  console.log(count);
  client.\$disconnect();
}).catch(() => {
  console.log(0);
  client.\$disconnect();
});
")

print_success "📊 Migration verification:"
print_success "   Users: $USER_COUNT"
print_success "   Characters: $CHAR_COUNT"  
print_success "   Assets: $ASSET_COUNT"

if [ "$USER_COUNT" -eq 0 ]; then
    print_warning "No users found - this might indicate a migration issue"
fi

# Seed any missing game data
print_status "Seeding game data (items, crimes, etc.)..."
yarn seed || {
    print_warning "Game data seeding failed - continuing anyway"
}

# Force register Discord commands
print_status "Force registering Discord commands..."
yarn commands:register || {
    print_warning "Command registration failed - commands may not update immediately"
}

# Create logs directory
if [ ! -d "logs" ]; then
    print_status "Creating logs directory..."
    mkdir -p logs
fi

# PM2 deployment
print_status "Deploying with PM2..."

# Stop existing instance if running
if pm2 list | grep -q "mafia-war"; then
    print_status "Stopping existing bot instance..."
    pm2 stop mafia-war || true
    pm2 delete mafia-war || true
fi

# Start the bot
print_status "Starting MafiaWar bot..."
pm2 start ecosystem.config.js || {
    print_error "PM2 start failed!"
    exit 1
}

# Save PM2 process list
pm2 save

print_success "🎉 Deployment completed successfully!"
print_success "🤖 MafiaWar bot is now running on SQLite with all Supabase data migrated!"
print_success ""
print_success "📋 What happened:"
print_success "   ✅ SQLite database created and configured"
print_success "   ✅ All Supabase data migrated to SQLite"
print_success "   ✅ Supabase remains available as backup"
print_success "   ✅ Bot deployed and running with PM2"
print_success ""
print_success "📊 Database stats:"
print_success "   Users: $USER_COUNT | Characters: $CHAR_COUNT | Assets: $ASSET_COUNT"
print_success ""
print_success "🔍 Check status with:"
print_success "   pm2 status"
print_success "   pm2 logs mafia-war"
print_success ""
print_warning "⚠️  Remember: You can keep Supabase as backup until you're 100% confident"
print_warning "⚠️  Test all bot functionality thoroughly before decommissioning Supabase"