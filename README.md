# 🎮 MafiaWar Discord Bot

A text-based multiplayer mafia game for Discord, inspired by bootleggers.us. Build your criminal empire, commit crimes, manage assets, and compete with other players in an immersive criminal underworld.

## 🌟 Features

### **Currently Implemented**

- 👤 **Character System** - Automatic user registration with stats (strength, stealth, intelligence)
- 💰 **Multi-Layered Money System** - Strategic three-tier money management (cash, bank, crypto)
- 🔒 **Privacy Controls** - Configurable privacy settings with smart public/private balance
- 🎯 **XP & Level System** - MMO-style progression with 50 levels and milestone rewards
- 🛡️ **Level Gating** - Content unlocks based on player level and progression
- 🔫 **Crime System** - 9 criminal activities with strategic payouts and real-time execution
- 🏢 **Asset System** - Complete business management with 6 asset types and passive income
- 📊 **Profile Management** - View character stats, level, XP progress, and reputation
- ⚡ **Performance Optimization** - Atomic transactions, timeout handling, race condition prevention
- 🛡️ **Cooldown System** - Built-in spam protection with deferred interactions
- 🗄️ **Database Integration** - SQLite3 with Prisma ORM and comprehensive logging
- 🌱 **Advanced Seeding** - Safe, extensible data management system
- 📈 **Economic Analysis** - Real-time balance validation and XP progression analysis

### **Asset Management System** ✨ NEW

- **6 Business Types** - From convenience stores to underground casinos
- **Strategic Income Distribution** - Businesses generate cash, bank, and crypto income
- **Upgrade System** - Improve income rates and security levels
- **Risk Management** - Each business has raid vulnerability and market sensitivity
- **Level-Gated Content** - Assets unlock as players progress
- **Atomic Transactions** - Race condition prevention for reliable purchases
- **Income Collection** - Automated passive income generation with multi-tier distribution

### **Planned Features**

- 📢 **Community Engagement** - Public achievements and social features (planned)
- 🎯 **Mission System** - Daily tasks and story-driven progression
- 👥 **Gang System** - Social features and cooperative gameplay
- ⚔️ **PvP Mechanics** - Asset robberies and player vs player combat
- 📈 **Leaderboards** - Rankings for money, reputation, and achievements

## 🛠️ Installation & Setup

### **Environment Configuration**

1. **Copy the environment template:**

   ```bash
   cp .env.example .env
   ```

2. **Configure your bot settings:**

   ```env
   # Discord Configuration
   DISCORD_BOT_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here

   # Bot Customization
   BOT_NAME=YourBotName              # Customize your bot's name
   BOT_THEME_COLOR=0x800080          # Primary embed color (hex)
   BOT_CURRENCY_SYMBOL=$             # Currency symbol
   BOT_CURRENCY_NAME=dollars         # Currency name

   # Database
   DATABASE_URL=your_database_url
   DIRECT_URL=your_direct_database_url
   ```

3. **Bot Name Examples:**
   - `BOT_NAME=Criminal Empire` - For crime/mafia themes
   - `BOT_NAME=Street Lords` - For urban themes
   - `BOT_NAME=Shadow Syndicate` - For dark/mystery themes

> **Note:** The bot name appears in all embeds, commands, and user-facing text. Choose something that fits your server's theme!

### **Database Setup**

For detailed setup instructions, see [Installation Guide](docs/setup/INSTALLATION.md)

## 🎯 Unique Systems

### **💰 Multi-Layered Strategic Money Management**

MafiaWar features a sophisticated **three-tier money system** for strategic risk management:

- **💵 Cash (On Hand)** - Immediate access but vulnerable to player theft
- **🏦 Bank Account** - Protected from players but subject to government raids/IRS seizures
- **₿ Cryptocurrency** - Protected from all threats but subject to market volatility

**Strategic Income Distribution**: Assets generate income across all three tiers based on business type:

- **Legitimate businesses** - Mostly cash and bank income
- **Semi-legal operations** - Balanced distribution with some crypto
- **Illegal enterprises** - Heavy crypto focus for anonymity

Players must strategically balance liquidity, security, and growth potential across all three tiers.

### **🏢 Asset Management System**

**Business Categories:**

- **🏪 Legitimate** - Convenience stores, restaurants (low risk, steady income)
- **🎭 Semi-Legal** - Pawn shops, nightclubs (medium risk, good profits)
- **🕴️ Illegal** - Warehouses, casinos (high risk, massive returns)

**Advanced Features:**

- **Income Distribution** - Each business generates income across cash/bank/crypto
- **Upgrade Paths** - Improve income rates and security levels
- **Risk Profiles** - Raid vulnerability, market sensitivity, seasonality
- **Level Requirements** - Content unlocks with player progression
- **Transaction Safety** - Atomic purchases prevent race conditions and duplicates

### **🧮 Gameplay Economy with XP Progression**

Unlike other bots with arbitrary pricing, MafiaWar uses **real gameplay analysis**:

- **Performance Optimized** - Atomic transactions, timeout handling, deferred interactions
- Items and assets priced based on actual crime earnings and XP value
- MMO-style progression with 50 levels and milestone rewards
- Strategic crime and asset payouts distributed across all money tiers
- 1-5 hour payback periods for meaningful progression
- Dynamic balance recommendations including XP economic valuation

### **🔒 Level Gating System**

Content unlocks naturally with player progression:

- Items, crimes, and assets locked behind level requirements
- Clear progression path from Street Thug to Underworld King
- Realistic timing: Level 15 takes ~52 days, Level 30 takes ~285 days
- Multiple requirement checks: level, stats, money, reputation

### **🌱 Smart Seeding & Data Management**

Extensible data management that grows with your game:

- Safe upserts prevent data loss
- Incremental updates for new content
- Automatic validation and integrity checks
- Cleanup scripts for data maintenance

## 🚀 Quick Start

### **Prerequisites**

- Node.js 18+
- SQLite3 database
- Discord Bot Token

### **Installation**

1. **Clone the repository**

   ```bash
   git clone https://github.com/NoobFullStack/MafiaWar.git
   cd MafiaWar
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your Discord bot token and database URL
   ```

4. **Set up database**

   ```bash
   yarn db:generate
   yarn db:migrate
   ```

5. **Start the bot**
   ```bash
   yarn dev
   ```

### **Bot Permissions**

⚠️ **Important**: Invite your bot with these scopes:

- `bot`
- `applications.commands`

**Invite URL format:**

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2048&scope=bot%20applications.commands
```

## 🎮 Commands

| Command          | Description                            | Cooldown |
| ---------------- | -------------------------------------- | -------- |
| `/ping`          | Test bot connectivity and latency      | 5s       |
| `/profile`       | View your criminal character profile   | 10s      |
| `/wallet`        | View your complete money portfolio     | 5s       |
| `/bank <action>` | Manage bank deposits, withdrawals      | 10s      |
| `/crime <type>`  | Commit crimes for money and XP         | 30s      |
| `/help`          | View all commands and game information | 5s       |

### **🏢 Asset Management Commands** ✨ NEW

| Command                    | Description                                    | Cooldown |
| -------------------------- | ---------------------------------------------- | -------- |
| `/assets [category]`       | Browse available businesses to purchase        | 5s       |
| `/business buy <asset>`    | Purchase a business asset with payment options | 3s       |
| `/business list`           | View your owned business portfolio             | 3s       |
| `/business collect`        | Collect income from all your assets            | 3s       |
| `/business upgrade <type>` | Upgrade asset income or security levels        | 3s       |

### **🚧 Commands In Development**

| Command            | Description                          | Status     |
| ------------------ | ------------------------------------ | ---------- |
| `/crypto <action>` | Trade cryptocurrencies               | Data Ready |
| `/items`           | View available items and tools       | Data Ready |
| `/buy <item>`      | Purchase items with various payments | Data Ready |

### **🔧 Development & Maintenance Commands**

| Command                   | Description                                  |
| ------------------------- | -------------------------------------------- |
| `yarn economy:analyze`    | Complete economy and XP progression analysis |
| `yarn level:demo`         | Demonstrate level gating system              |
| `yarn crime:demo`         | Test crime system and success calculations   |
| `yarn economy:validate`   | Validate item balance and pricing            |
| `yarn cleanup:duplicates` | Remove duplicate assets (with --execute)     |
| `yarn assets:validate`    | Validate asset templates and requirements    |

## 🏗️ Architecture

```
src/
├── commands/          # Slash command implementations
├── config/           # Economy config and XP progression system
├── data/             # Game data (items, crimes, assets) with level requirements
├── services/         # Business logic (CrimeService, etc.)
├── utils/            # Core utilities (database, logging, level validation)
├── scripts/          # Analysis and demonstration scripts
├── types/            # TypeScript type definitions
└── bot.ts           # Main bot entry point

prisma/
├── schema.prisma    # Database schema
└── migrations/      # Database migration files

docs/
├── setup/             # Installation and configuration guides
├── economy/           # Economic analysis and balance documentation
├── development/       # Development documentation and planning
└── README.md         # Documentation index
```

## 🛠️ Development

### **Adding New Commands**

1. Create a new file in `src/commands/` (e.g., `crime.ts`)
2. Implement the command interface:

```typescript
import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext, CommandResult } from "../types/command";

const crimeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("crime")
    .setDescription("Commit a crime for money and experience"),

  async execute(context: CommandContext): Promise<CommandResult> {
    // Command logic here
    return { success: true };
  },

  cooldown: 30,
  category: "game",
};

export default crimeCommand;
```

3. Restart the bot - commands are auto-loaded!

### **Database Operations**

```bash
# Generate Prisma client after schema changes
yarn db:generate

# Create and apply new migration
yarn db:migrate

# Open database GUI
yarn db:studio

# Reset database (development only)
yarn db:reset
```

### **Available Scripts**

```bash
yarn dev        # Development mode with auto-reload
yarn build      # Build for production
yarn start      # Run production build
yarn lint       # Run TypeScript checks
```

## 📚 Documentation

- 🚀 **[Installation Guide](./docs/setup/INSTALLATION.md)** - Complete setup instructions and configuration
- 🎮 **[Game Design](./docs/development/game-design.md)** - Core gameplay mechanics and features
- 🗺️ **[Development Roadmap](./docs/development/roadmap.md)** - Project phases and timeline
- 💡 **[Feature Ideas](./docs/development/feature-ideas.md)** - Command concepts and future features
- � **[Communications Planning](./docs/development/communications-planning.md)** - Public vs private message strategy
- 🏢 **[Asset Integration](./docs/development/ASSET_INTEGRATION.md)** - Asset system implementation details
- 💰 **[Money System](./docs/economy/MONEY_SYSTEM.md)** - Multi-tier financial architecture
- 📊 **[Economics Analysis](./docs/economy/ECONOMICS.md)** - Balance validation and progression
- �📖 **[Full Documentation](./docs/README.md)** - Complete documentation index

## 🛠️ Recent Improvements

### **SQLite3 Migration & Write Queue System** 🚀 (September 2024)

- **Complete migration from PostgreSQL/Supabase to SQLite3** for simplified deployment
- **Custom write queue system** with batching, retries, and error handling
- **Asynchronous write processing** improving response times and reliability
- **Priority-based operation queuing** ensuring critical operations are processed first
- **Atomic batch transactions** maintaining data consistency across operations
- **Configurable queue settings** for optimal performance tuning

### **Asset System Implementation** ✨ (September 2025)

- **Complete business management** with 6 asset types (convenience stores to casinos)
- **Strategic income distribution** across cash, bank, and cryptocurrency
- **Atomic transaction safety** preventing race conditions and duplicate purchases
- **Upgrade system** for income rates and security levels
- **Risk management features** including raid vulnerability and market sensitivity
- **Level-gated content** unlocking businesses as players progress

### **Performance & Reliability** 🚀 (September 2025)

- **Deferred Discord interactions** preventing timeout errors
- **Atomic database transactions** ensuring data consistency
- **Race condition prevention** in asset purchases and income collection
- **Improved JSON parsing** for cryptocurrency wallet handling
- **Transaction timeout handling** with extended timeouts for complex operations

### **Developer Experience** 🔧 (September 2025)

- **Test business** (Lemonade Stand) for easy development and testing
- **Cleanup scripts** for removing duplicate assets and data maintenance
- **Fixed display issues** with proper emoji rendering
- **Enhanced error handling** with specific timeout and transaction error messages
- **Comprehensive logging** for debugging and monitoring

## 🗄️ Database Schema

The bot uses SQLite3 with the following main entities:

- **Users** - Discord user accounts linked to game profiles
- **Characters** - Player stats, level, XP, reputation, and **multi-layered money system**
- **MoneyEvents** - Random events affecting cash, bank, or cryptocurrency values
- **CryptoPrices** - Real-time cryptocurrency market data and price fluctuations
- **BankTransactions** - Complete audit trail of deposits, withdrawals, and fees
- **CryptoTransactions** - Trading history and portfolio management records
- **Assets** - Ownable properties with level requirements (shops, nightclubs, warehouses)
- **Gangs** - Player organizations with shared resources
- **Items** - Tools, weapons, consumables with level gates and crime bonuses
- **Crimes/Missions** - Available activities with level requirements and XP rewards
- **Action Logs** - Complete audit trail of player actions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [bootleggers.us](https://bootleggers.us) - Classic mafia browser game
- Built with [Discord.js](https://discord.js.org/) for Discord integration
- Database powered by [Prisma](https://prisma.io/) ORM
- Uses SQLite3 for efficient local storage

## 📞 Support

- 🐛 [Report Issues](https://github.com/NoobFullStack/MafiaWar/issues)
- 💬 [Discussions](https://github.com/NoobFullStack/MafiaWar/discussions)
- 📖 [Documentation](./docs/README.md)
- 🚀 [Installation Guide](./docs/setup/INSTALLATION.md)

---

**Ready to build your criminal empire?** Start with `/user-create` to create your character, then use `/assets` to browse businesses and `/business buy` to start generating passive income! 🎭

### **🎯 Quick Start Guide**

1. **Create Character** - `/user-create` to join the underworld
2. **Check Finances** - `/wallet` to see your starting $1,000
3. **Browse Businesses** - `/assets` to see available investments
4. **Buy First Asset** - `/business buy test_lemonade_stand` (perfect for testing!)
5. **Collect Income** - `/business collect` to gather your earnings
6. **Commit Crimes** - `/crime` to earn money and experience
7. **Level Up** - Progress through 50 levels unlocking new content
