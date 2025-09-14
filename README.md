# 🎮 MafiaWar Discord Bot

A text-based multiplayer mafia game for Discord, inspired by bootleggers.us. Build your criminal empire, commit crimes, manage assets, and compete with other players in an immersive criminal underworld.

## 🌟 Features

### **Currently Implemented**

- 👤 **Character System** - Automatic user registration with stats (strength, stealth, intelligence)
- 💰 **Real Economy System** - Gameplay-based pricing and balance analysis
- 🛠️ **Item Management** - Tools, consumables, and trade goods with actual gameplay value
- 🔫 **Crime System** - Various criminal activities with risk/reward mechanics
- 📊 **Profile Management** - View character stats, level, and reputation
- 🌱 **Advanced Seeding** - Safe, extensible data management system
- 📈 **Economic Analysis** - Real-time balance validation and recommendations
- 🛡️ **Cooldown System** - Built-in spam protection
- 🗄️ **Database Integration** - PostgreSQL with Prisma ORM

### **Planned Features**

- 🎯 **Mission System** - Daily tasks and story-driven progression
- 🏢 **Asset System** - Ownable properties generating passive income
- 👥 **Gang System** - Social features and cooperative gameplay
- ⚔️ **PvP Mechanics** - Asset robberies and player vs player combat
- 📈 **Leaderboards** - Rankings for money, reputation, and achievements

## 🎯 Unique Systems

### **🧮 Gameplay Economy**
Unlike other bots with arbitrary pricing, MafiaWar uses **real gameplay analysis**:
- Items priced based on actual crime earnings
- 1-5 hour payback periods for meaningful progression
- Dynamic balance recommendations and validation

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

| Command           | Description                          | Cooldown |
| ----------------- | ------------------------------------ | -------- |
| `/ping`           | Test bot connectivity and latency    | 5s       |
| `/profile`        | View your criminal character profile | 10s      |
| `/balance [user]` | Check money and financial status     | 5s       |

## 🏗️ Architecture

```
src/
├── commands/          # Slash command implementations
├── utils/            # Core utilities (database, logging, responses)
├── types/            # TypeScript type definitions
└── bot.ts           # Main bot entry point

prisma/
├── schema.prisma    # Database schema
└── migrations/      # Database migration files

docs/
├── setup/             # Installation and configuration guides
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
- **Characters** - Player stats, money, level, reputation
- **Assets** - Ownable properties (shops, nightclubs, warehouses)
- **Gangs** - Player organizations with shared resources
- **Items** - Tools, weapons, consumables
- **Crimes/Missions** - Available activities and objectives
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

**Ready to build your criminal empire?** Start with `/profile` to create your character and begin your journey in the underworld! 🎭
