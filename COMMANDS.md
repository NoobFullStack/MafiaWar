# 🎮 MafiaWar Discord Bot - Commands Reference

Complete list of all available commands for server administrators and users.

## 📋 Quick Command List (Copy-Paste Ready)

```
/help
/user-create
/user-delete
/profile
/wallet
/bank deposit <amount>
/bank withdraw <amount>
/bank balance
/bank upgrade
/crypto price
/crypto buy <amount>
/crypto sell <amount>
/crypto portfolio
/crime <type>
/jail status
/jail bribe
/assets
/business buy <asset>
/business list
/business collect
/business sell <asset>
/ping
```

## 🎯 Essential Commands for New Users

**Getting Started:**
```
/user-create
/profile
/help getting-started
```

**Basic Money Management:**
```
/wallet
/bank deposit 500
/crime pickpocket
```

**Growing Your Empire:**
```
/assets
/business buy <choose_from_list>
/business collect
```

## 📖 Detailed Command Reference

### 👤 **User Management**
- `/user-create` - Create your criminal character and join the game
- `/user-delete` - ⚠️ Permanently delete your account and all data
- `/profile` - View your character stats, level, and progress

### 💰 **Economy & Money**
- `/wallet` - View your complete money portfolio (cash, bank, crypto)
- `/bank deposit <amount>` - Deposit cash into your bank account
- `/bank withdraw <amount>` - Withdraw money from your bank account
- `/bank balance` - Check your current bank balance
- `/bank upgrade` - Upgrade your bank account tier for better benefits

### ₿ **Cryptocurrency Trading**
- `/crypto price` - View current cryptocurrency market price
- `/crypto buy <amount>` - Purchase cryptocurrency with cash or bank funds
- `/crypto sell <amount>` - Sell cryptocurrency for cash
- `/crypto portfolio` - View your cryptocurrency holdings and values

### 🔫 **Crime & Activities**
- `/crime <type>` - Commit a specific crime for money and experience
  - Available crime types: `pickpocket`, `shoplifting`, `burglary`, `car_theft`, `bank_robbery`, `heist`, etc.
- `/jail status` - Check if you're currently in jail
- `/jail bribe` - Pay to get out of jail early

### 🏢 **Business & Assets**
- `/assets` - Browse available businesses and properties to purchase
- `/business buy <asset>` - Purchase a business asset
- `/business list` - View your owned businesses and their profits
- `/business collect` - Collect profits from all your businesses
- `/business sell <asset>` - Sell one of your businesses

### ❓ **Help & Information**
- `/help` - View all commands and game information with interactive menu
- `/help getting-started` - New player step-by-step guide
- `/help crimes` - View all available crimes and requirements
- `/help economy` - Money management commands
- `/help business` - Business and asset commands
- `/ping` - Check if the bot is responsive

## 🚀 Server Setup Commands (Admin Only)

These are **NOT** Discord slash commands - these are setup commands for the server host:

### **Bot Deployment:**
```bash
# Deploy the bot
./deploy.sh

# Register commands manually
yarn commands:register

# Check bot status
pm2 status mafia-war-bot

# View bot logs
pm2 logs mafia-war-bot
```

### **Database Management:**
```bash
# Run database migrations
yarn db:migrate

# Seed initial data
yarn seed

# Open database admin interface
yarn db:studio
```

### **Development Commands:**
```bash
# Build the bot
yarn build

# Start in development mode
yarn dev

# Register commands to test server instantly
yarn commands:dev
```

## 🎮 Game Flow for New Players

**Copy this guide for your server:**

```
🎭 Welcome to MafiaWar! Here's how to start your criminal empire:

1️⃣ **Create Your Character**
   `/user-create` - Join the underworld

2️⃣ **Check Your Status** 
   `/profile` - See your stats and money

3️⃣ **Start Making Money**
   `/crime pickpocket` - Easy starter crime
   `/help crimes` - See all available crimes

4️⃣ **Secure Your Earnings**
   `/bank deposit 500` - Keep money safe from jail

5️⃣ **Grow Your Empire**
   `/assets` - Browse businesses to buy
   `/business buy <name>` - Purchase income sources

6️⃣ **Advanced Features**
   `/crypto buy 100` - High-risk trading
   `/business collect` - Gather all profits

💡 Pro Tips:
• Use `/help` for complete command guide
• Bank your money to protect it from jail
• Level up by committing crimes to unlock better opportunities
• Buy businesses for passive income while offline
```

## ⚠️ Important Notes for Server Admins

1. **Command Registration**: After deploying, commands may take up to 1 hour to appear globally. Use `yarn commands:dev` for instant testing.

2. **Environment Setup**: Ensure `.env` file has all required Discord tokens and database connections.

3. **Database**: Run `yarn db:migrate` and `yarn seed` after first deployment.

4. **Monitoring**: Use `pm2 logs mafia-war-bot` to monitor bot activity and errors.

5. **Updates**: Always run `./deploy.sh` for updates - it handles build, migrations, and command registration automatically.

## 📊 Command Categories Summary

| Category | Commands | Purpose |
|----------|----------|---------|
| **User** | 3 commands | Account management |
| **Economy** | 4 commands | Money management |
| **Crypto** | 4 commands | Trading system |
| **Crime** | 2 commands | Core gameplay |
| **Business** | 4 commands | Empire building |
| **System** | 2 commands | Help & utilities |

**Total: 19 slash commands** available to users.

---

🎯 **Ready to rule the underworld?** Start with `/user-create` and build your criminal empire!