import { SlashCommandBuilder } from "discord.js";
import { Command, CommandContext, CommandResult } from "../types/command";
import { ResponseUtil } from "../utils/ResponseUtil";

const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is responsive"),

  async execute(context: CommandContext): Promise<CommandResult> {
    const { interaction } = context;

    const embed = ResponseUtil.success(
      "Pong!",
      `Bot is online and responsive.\nLatency: ${
        Date.now() - interaction.createdTimestamp
      }ms`
    );

    await interaction.reply({ embeds: [embed] });

    return { success: true };
  },

  cooldown: 5,
  category: "utility",
  description: "Test command to check bot responsiveness",
};

export default pingCommand;
