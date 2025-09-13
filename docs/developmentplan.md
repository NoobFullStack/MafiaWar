# MafiaWar Discord Game - Development Plan

## Tech Stack

- Discord Bot: Node.js + TypeScript
- Database: Supabase (PostgreSQL)
- Hosting: Supabase, Vercel, or similar (if web dashboard needed)

## Milestones

### 1. Project Setup

- Initialize Node.js + TypeScript project.
- Set up Discord bot using discord.js.
- Configure Supabase backend (auth, database).

### 2. Core Bot Features

- Command handling (jobs, missions, crimes, inventory, businesses).
- User registration and profile management.
- Basic economy (currency, transactions).

### 3. Game Logic

- Implement jobs/missions system.
- Crime mechanics (success/failure, cooldowns).
- Item and upgrade system.

### 4. Businesses & Assets

- Business purchase, income generation, and robbery mechanics.
- Security upgrades and PvP logic.

### 5. Database Integration

- Store user profiles, items, businesses, transactions.
- Scheduled tasks for passive income (cron jobs or Supabase functions).

### 6. Advanced Features

- Marketplace for trading.
- Leaderboards and achievements.
- Event system (special missions, limited-time jobs).

### 7. Testing & QA

- Unit and integration tests for commands and game logic.
- Playtesting with sample users.

### 8. Deployment & Maintenance

- Deploy bot to production.
- Monitor performance and errors.
- Regular updates for new content and balancing.

## Suggested Folder Structure

```
/src
	/commands
	/models
	/services
	/utils
	bot.ts
/supabase
	schema.sql
/gameplay.md
/developmentplan.md
/package.json
/tsconfig.json
```

## Next Steps

1. Create the initial project structure.
2. Set up Discord bot and Supabase connection.
3. Implement user registration and basic commands.
