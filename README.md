# 🎮 MafiaWar Discord Bot

A text-based multiplayer mafia game for Discord, inspired by bootleggers.us. Build your criminal empire, commit crimes, manage assets, and compete with other players in an immersive criminal underworld.

## 🌟 Features

### **Currently Implemented**

- 👤 **Character System** - Automatic user registration with stats (strength, stealth, intelligence)
- 💰 **Multi-Layered Money System** - Strategic three-tier money management with different risk profiles
- 🎯 **XP & Level System** - MMO-style progression with 50 levels and milestone rewards
- �️ **Level Gating** - Content unlocks based on player level and progression
- 🛠️ **Item Management** - Tools, consumables, and trade goods with level requirements
- 🔫 **Crime System** - 9 criminal activities with balanced difficulty progression and real-time execution
- 🏢 **Asset System** - 6 business types from convenience stores to underground casinos
- 📊 **Profile Management** - View character stats, level, XP progress, and reputation
- 🌱 **Advanced Seeding** - Safe, extensible data management system
- 📈 **Economic Analysis** - Real-time balance validation and XP progression analysis
- 🛡️ **Cooldown System** - Built-in spam protection
- 🗄️ **Database Integration** - PostgreSQL with Prisma ORM and XP tracking

### **Planned Features**

- 🎯 **Mission System** - Daily tasks and story-driven progression
- 🏢 **Asset System** - Ownable properties generating passive income
- 👥 **Gang System** - Social features and cooperative gameplay
- ⚔️ **PvP Mechanics** - Asset robberies and player vs player combat
- 📈 **Leaderboards** - Rankings for money, reputation, and achievements

## 🎯 Unique Systems

### **💰 Multi-Layered Strategic Money Management**

MafiaWar features a sophisticated **three-tier money system** for strategic risk management:

- **💵 Cash (On Hand)** - Immediate access but vulnerable to player theft
- **🏦 Bank Account** - Protected from players but subject to government raids/IRS seizures
- **₿ Cryptocurrency** - Protected from all threats but subject to market volatility

Players must strategically balance liquidity, security, and growth potential across all three tiers.

### **🧮 Gameplay Economy with XP Progression**

Unlike other bots with arbitrary pricing, MafiaWar uses **real gameplay analysis**:

- Items priced based on actual crime earnings and XP value
- MMO-style progression with 50 levels and milestone rewards
- 1-5 hour payback periods for meaningful progression
- Dynamic balance recommendations including XP economic valuation

### **🔒 Level Gating System**

Content unlocks naturally with player progression:

- Items, crimes, and assets locked behind level requirements
- Clear progression path from Street Thug to Underworld King
- Realistic timing: Level 15 takes ~52 days, Level 30 takes ~285 days
- Multiple requirement checks: level, stats, money, reputation

### **🌱 Smart Seeding**

Extensible data management that grows with your game:

- Safe upserts prevent data loss
- Incremental updates for new content
- Automatic validation and integrity checks

## 🚀 Quick Start

### **Prerequisites**

- Node.js 18+
- PostgreSQL database (or Supabase)
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
| `/crimes`        | View available crimes and requirements | 10s      |

### **🔧 Development Commands**

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `yarn economy:analyze`  | Complete economy and XP progression analysis |
| `yarn level:demo`       | Demonstrate level gating system              |
| `yarn crime:demo`       | Test crime system and success calculations   |
| `yarn economy:validate` | Validate item balance and pricing            |

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
- 📖 **[Full Documentation](./docs/README.md)** - Complete documentation index

## 🗄️ Database Schema

The bot uses PostgreSQL with the following main entities:

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
- Hosted on [Supabase](https://supabase.com/) for PostgreSQL

## 📞 Support

- 🐛 [Report Issues](https://github.com/NoobFullStack/MafiaWar/issues)
- 💬 [Discussions](https://github.com/NoobFullStack/MafiaWar/discussions)
- 📖 [Documentation](./docs/README.md)
- 🚀 [Installation Guide](./docs/setup/INSTALLATION.md)

---

**Ready to build your criminal empire?** Start with `/profile` to create your character, then use `/wallet` to check your money portfolio and `/bank deposit` to secure your earnings! 🎭
