import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  userId: string;
  userTag: string;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  error?: string;
  flags?: number;
}

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder;
  execute: (context: CommandContext) => Promise<CommandResult>;
  cooldown?: number; // in seconds
  category?: string;
  description?: string;
}

export interface CommandCollection {
  [key: string]: Command;
}
