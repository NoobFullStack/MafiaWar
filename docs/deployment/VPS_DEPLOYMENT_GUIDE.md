# 🚀 VPS Deployment Guide - SQLite

## 📋 Current Deployment Method: Use `./deploy_sqlite.sh`

For your VPS deployment, use the **current deployment script**:

```bash
./deploy_sqlite.sh
```

This script will:

- ✅ Set up SQLite database
- ✅ Install dependencies
- ✅ Build and deploy bot with PM2
- ✅ Handle all necessary configurations

## 📁 Legacy Scripts (Archived)

The migration scripts `deploy_with_migration.sh` and `deploy.sh` have been moved to the `archive/` folder as they are no longer needed for regular deployments.

## 🛠️ Migration Scripts Explained

**Current deployment method:** Use `./deploy_sqlite.sh` for all VPS deployments.

| Script                 | Purpose                     | Status                    |
| ---------------------- | --------------------------- | ------------------------- |
| `./deploy_sqlite.sh`   | **🎯 CURRENT VPS DEPLOYMENT** | ✅ Use this for production |
| `./deploy_with_migration.sh` | Legacy migration script | 📁 Archived (no longer needed) |
| `yarn migrate-supabase` | Manual data copy           | ⚠️ Migration only (if needed) |

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
# Copy environment template
cp .env.example .env
nano .env  # Edit with your preferred editor
```

**Essential SQLite Configuration:**

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here

# SQLite Database (current method)
DATABASE_URL="file:./data/production.db"

# Optional: Bot Customization
BOT_NAME=MafiaWar                     # Change to your server's theme
BOT_THEME_COLOR=0x1a5c96             # Custom color theme
BOT_CURRENCY_SYMBOL=$                # Custom currency symbol
BOT_CURRENCY_NAME=dollars            # Custom currency name

# Environment
NODE_ENV=production
```

**Bot Customization Examples:**

| Server Theme | Suggested Bot Name | Theme Color | Currency |
| ------------ | ------------------ | ----------- | -------- |
| Sci-Fi       | `The Nexus Wars`   | `0x1a5c96`  | credits  |
| Fantasy      | `Realm Conquest`   | `0x8b4513`  | gold     |
| Modern Crime | `Street Empire`    | `0x800080`  | dollars  |
| Cyberpunk    | `Neo Syndicate`    | `0x00ff00`  | tokens   |
| Military     | `Operation Chaos`  | `0x4b5320`  | credits  |

> **Important:** The `BOT_NAME` setting changes all user-facing text, embeds, and command descriptions.

### 4. Run Deployment

```bash
./deploy_sqlite.sh
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
- [ ] Run `./deploy_sqlite.sh`
- [ ] Test all bot functionality
- [ ] Monitor logs with `pm2 logs mafia-war`

## 🔍 Post-Deployment Testing

Test these commands in Discord:

- `/profile` - Verify your character data migrated
- `/assets` - Check business assets
- `/crime` - Test game mechanics
- `/bank` - Verify financial data

**Everything should work exactly as before, but now running on SQLite!**
