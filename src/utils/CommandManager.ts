import { Collection } from "discord.js";
import fs from "fs";
import path from "path";
import { Command } from "../types/command";

class CommandManager {
  private commands: Collection<string, Command> = new Collection();
  private cooldowns: Collection<string, Collection<string, number>> =
    new Collection();

  /**
   * Load all command files from the commands directory
   */
  async loadCommands(): Promise<void> {
    const commandsPath = path.join(__dirname, "..", "commands");

    if (!fs.existsSync(commandsPath)) {
      console.log("Commands directory not found, creating...");
      fs.mkdirSync(commandsPath, { recursive: true });
      return;
    }

    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

    for (const file of commandFiles) {
      try {
        const filePath = path.join(commandsPath, file);
        const commandModule = await import(filePath);
        const command: Command = commandModule.default || commandModule.command;

        if ("data" in command && "execute" in command) {
          this.commands.set(command.data.name, command);
          console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
          console.log(`⚠️  Invalid command file: ${file}`);
        }
      } catch (error) {
        console.error(`❌ Error loading command ${file}:`, error);
      }
    }

    console.log(`📦 Loaded ${this.commands.size} commands`);
  }

  /**
   * Get a command by name
   */
  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  /**
   * Get all commands for registration
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Check if user is on cooldown for a command
   */
  isOnCooldown(
    commandName: string,
    userId: string
  ): { onCooldown: boolean; timeLeft?: number } {
    if (!this.cooldowns.has(commandName)) {
      this.cooldowns.set(commandName, new Collection());
    }

    const now = Date.now();
    const timestamps = this.cooldowns.get(commandName)!;
    const command = this.commands.get(commandName);
    const cooldownAmount = (command?.cooldown || 0) * 1000;

    if (timestamps.has(userId)) {
      const expirationTime = timestamps.get(userId)! + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return { onCooldown: true, timeLeft };
      }
    }

    return { onCooldown: false };
  }

  /**
   * Set cooldown for user and command
   */
  setCooldown(commandName: string, userId: string): void {
    if (!this.cooldowns.has(commandName)) {
      this.cooldowns.set(commandName, new Collection());
    }

    const timestamps = this.cooldowns.get(commandName)!;
    timestamps.set(userId, Date.now());

    // Clean up old cooldowns
    const command = this.commands.get(commandName);
    const cooldownAmount = (command?.cooldown || 0) * 1000;

    setTimeout(() => {
      timestamps.delete(userId);
    }, cooldownAmount);
  }

  /**
   * Get command names for slash command registration
   */
  getCommandData() {
    return this.commands.map((command) => command.data.toJSON());
  }
}

export default new CommandManager();
