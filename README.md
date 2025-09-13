# MafiaWar Discord Bot

A multiplayer mafia-themed game for Discord, inspired by bootleggers.us. Built with Node.js, TypeScript, Discord.js, and Supabase.

## Features

- Jobs, missions, and crimes for players
- Items, upgrades, and assets (businesses)
- Businesses generate passive income and can be robbed
- PvP mechanics and leaderboards
- Supabase backend for data storage

## Getting Started

### Prerequisites

- Node.js & Yarn
- Discord bot token
- Supabase project (URL & anon key)

### Installation

```sh
yarn install
```

### Configuration

Create a `.env` file:

```
DISCORD_BOT_TOKEN=your_discord_bot_token_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Running the Bot

```sh
yarn ts-node src/bot.ts
```

### Invite the Bot

Generate an OAuth2 URL in the Discord Developer Portal with the `bot` scope and required permissions, then invite it to your server.

## Folder Structure

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

## License

MIT
