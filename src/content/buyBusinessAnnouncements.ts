/**
 * Public business purchase announcement messages
 * Used for server-wide notifications when players buy business assets
 * Exposes players' business investments and creates potential targets
 */

export interface BusinessPurchaseAnnouncement {
  legitimateMessages: string[]; // For legitimate businesses (convenience stores, restaurants)
  semiLegalMessages: string[]; // For semi-legal operations (pawn shops, nightclubs)
  illegalMessages: string[]; // For illegal operations (warehouses, casinos)
  smallPurchaseMessages: string[]; // For purchases under 50k
  largePurchaseMessages: string[]; // For purchases over 200k
}

export const businessPurchaseAnnouncements: BusinessPurchaseAnnouncement = {
  // === LEGITIMATE BUSINESS PURCHASES ===
  legitimateMessages: [
    "🏪 **NEW BUSINESS OWNER** 🏪\n{username} just opened their own {businessName}! Word spreads fast when someone's making moves in the business world...",
    "📰 **BUSINESS NEWS** 📰\n{username} acquired a {businessName} today. Even legitimate businesses can be profitable targets in this city...",
    "🤝 **ENTREPRENEUR ALERT** 🤝\n{username} invested in a {businessName}. Smart businesspeople always attract... unwanted attention.",
    "💼 **COMMERCIAL EXPANSION** 💼\n{username} is now the proud owner of a {businessName}. Success breeds envy in the criminal underworld.",
    "🏢 **BUSINESS DISTRICT BUZZ** 🏢\nLocal sources report {username} purchasing a {businessName}. Even clean money looks dirty to desperate criminals.",
  ],

  // === SEMI-LEGAL BUSINESS PURCHASES ===
  semiLegalMessages: [
    "🎭 **SHADY ACQUISITION** 🎭\n{username} just bought a {businessName}. Those kinds of businesses have... flexible business practices.",
    "👁️ **SUSPICIOUS INVESTMENT** 👁️\n{username} acquired a {businessName} today. Everyone knows what really goes on in those establishments...",
    "🕴️ **GRAY MARKET MOVES** 🕴️\n{username} is now operating a {businessName}. The line between legal and illegal just got blurrier.",
    "⚖️ **QUESTIONABLE BUSINESS** ⚖️\n{username} invested in a {businessName}. Authorities and criminals alike will be watching closely.",
    "🎪 **UNDERGROUND NETWORK** 🎪\n{username} joined the semi-legal business scene with their new {businessName}. That's a dangerous game to play.",
    "💰 **GREY MONEY** 💰\n{username} bought a {businessName}. Smart criminals know where the real money flows through...",
  ],

  // === ILLEGAL BUSINESS PURCHASES ===
  illegalMessages: [
    "💀 **CRIMINAL ENTERPRISE** 💀\n{username} just acquired a {businessName}! They've officially entered the criminal business world. Everyone's watching now...",
    "🚨 **ILLEGAL OPERATION** 🚨\n{username} invested in a {businessName} today. That kind of business makes enemies fast in this city!",
    "⚔️ **UNDERWORLD EXPANSION** ⚔️\n{username} now owns a {businessName}. They just painted a target on their back for every rival criminal!",
    "🔥 **DANGEROUS INVESTMENT** 🔥\n{username} bought a {businessName}. Operating in the shadows means living with constant threats!",
    "👑 **CRIMINAL ROYALTY** 👑\n{username} established their {businessName} empire. Every crime boss in the city just took notice!",
    "⚡ **HIGH-RISK VENTURE** ⚡\n{username} entered the illegal business game with their {businessName}. Expect assassination attempts soon!",
    "🎯 **MARKED TARGET** 🎯\n{username} just became a major player with their {businessName} purchase. Hide, fight, or die - those are the options now!",
  ],

  // === SMALL PURCHASE ANNOUNCEMENTS (Under 50k) ===
  smallPurchaseMessages: [
    "💡 **SMALL BUSINESS STARTER** 💡\n{username} made a modest investment in a {businessName}. Every criminal empire starts somewhere...",
    "🌱 **GROWING INVESTMENT** 🌱\n{username} dipped their toes in the business world with a {businessName}. Small money still attracts big problems.",
    "💼 **FIRST STEP** 💼\n{username} bought their first {businessName}. Even small businesses make you a target in this economy.",
    "📈 **STARTER BUSINESS** 📈\n{username} invested in a {businessName}. Smart to start small, but criminals don't discriminate by business size.",
  ],

  // === LARGE PURCHASE ANNOUNCEMENTS (Over 200k) ===
  largePurchaseMessages: [
    "💎 **MAJOR INVESTMENT** 💎\n{username} just dropped serious money on a {businessName}! That kind of investment screams 'ROB ME' to every criminal in the city!",
    "🏰 **EMPIRE BUILDING** 🏰\n{username} made a massive purchase: a {businessName}! They're playing in the big leagues now - and big leagues have big enemies!",
    "🚨 **HIGH-VALUE TARGET** 🚨\n{username} invested heavily in a {businessName} today. That much money changing hands attracts all the wrong attention!",
    "👑 **KINGPIN MOVES** 👑\n{username} just bought a premium {businessName}! Every hitman and thief in the city is calculating their net worth right now!",
    "⚡ **MAJOR LEAGUE** ⚡\n{username} entered the big business game with their expensive {businessName}. Expect visitors... armed ones!",
    "💰 **WEALTH DISPLAY** 💰\n{username} flaunted their wealth with a {businessName} purchase! Nothing says 'target me' like spending big in the criminal underworld!",
  ],
};

/**
 * Get a random message from an array
 */
export function getRandomPurchaseMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get random business purchase announcement based on business type and price
 */
export function getBusinessPurchaseAnnouncement(
  username: string,
  businessName: string,
  businessCategory: string,
  purchasePrice: number
): string {
  let messages: string[];

  // First, check if it's a large purchase (over 200k) - this takes priority
  if (purchasePrice >= 200000) {
    messages = businessPurchaseAnnouncements.largePurchaseMessages;
  }
  // Then check if it's a small purchase (under 50k)
  else if (purchasePrice < 50000) {
    messages = businessPurchaseAnnouncements.smallPurchaseMessages;
  }
  // Otherwise, use category-specific messages
  else {
    switch (businessCategory) {
      case "illegal":
        messages = businessPurchaseAnnouncements.illegalMessages;
        break;
      case "semi_legal":
        messages = businessPurchaseAnnouncements.semiLegalMessages;
        break;
      case "legitimate":
      default:
        messages = businessPurchaseAnnouncements.legitimateMessages;
        break;
    }
  }

  const message = getRandomPurchaseMessage(messages);
  return message
    .replace("{username}", username)
    .replace("{businessName}", businessName);
}

/**
 * Determine if a business purchase should trigger a public announcement
 * ALL purchases are announced to expose business investments
 */
export function shouldAnnouncePurchase(
  purchasePrice: number,
  businessCategory: string
): boolean {
  // Always announce all business purchases
  return true;
}
