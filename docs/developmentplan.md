# MafiaWar Discord Game - Development Plan

## Tech Stack

- **Discord Bot Framework:** [discord.js](https://discord.js.org/) with TypeScript support
- **Backend:** [Supabase](https://supabase.com/) (Postgres DB, REST/Realtime API, Auth, Storage)
- **Language:** TypeScript (for safety and scalability)
- **Deployment:** Bot on Node.js server (VPS, Railway, etc.), DB on Supabase cloud
- **ORM:** Prisma (for database management and migrations)

## System Architecture

- Discord Bot connects via discord.js
- Supabase for user data, game state, economy, items, gangs, logs
- Prisma for database schema management and type-safe queries
- Bot receives commands/interactions, processes logic, updates DB, returns results

## Development Phases

### Phase 1: Project Setup ✅

- Scaffold Node.js + TypeScript project
- Create Discord bot, connect to server
- Set up Supabase project and Prisma integration
- Define initial database schema:
  - users, characters, gangs, actions/logs, items/inventory, economy, assets

### Phase 2: Core Bot Features

- **Authentication:** Link Discord user to game profile (Discord ID as unique key)
- **Character Creation:** Command for new character, store profile in DB
- **Basic Actions:** Implement core commands:
  - Crime system (rob banks, steal cars, smuggle goods)
  - Work/mission system
  - Profile management
- **Cooldown Logic:** Prevent spam, add timers for actions

### Phase 3: Crime & Mission System

- **Crime Mechanics:**
  - Multiple crime types (petty theft, car theft, robbery, smuggling, hit jobs, scams)
  - Success/failure based on stats, items, and random chance
  - Rewards: money, items, experience, reputation
  - Risks: jail time, injury, loss of money/items
  - Progression: unlock harder crimes as stats increase
- **Mission System:**
  - Story missions, side missions, daily/weekly missions
  - Multi-step objectives and narrative elements
  - Chain missions for progression

### Phase 4: Economy & Items

- **Currency System:** Primary cash + optional premium currency
- **Items:**
  - Tools (lockpicks, weapons, vehicles)
  - Consumables (medkits, energy drinks)
  - Trade goods, collectibles
- **Shop/Marketplace:**
  - Static NPC shop for basic items
  - Player-to-player trading system
  - Dynamic pricing based on supply/demand
- **Bank System:** Safe storage with risk/reward mechanics

### Phase 5: Assets & Passive Income

- **Ownable Assets:**
  - Shops, nightclubs, warehouses, bars, casinos
  - Purchase, upgrade, and sell mechanics
  - Passive income generation at regular intervals
- **Robbery System:**
  - Players can rob other players' assets
  - Success based on stats vs. asset defenses
  - Risk/reward with jail consequences
- **Security & Upgrades:**
  - Defensive upgrades to protect assets
  - Income-boosting improvements

### Phase 6: Social Features

- **Gang/Crew System:**
  - Create and manage gangs
  - Shared gang banks and territory
  - Team actions and gang leaderboards
- **PvP Mechanics:**
  - Asset robberies, duels, attacks
  - Gang warfare and territory control

### Phase 7: Advanced Features

- **Leaderboards & Rankings:** Track top earners, criminals, gangs
- **Daily Events/Tasks:** Engagement and retention features
- **Random Events:** Rare items, police raids, market fluctuations
- **Admin/Mod Commands:** Game management and moderation tools

### Phase 8: Polish & Deployment

- **UI Improvements:** Discord embeds, buttons, menus
- **Error Handling:** Robust error management and logging
- **Rate Limiting:** Anti-abuse measures and cooldowns
- **Analytics:** Game metrics and player behavior tracking
- **Documentation:** User guides and onboarding

## Database Schema (Prisma Models)

### Core Tables

- **users** (discord_id, username, created_at, stats, money)
- **characters** (user_id, level, experience, reputation)
- **gangs** (name, members, bank, territory)
- **actions** (type, user_id, result, timestamp, cooldown_expires)

### Economy Tables

- **items** (item_id, name, type, value, rarity)
- **inventory** (user_id, item_id, quantity)
- **transactions** (from_user, to_user, amount, type, timestamp)

### Assets Tables

- **assets** (owner_id, type, name, level, income_rate, security_level, last_income_time, value)
- **asset_robbery_logs** (asset_id, robber_id, result, stolen_amount, timestamp)
- **asset_upgrades** (asset_id, upgrade_type, upgrade_level, cost)

### Mission Tables

- **missions** (mission_id, name, description, requirements, rewards, difficulty)
- **user_missions** (user_id, mission_id, status, progress, started_at, completed_at)

## Best Practices

- Use TypeScript for all code with strict type checking
- Validate Discord commands and user input thoroughly
- Use Supabase Row-Level Security for data protection
- Implement rate-limiting and cooldowns for all game actions
- Modular code structure: separate game logic, database, and Discord handlers
- Use Prisma for type-safe database operations and migrations
- Implement proper error handling and logging
- Add comprehensive testing for game mechanics

## Optional Enhancements

- **Realtime Features:** Supabase subscriptions for live events
- **Web Dashboard:** Stats viewing and admin panel
- **Mobile Integration:** Discord DM notifications
- **Multi-Server Support:** Bot functionality across multiple Discord servers
- **Advanced Permissions:** Integration with Discord roles/channels
- **API Endpoints:** External integrations and data access

## Anti-Abuse & Balance

- **Income Limits:** Prevent endless passive income scaling
- **Robbery Cooldowns:** Limit frequency to avoid spam attacks
- **Security Scaling:** Ensure upgrades matter but aren't pay-to-win
- **Asset Depreciation:** Optional maintenance requirements
- **Dynamic Economy:** Adjust rewards/costs based on inflation
- **Jail System:** Meaningful consequences for failed crimes
