# 🚀 VPS Deployment Guide - Supabase to SQLite Migration

## 📋 Quick Answer: Use `./deploy_with_migration.sh`

For your VPS deployment, use the **all-in-one deployment script** that handles everything:

```bash
./deploy_with_migration.sh
```

This script will:
- ✅ Create SQLite database file on VPS
- ✅ Copy ALL Supabase data to SQLite
- ✅ Deploy bot with PM2
- ✅ Keep Supabase as backup

## 🛠️ Migration Scripts Explained

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `./deploy_with_migration.sh` | **🎯 VPS DEPLOYMENT** | Production deployment with full migration |
| `yarn migrate-supabase` | Safe data copy | Manual data migration only |
| `yarn migrate-force` | Personal fix | Fixed your local character data |
| `yarn migrate-complete` | Nuclear option | Full database replacement (risky) |

## 🚀 VPS Deployment Steps

### 1. Prepare Your VPS
```bash
# On your VPS, ensure you have:
- Node.js (v18+)
- Yarn package manager
- PM2 process manager
- Git
```

### 2. Clone/Update Repository
```bash
git clone https://github.com/NoobFullStack/MafiaWar.git
cd MafiaWar
git checkout copilot/fix-58
```

### 3. Configure Environment
```bash
# Copy your .env file to VPS with:
# - SOURCE_DATABASE_URL (Supabase connection)
# - DATABASE_URL="file:./data/production.db" 
# - All your Discord tokens, etc.
```

### 4. Run Deployment
```bash
./deploy_with_migration.sh
```

## 📊 What the Deployment Does

1. **Creates SQLite database file** (`./data/production.db`)
2. **Migrates ALL data from Supabase:**
   - 8 Users → SQLite
   - 8 Characters → SQLite  
   - 37+ Assets → SQLite
   - 12 Items → SQLite
   - Action logs, transactions, etc.
3. **Deploys bot with PM2**
4. **Keeps Supabase untouched** as backup

## ✅ Verification

After deployment, check:
```bash
pm2 status                    # Bot running
pm2 logs mafia-war           # Bot logs
sqlite3 data/production.db ".tables"  # Database exists
```

## 🛡️ Safety Features

- **Automatic database backup** before migration
- **Supabase remains untouched** (safe fallback)
- **Migration can be run multiple times** safely
- **Rollback possible** by switching DATABASE_URL back to Supabase

## 🎯 Production Checklist

- [ ] VPS environment ready (Node.js, Yarn, PM2)
- [ ] `.env` file configured with SQLite DATABASE_URL
- [ ] SOURCE_DATABASE_URL points to Supabase
- [ ] Run `./deploy_with_migration.sh`
- [ ] Test all bot functionality
- [ ] Monitor logs with `pm2 logs mafia-war`

## 🔍 Post-Deployment Testing

Test these commands in Discord:
- `/profile` - Verify your character data migrated
- `/assets` - Check business assets
- `/crime` - Test game mechanics
- `/bank` - Verify financial data

**Everything should work exactly as before, but now running on SQLite!**