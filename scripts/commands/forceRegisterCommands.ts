#!/usr/bin/env ts-node

/**
 * Force re-register Discord slash commands
 * Use this when commands aren't updating after deployment
 */

import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import CommandManager from "../src/utils/CommandManager";

dotenv.config();

async function forceRegisterCommands() {
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

    console.log("\n🚀 Force registering commands globally...");

    // Delete all existing commands first (optional but thorough)
    console.log("🗑️  Clearing existing commands...");
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
      body: [],
    });

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Register new commands
    console.log("📝 Registering new commands...");
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
      body: commands,
    });

    console.log(`✅ Successfully registered ${commands.length} commands!`);
    console.log(
      "\n💡 Note: Global commands can take up to 1 hour to update everywhere."
    );
    console.log(
      "   For instant testing, consider guild-specific commands in development."
    );
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
    process.exit(1);
  }
}

// Run the script
forceRegisterCommands()
  .then(() => {
    console.log("\n🎉 Command registration complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
