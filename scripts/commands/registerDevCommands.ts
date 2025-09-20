#!/usr/bin/env ts-node

/**
 * Register Discord slash commands to a specific guild for instant testing
 * Use this for development - changes apply immediately to the test server
 */

import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import CommandManager from "../../src/utils/CommandManager";

dotenv.config();

async function registerGuildCommands() {
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!guildId) {
    console.log("⚠️  DISCORD_GUILD_ID not set in .env");
    console.log("   This will register commands globally (takes up to 1 hour)");
    console.log(
      "   For instant testing, add DISCORD_GUILD_ID=your_server_id to .env"
    );
    return registerGlobalCommands();
  }

  try {
    console.log("🔄 Loading commands...");

    // Load all commands
    await CommandManager.loadCommands();

    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);
    const commands = CommandManager.getCommandData();

    console.log(`📋 Found ${commands.length} commands to register:`);
    commands.forEach((cmd: any) => {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
    });

    console.log(`\n🚀 Registering commands to guild ${guildId}...`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, guildId),
      { body: commands }
    );

    console.log(
      `✅ Successfully registered ${commands.length} commands to guild!`
    );
    console.log("🎉 Commands are available immediately in your test server!");
  } catch (error) {
    console.error("❌ Failed to register guild commands:", error);
    process.exit(1);
  }
}

async function registerGlobalCommands() {
  try {
    console.log("🔄 Loading commands...");

    await CommandManager.loadCommands();

    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);
    const commands = CommandManager.getCommandData();

    console.log(`📋 Found ${commands.length} commands to register globally:`);
    commands.forEach((cmd: any) => {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
    });

    console.log("\n🌍 Registering commands globally...");

    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
      body: commands,
    });

    console.log(
      `✅ Successfully registered ${commands.length} commands globally!`
    );
    console.log(
      "⏱️  Global commands can take up to 1 hour to update everywhere."
    );
  } catch (error) {
    console.error("❌ Failed to register global commands:", error);
    process.exit(1);
  }
}

// Run the script
registerGuildCommands()
  .then(() => {
    console.log("\n🎉 Command registration complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
