import { BotBranding } from "../config/bot";

export const RegistrationContent = {
  // Main welcome screen
  welcome: {
    getDescription: (userTag: string) =>
      `**${userTag}**, step into the shadows and claim your destiny!\n\n` +
      "🔥 **Rise from the streets** to become a criminal mastermind\n" +
      "💰 **Build wealth through cunning** and strategic moves\n" +
      "⚡ **Unlock devastating abilities** as you gain power\n" +
      "🔫 **Execute high-stakes heists** that legends are made of\n" +
      "🏢 **Control territory** and expand your criminal network\n" +
      "⚔️ **Form deadly alliances** or crush your enemies solo\n\n" +
      "**The underworld awaits your arrival. Will you seize control?**",

    fields: {
      journey: {
        name: "🎯 Your Criminal Journey Begins",
        value:
          "Every crime boss started somewhere. Today, that somewhere is here. Your actions shape your legend.",
      },
      possibilities: {
        name: "💥 Unlimited Possibilities",
        value:
          "• Master 50 levels of criminal evolution\n• Execute different crimes for money\n• Dominate through gang warfare\n• Build an unstoppable empire",
      },
      startReign: {
        name: "💡 Start Your Reign",
        value: `• Forge your criminal identity\n• Claim your ${BotBranding.formatCurrency(
          1000
        )} starter cash\n• Begin with raw potential\n• Write your own criminal saga`,
      },
    },

    footer: "Your empire awaits. Claim your throne and become legendary!",
  },

  // Game info screen
  gameInfo: {
    title: `🎮 Enter ${BotBranding.getName()}`,
    description:
      "The most immersive criminal empire MMO experience on Discord! Rise from street level to criminal overlord.",

    fields: {
      economy: {
        name: "💰 Master the Economy",
        value:
          "**Cash:** Lightning-fast deals and street trades\n**Bank:** Secure your wealth from rivals but not the **IRS**\n**Crypto:** High-risk, high-reward investments that separate legends from amateurs",
      },
      progression: {
        name: "⚡ Power Progression",
        value:
          "• Ascend through 50 tiers of criminal mastery\n• Unlock devastating new abilities\n• Gain respect that opens forbidden doors\n• Become the stuff of underworld legends",
      },
      operations: {
        name: "🔫 Criminal Operations",
        value:
          "• 9 unique crime paths to master\n• High-stakes risk vs legendary rewards\n• Strategic timing creates opportunities\n• Every decision shapes your reputation",
      },
      empire: {
        name: "🏢 Empire Building",
        value:
          "• Command profitable criminal enterprises\n• Generate wealth while you sleep\n• Fortify against rival attacks\n• Expand your influence across the city",
      },
      warfare: {
        name: "⚔️ Gang Warfare",
        value:
          "• Forge powerful criminal alliances\n• Execute coordinated strikes\n• Control territory through force\n• Dominate the underworld together",
      },
      legacy: {
        name: "🛡️ Your Criminal Legacy",
        value:
          "• Every move is calculated and strategic\n• Build your reputation through actions\n• Protect your secrets from rivals\n• Create a legend that echoes through the streets",
      },
    },

    footer: "The streets are calling. Will you answer and claim your destiny?",
  },

  // Character confirmation
  confirmation: {
    title: "🎭 Confirm Character Creation",
    getDescription: (characterName: string, background: string) =>
      `**Character Name:** ${characterName}\n**Background:** ${background}`,

    fields: {
      resources: {
        name: "💰 Starting Resources",
        value: `• ${BotBranding.formatCurrency(
          1000
        )} cash on hand\n• ${BotBranding.formatCurrency(
          0
        )} in bank\n• No cryptocurrency`,
      },
      stats: {
        name: "📊 Starting Stats",
        value: "• Strength: 10\n• Stealth: 10\n• Intelligence: 10",
      },
      level: {
        name: "🎯 Level & XP",
        value: "• Level: 1\n• Experience: 0\n• Reputation: 0",
      },
    },

    footer:
      'Click "Confirm" to create your character and start your criminal career!',
  },

  // Success messages
  success: {
    title: "🔥 Welcome to the Underworld!",
    getDescription: (characterName: string) =>
      `**${characterName}** has entered the game. Your legend begins now!`,

    fields: {
      firstMoves: {
        name: "⚡ Your First Moves",
        value:
          "• `/wallet` - Check your criminal finances\n• `/help crimes` - Discover available operations\n• `/crime <type>` - Execute your first job\n• `/profile` - View your criminal profile",
      },
      pathToPower: {
        name: "🎯 Path to Power",
        value:
          "• Strike fast, strike smart\n• Every crime builds your reputation\n• Invest wisely across cash, bank, and crypto\n• Level up to unlock deadlier opportunities\n• Remember: `/user-delete` if you want to restart your empire",
      },
    },

    footer: "The streets are yours to command!",
  },

  // Public announcements for new characters
  publicAnnouncements: [
    {
      title: "🚨 New Criminal Alert!",
      getDescription: (characterName: string) =>
        `**${characterName}** has just emerged from the shadows and joined the underworld! The streets just got more dangerous... 🔥`,
      footer: "Another legend begins their reign of terror!",
    },
    {
      title: "⚡ Fresh Blood in the Game!",
      getDescription: (characterName: string) =>
        `The criminal empire welcomes **${characterName}**! Word on the street is they're hungry for power and ready to make their mark. 💀`,
      footer: "Watch your back - new competition has arrived!",
    },
    {
      title: "🎭 A New Player Enters!",
      getDescription: (characterName: string) =>
        `**${characterName}** has stepped into the criminal underworld! Will they rise to become a legendary crime boss, or fall like so many before them? 🎯`,
      footer: "The game just got more interesting...",
    },
    {
      title: "💥 Breaking: New Gangster on the Scene!",
      getDescription: (characterName: string) =>
        `**${characterName}** has officially entered the criminal hierarchy! They're starting at the bottom, but everyone knows... that's where the most dangerous ones begin. ⚔️`,
      footer: "From zero to legend - the journey starts now!",
    },
    {
      title: "🔫 Criminal Network Expansion!",
      getDescription: (characterName: string) =>
        `The underworld grows stronger as **${characterName}** joins the ranks! Another ambitious soul ready to climb the ladder of power through cunning and force. 💼`,
      footer: "The empire expands - new alliances and enemies await!",
    },
    {
      title: "🌆 New Face in the City!",
      getDescription: (characterName: string) =>
        `**${characterName}** has arrived in the city with big dreams and bigger ambitions! The criminal ecosystem just gained a new predator. 🦈`,
      footer: "Fresh meat or future legend? Time will tell...",
    },
  ],

  // Modal content
  modal: {
    title: "🎭 Create Your Criminal Character",
    nameLabel: "Criminal Alias (Character Name)",
    namePlaceholder: 'Enter your character name (e.g., "Tony Soprano", "Vito")',
    backgroundLabel: "Criminal Background (Optional)",
    backgroundPlaceholder: "Tell us about your character's background story...",
    defaultBackground:
      "A mysterious figure entering the criminal underworld...",
  },

  // Button labels
  buttons: {
    claimPower: "🔥 Claim Your Power",
    learnMore: "📖 Learn More",
    notNow: "❌ Not Now",
    close: "❌ Close",
    confirmCreate: "✅ Confirm & Create",
    modifyDetails: "✏️ Modify Details",
    cancel: "❌ Cancel",
  },

  // Status messages
  status: {
    loading: {
      title: "🔄 Creating Character...",
      description: "Please wait while we set up your criminal empire...",
    },
    cancelled: {
      title: "👋 Registration Cancelled",
      description:
        "No problem! You can create your character anytime by using `/user-create` again.",
      field: {
        name: "💡 When you're ready",
        value:
          "Use `/user-create` to start your criminal journey and build your empire!",
      },
    },
    infoClosed: {
      title: "📖 Information Closed",
      description:
        "Ready to start your criminal empire? Use `/user-create` to begin your journey!",
    },
    alreadyExists: {
      title: "Account Already Exists",
      getDescription: (userTag: string, botName: string) =>
        `**${userTag}**, you already have a ${botName} account!`,
      fields: {
        account: {
          name: "🎮 Your Account",
          getExistingValue: (characterName: string, level: number) =>
            `• Character: **${characterName}** (Level ${level})\n• Use \`/profile\` to view your stats\n• Use \`/wallet\` to check your money`,
          corruptedValue:
            "• Character data found but corrupted\n• Contact an administrator for help",
        },
        commands: {
          name: "💡 Available Commands",
          value:
            "• `/profile` - View your character\n• `/wallet` - Check your finances\n• `/help crimes` - See available activities\n• `/user-delete` - Start over (permanent)",
        },
      },
    },
  },

  // Error messages
  errors: {
    expired:
      "⏰ This interaction has expired. Please run `/create-account` again.",
    creationFailed:
      "❌ Failed to create your character. Please try again later.",
    timeout:
      "⏰ Character creation timed out. Please use `/create-account` again.",
    modalFailed:
      "❌ Failed to show character creation form. Please try `/create-account` again.",
    infoFailed:
      "❌ Failed to show game information. Please try `/create-account` again.",
    general:
      "⚠️ This interaction has expired. Please use `/create-account` again.",
  },
};
