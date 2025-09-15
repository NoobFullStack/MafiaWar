import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";
import dotenv from "dotenv";
import { CommandContext } from "./types/command";
import CommandManager from "./utils/CommandManager";
import DatabaseManager from "./utils/DatabaseManager";
import { ErrorHandler, logger } from "./utils/ResponseUtil";

dotenv.config();

class MafiaWarBot {
  private client: Client;
  private rest: REST;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.once("ready", async () => {
      logger.info(`🤖 Logged in as ${this.client.user?.tag}!`);

      try {
        // Connect to database
        await DatabaseManager.connect();

        // Load commands
        await CommandManager.loadCommands();

        // Register slash commands
        await this.registerSlashCommands();

        logger.info("🚀 Bot is fully initialized and ready!");
      } catch (error) {
        logger.error("Failed to initialize bot", error);
        process.exit(1);
      }
    });

    this.client.on("interactionCreate", async (interaction) => {
      if (interaction.isChatInputCommand()) {
        await this.handleSlashCommand(interaction);
      } else if (interaction.isAutocomplete()) {
        await this.handleAutocomplete(interaction);
      }
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("🛑 Shutting down bot...");
      await DatabaseManager.disconnect();
      this.client.destroy();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("🛑 Shutting down bot...");
      await DatabaseManager.disconnect();
      this.client.destroy();
      process.exit(0);
    });
  }

  private async registerSlashCommands(): Promise<void> {
    try {
      logger.info("🔄 Refreshing application (/) commands...");

      const commands = CommandManager.getCommandData();

      await this.rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
        { body: commands }
      );

      logger.info(
        `✅ Successfully reloaded ${commands.length} application (/) commands.`
      );
    } catch (error) {
      logger.error("Failed to register slash commands", error);
      throw error;
    }
  }

  private async handleSlashCommand(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const command = CommandManager.getCommand(interaction.commandName);

    if (!command) {
      logger.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }

    // Check cooldown
    const cooldownCheck = CommandManager.isOnCooldown(
      interaction.commandName,
      interaction.user.id
    );
    if (cooldownCheck.onCooldown) {
      await ErrorHandler.handleCooldownError(
        interaction,
        cooldownCheck.timeLeft!
      );
      return;
    }

    try {
      // Defer reply immediately for commands that might take time (except ping)
      if (interaction.commandName !== 'ping') {
        await interaction.deferReply({ flags: 64 }); // 64 = ephemeral flag
      }

      // Create command context
      const context: CommandContext = {
        interaction,
        userId: interaction.user.id,
        userTag: interaction.user.username,
      };

      // Execute command
      const result = await command.execute(context);

      // Set cooldown if command executed successfully
      if (result.success && command.cooldown) {
        CommandManager.setCooldown(
          interaction.commandName,
          interaction.user.id
        );
      }

      // Log command usage
      logger.info(
        `${interaction.commandName} executed by ${interaction.user.username}`
      );
    } catch (error) {
      logger.error(
        `Error executing command ${interaction.commandName}:`,
        error
      );
      await ErrorHandler.handleCommandError(
        interaction,
        error instanceof Error ? error : new Error("Unknown error"),
        interaction.commandName
      );
    }
  }

  private async handleAutocomplete(
    interaction: AutocompleteInteraction
  ): Promise<void> {
    const command = CommandManager.getCommand(interaction.commandName);

    if (!command || !command.autocomplete) {
      logger.warn(`No autocomplete handler for command: ${interaction.commandName}`);
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      logger.error(
        `Error in autocomplete for ${interaction.commandName}:`,
        error
      );
      // Provide fallback response
      try {
        await interaction.respond([]);
      } catch (respondError) {
        logger.error("Failed to send fallback autocomplete response:", respondError);
      }
    }
  }

  public async start(): Promise<void> {
    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      logger.error("Failed to start bot", error);
      process.exit(1);
    }
  }
}

// Start the bot
const bot = new MafiaWarBot();
bot.start();
