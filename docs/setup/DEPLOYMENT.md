# 🚀 VPS Deployment Guide

Complete guide for deploying MafiaWar Discord Bot on your VPS using PM2 (similar to your Next.js setup).

## 📋 Prerequisites

### **On Your VPS**
- ✅ Node.js (v18+ recommended)
- ✅ PM2 already installed (since you're using it for Next.js)
- ✅ Git for repository cloning
- ✅ PostgreSQL database (local or hosted like Supabase)

### **Discord Setup Required**
- ✅ Discord Application created at [Discord Developer Portal](https://discord.com/developers/applications)
- ✅ Bot token generated
- ✅ Bot invited to your server with proper permissions

## 🛠️ Step 1: Clone and Setup

```bash
# Clone your repository
cd ~/projects/discord  # Your actual VPS directory structure
git clone https://github.com/NoobFullStack/MafiaWar.git mafiawar
cd mafiawar

# Install dependencies
npm install

# Build the TypeScript
npm run build
```

## 🔑 Step 2: Environment Configuration

Create your production environment file:

```bash
# Create production environment file
cp .env.example .env
```

Configure your `.env` file with production values:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here

# Database Configuration (Supabase or your PostgreSQL)
DATABASE_URL="postgresql://username:password@host:5432/mafia_war_prod"

# Supabase Configuration (if using)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# VPS Deployment Configuration (for PM2)
VPS_HOST=your_vps_ip_address
VPS_USER=debian
BOT_CWD=/home/debian/projects/discord/mafiawar

# Environment
NODE_ENV=production
```

## 🗃️ Step 3: Database Setup

```bash
# Generate Prisma client for production
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the game data (items, crimes, assets)
npm run seed
```

## ⚙️ Step 4: PM2 Configuration

Create a PM2 ecosystem file for your bot:

```bash
# Create PM2 configuration
touch ecosystem.config.js
```

Add this configuration to `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'mafia-war-bot',
      script: 'dist/bot.js',
      cwd: process.env.BOT_CWD || '/home/debian/projects/discord/mafiawar',  // From .env
      instances: 1,  // Discord bots should run single instance
      exec_mode: 'fork',  // Not cluster mode for Discord bots
      
      // Environment
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      
      // Auto-restart configuration
      watch: false,  // Don't watch files in production
      max_restarts: 10,
      restart_delay: 5000,
      
      // Logging
      log_file: './logs/bot.log',
      out_file: './logs/bot-out.log',
      error_file: './logs/bot-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Memory management
      max_memory_restart: '300M',
      
      // Process management
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Auto-restart on file changes (disabled in production)
      ignore_watch: ['node_modules', 'logs', '.git']
    }
  ]
};
```

## 🚀 Step 5: Deploy with PM2

```bash
# Create logs directory
mkdir -p logs

# Start the bot with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration for auto-restart on reboot
pm2 save

# Setup PM2 to start on system boot (if not already done)
pm2 startup
# Follow the instructions PM2 provides
```

## 📊 Step 6: Monitoring and Management

### **PM2 Commands for Your Bot**

```bash
# View bot status
pm2 status mafia-war-bot

# View logs (real-time)
pm2 logs mafia-war-bot

# View logs (last 100 lines)
pm2 logs mafia-war-bot --lines 100

# Restart the bot
pm2 restart mafia-war-bot

# Stop the bot
pm2 stop mafia-war-bot

# Delete from PM2 (stops and removes)
pm2 delete mafia-war-bot

# Monitor resource usage
pm2 monit
```

### **View All Your Applications**
```bash
# See all PM2 processes (Next.js sites + Discord bot)
pm2 list
```

## 🔄 Step 7: Deployment Script (Optional)

Create a deployment script for easy updates:

```bash
# Create deployment script
touch deploy.sh
chmod +x deploy.sh
```

Add this to `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying MafiaWar Discord Bot..."

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run any new migrations
npm run db:migrate

# Restart the bot
pm2 restart mafia-war-bot

echo "✅ Deployment complete!"
pm2 status mafia-war-bot
```

## 🛡️ Security Best Practices

### **1. Environment Variables for VPS Configuration**
- All VPS-specific settings are now in `.env` file (not committed to Git)
- `VPS_HOST`: Your server IP address
- `VPS_USER`: Your server username (typically `debian`)
- `BOT_CWD`: Full path to your bot directory on the VPS

### **2. Single Instance Only**
- Discord bots should **NOT** use PM2 cluster mode
- Use `instances: 1` and `exec_mode: 'fork'`
- Multiple instances would cause conflicts with Discord's Gateway

### **2. Memory Management**
- Set `max_memory_restart` to prevent memory leaks
- Monitor memory usage with `pm2 monit`
- Discord.js typically uses 50-200MB for most bots

### **3. Error Handling**
- Configure `max_restarts` to prevent infinite restart loops
- Set `restart_delay` to avoid rapid restarts
- Monitor error logs regularly

### **4. Database Connections**
- Ensure your DATABASE_URL is accessible from the VPS
- Test database connectivity before deployment
- Consider connection pooling for production

### **5. Security**
- Keep `.env` file secure with proper permissions
- Never commit tokens to git
- Use environment variables for all secrets

## 🔍 Troubleshooting

### **Common Issues**

#### **Bot Won't Start**
```bash
# Check logs
pm2 logs mafia-war-bot

# Common issues:
# - Invalid Discord token
# - Database connection failure
# - Missing environment variables
```

#### **Bot Disconnects Frequently**
```bash
# Check for memory issues
pm2 monit

# Restart with increased memory limit
pm2 restart mafia-war-bot --max-memory-restart 500M
```

#### **Database Connection Issues**
```bash
# Test database connection
npm run db:generate

# Check if migrations are up to date
npm run db:migrate
```

### **Health Checking**

Add this to your PM2 config for health monitoring:

```javascript
// Add to ecosystem.config.js apps array
health_check_url: 'http://localhost:3001/health',  // If you add a health endpoint
health_check_grace_period: 10000,
```

## 📈 Monitoring Dashboard

### **PM2 Plus (Optional)**
For advanced monitoring, you can connect to PM2 Plus:

```bash
# Link to PM2 Plus for web dashboard
pm2 link <secret_key> <public_key>
```

## 🔄 Auto-Deployment with GitHub Actions (Advanced)

For automated deployments when you push to main:

```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/MafiaWar
            ./deploy.sh
```

## ✅ Verification Checklist

After deployment, verify:

- [ ] Bot appears online in Discord
- [ ] Commands respond correctly (`/ping`)
- [ ] Database operations work (`/profile`)
- [ ] PM2 shows bot as running
- [ ] Logs show no errors
- [ ] Bot survives server restart

---

**Your Discord bot will now run alongside your Next.js applications, managed by PM2 with automatic restarts!** 🎉

## 🎯 Quick Deployment Commands

```bash
# One-time setup
git clone your-repo && cd MafiaWar
npm install && npm run build
cp .env.example .env  # Then edit with your values
npm run db:migrate && npm run seed

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save

# Future updates
git pull && npm install && npm run build
pm2 restart mafia-war-bot
```
