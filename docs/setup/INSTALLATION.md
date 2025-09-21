# 🎮 MafiaWar Discord Bot - Setup Guide

Your modular, maintainable Discord bot infrastructure is now ready! Here's what we've built:

## 🏗️ **Architecture Overview**

### **Modular Command System**

- 📁 `src/commands/` - Individual command files with auto-loading
- 🔧 `src/utils/CommandManager.ts` - Command registration & cooldown management
- 📝 `src/types/command.ts` - TypeScript interfaces for type safety

### **Database Integration**

- 🗄️ `src/utils/DatabaseManager.ts` - Prisma client wrapper
- 🔄 **Auto-user registration**: Users created automatically on first command use
- 📊 Built-in action logging and character management

### **Error Handling & Response System**

- 🚨 `src/utils/ResponseUtil.ts` - Centralized error handling
- 📋 Consistent Discord embed responses (success, error, info, warning)
- 🎨 Pre-built game profile templates

## 🚀 **Working Commands**

### **`/ping`**

- ✅ Tests bot connectivity and latency
- ⏱️ 5-second cooldown

### **`/profile`**

- 👤 Shows character stats, money, reputation, level
- 📊 Displays owned assets and gang memberships
- 🆕 Auto-creates character for new users (starts with $1,000 and level 1)
- ⏱️ 10-second cooldown

### **`/wallet`**

- 💰 Complete portfolio view with cash, bank, and crypto
- 📈 Strategic recommendations and wealth distribution
- 🏆 Displays wealth tier and security analysis
- ⏱️ 5-second cooldown

### **`/bank`**

- 🏦 Banking operations (deposit, withdraw, info, upgrade)
- 🛡️ Secure money from player theft
- 📊 View bank tier benefits and fees
- ⏱️ 10-second cooldown

### **`/crime`** & **`/help crimes`**

- 🔫 Execute criminal activities for money and XP
- 📋 View available crimes and requirements
- 💰 Strategic payouts in cash, bank, or crypto
- ⏱️ Variable cooldowns based on crime difficulty

### **`/wallet`**

- 💰 Complete portfolio view with cash, bank, and crypto
- 📈 Strategic recommendations and wealth distribution
- 🏆 Displays wealth tier and security analysis
- ⏱️ 5-second cooldown
  Your modular, maintainable Discord bot infrastructure is now ready! Here's what we've built:

## 🏗️ **Architecture Overview**

### **Modular Command System**

- 📁 `src/commands/` - Individual command files with auto-loading
- 🔧 `src/utils/CommandManager.ts` - Command registration & cooldown management
- 📝 `src/types/command.ts` - TypeScript interfaces for type safety

### **Database Integration**

- 🗄️ `src/utils/DatabaseManager.ts` - Prisma client wrapper
- 🔄 **Auto-user registration**: Users created automatically on first command use
- 📊 Built-in action logging and character management

### **Error Handling & Response System**

- 🚨 `src/utils/ResponseUtil.ts` - Centralized error handling
- 📋 Consistent Discord embed responses (success, error, info, warning)
- 🎨 Pre-built game profile templates

## ⚙️ **Setup & Deployment**

### **Environment Configuration**

Create a `.env` file with:

```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DATABASE_URL=your_supabase_connection_string
DIRECT_URL=your_supabase_direct_connection
NODE_ENV=development
```

### **Essential Bot Permissions**

⚠️ **IMPORTANT**: Your bot must be invited with these scopes:

- ✅ `bot`
- ✅ `applications.commands` ← **Required for slash commands!**

**Use this invite URL format:**

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2048&scope=bot%20applications.commands
```

### **Development Workflow**

```bash
# Install dependencies
yarn install

# Generate Prisma client
yarn db:generate

# Apply database migrations
yarn db:migrate

# Development mode (auto-reload)
yarn dev

# Production build
yarn build
yarn start

# Database management
yarn db:studio      # Open database GUI
yarn db:reset       # Reset database (dev only)
```

## 🛠️ **Adding New Commands**

Create a new file in `src/commands/` (e.g., `crime.ts`):

```typescript
import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext, CommandResult } from "../types/command";
import { ResponseUtil } from "../utils/ResponseUtil";

const crimeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("crime")
    .setDescription("Commit a crime for money and experience")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Type of crime to commit")
        .setRequired(true)
        .addChoices(
          { name: "Pickpocket", value: "pickpocket" },
          { name: "Rob Store", value: "rob_store" },
          { name: "Bank Heist", value: "bank_heist" }
        )
    ),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction } = context;
    const crimeType = interaction.options.getString("type", true);

    // Your game logic here
    const embed = ResponseUtil.success(
      "Crime Successful!",
      `You successfully completed a ${crimeType} and earned $500!`
    );

    await interaction.reply({ embeds: [embed] });
    return { success: true };
  },

  cooldown: 30,
  category: "game",
};

export default crimeCommand;
```

Commands are automatically loaded on bot restart!

## 🎯 **Ready for Game Features**

Your foundation supports easy implementation of:

- � **Crime System** - Risk/reward mechanics with jail time
- 🎯 **Mission System** - Daily tasks and story progression
- 🏢 **Asset System** - Passive income properties
- 👥 **Gang System** - Social features and cooperation
- ⚔️ **PvP Mechanics** - Asset robberies and player battles

## 🔧 **Key Features**

✅ **Auto-user registration** - No complex authentication needed
✅ **Type-safe** - Full TypeScript support with Prisma
✅ **Modular design** - Easy to maintain and extend
✅ **Robust error handling** - User-friendly error messages
✅ **Action logging** - Track all player activities
✅ **Built-in cooldowns** - Spam prevention
✅ **Production-ready** - Proper logging and error management

## 🧪 **Testing Your Setup**

1. Ensure `.env` file is configured
2. Run `yarn db:migrate` to set up database
3. Start bot with `yarn dev`
4. In Discord, type `/` to see available commands
5. Test with `/ping`, `/profile`, and `/wallet`

## 🐛 **Troubleshooting**

**Slash commands not appearing?**

- Verify bot has `applications.commands` scope
- Re-invite bot with correct permissions URL
- Check DISCORD_CLIENT_ID in `.env`

**Database connection issues?**

- Verify DATABASE_URL and DIRECT_URL in `.env`
- Run `yarn db:generate` after schema changes
- Check Supabase connection pooling settings

**Bot not responding?**

- Check bot token is valid in `.env`
- Verify bot is online in Discord Developer Portal
- Check terminal logs for error messages

Your bot is now ready for game development! The solid foundation handles all the complex infrastructure - focus on building exciting criminal gameplay features! 🎮
