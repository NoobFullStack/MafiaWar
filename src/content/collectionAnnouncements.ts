/**
 * Public business income collection announcement messages
 * Used for server-wide notifications when players collect significant income
 * Exposes wealthy players and makes them potential targets
 */

export interface CollectionAnnouncement {
  smallAmountMessages: string[]; // For smaller collections (under 5k)
  mediumAmountMessages: string[]; // For medium collections (5k-25k)
  largeAmountMessages: string[]; // For large collections (25k-100k)
  massiveAmountMessages: string[]; // For massive collections (100k+)
}

export const collectionAnnouncements: CollectionAnnouncement = {
  // === SMALL AMOUNTS (Under 5k) ===
  smallAmountMessages: [
    "💼 **BUSINESS ACTIVITY** 💼\n{username} was spotted leaving their business premises with a modest briefcase. Word on the street is they're doing well...",
    "🏢 **ENTREPRENEUR SPOTTED** 🏢\nLocal sources report {username} collecting earnings from their ventures. Nothing too flashy, but still...",
    "💰 **CASH FLOW** 💰\n{username} made their rounds today, picking up some business income. Modest success breeds envy.",
    "📊 **PROFIT COLLECTION** 📊\nWitnesses saw {username} handling business transactions. Even small money attracts attention in this city.",
    "🤑 **BUSINESS OWNER** 🤑\n{username} was seen counting money outside their establishment. Smart to keep it low-key, but not low enough...",
  ],

  // === MEDIUM AMOUNTS (5k-25k) ===
  mediumAmountMessages: [
    "💵 **SIGNIFICANT EARNINGS** 💵\n{username} collected a substantial amount from their business operations today. That kind of money doesn't go unnoticed...",
    "🏦 **BANK RUN** 🏦\n{username} was seen making multiple trips to secure their business profits. All that cash is making people... interested.",
    "💼 **HEAVY BRIEFCASE** 💼\nEyewitnesses report {username} struggling with the weight of their earnings. Success comes with a target on your back.",
    "🎯 **WEALTH DISPLAY** 🎯\n{username} couldn't hide their satisfaction while collecting today's profits. That smile might be expensive...",
    "💰 **MONEY TALKS** 💰\nLocal informants confirm {username} had a very profitable collection today. Word travels fast in the underworld.",
    "🤵 **HIGH ROLLER** 🤵\n{username} was spotted with security while collecting substantial business income. Even they know they're a target now.",
    "📈 **BUSINESS BOOM** 📈\n{username}'s enterprises are clearly thriving - their collection today was impressive. Impressively dangerous...",
  ],

  // === LARGE AMOUNTS (25k-100k) ===
  largeAmountMessages: [
    "🎰 **BIG MONEY MOVES** 🎰\n{username} hit the jackpot with today's business collection! That kind of wealth makes enemies fast in this city...",
    "💎 **DIAMOND HANDS** 💎\n{username} collected serious money from their empire today. Every criminal in the city just took notice.",
    "🏰 **EMPIRE EARNINGS** 🏰\n{username}'s business kingdom generated massive profits today. Kings need to watch their backs...",
    "⚡ **POWER MOVE** ⚡\n{username} just collected enough money to buy half the city. The other half wants to rob them for it.",
    "🔥 **BURNING CASH** 🔥\n{username} walked away with fire-hot profits today. That kind of heat attracts all the wrong attention.",
    "👑 **KINGPIN STATUS** 👑\n{username} collected royal-level earnings from their operations. Every throne has assassins lurking nearby...",
    "🚨 **MAJOR PAYDAY** 🚨\n{username} just had their biggest collection yet! Alert: High-value target spotted in the area.",
    "💀 **DEATH WISH** 💀\n{username} collected enough money to paint a target on their back. In this city, wealth equals danger.",
  ],

  // === MASSIVE AMOUNTS (100k+) ===
  massiveAmountMessages: [
    "👑 **CRIMINAL ROYALTY** 👑\n{username} just collected OBSCENE amounts of money! Every hitman, thief, and crime boss in the city is now hunting them!",
    "💀 **WALKING BANK VAULT** 💀\n{username} is now a mobile treasure chest after today's massive collection. They might as well have painted a bullseye on their forehead!",
    "🎯 **ULTIMATE TARGET** 🎯\n{username} collected enough money to retire... if they survive the night! That wealth just made them enemy #1.",
    "⚡ **LIGHTNING ROD** ⚡\n{username} is now a magnet for every criminal in the city after their MASSIVE payday! Good luck sleeping tonight...",
    "🔥 **CITY-WIDE MANHUNT** 🔥\n{username} just became the most wanted person in the city - not by police, but by everyone who wants their money!",
    "💣 **TICKING TIME BOMB** 💣\n{username}'s massive wealth collection just started a countdown. Every second they hold that money, the danger grows...",
    "🏆 **ULTIMATE PRIZE** 🏆\n{username} is now worth more than most small countries! Expect assassination attempts within the hour...",
    "💰 **GOLDEN TARGET** 💰\n{username} just painted themselves gold with today's collection. In the criminal underworld, gold means DEAD.",
    "⚰️ **RICH AND DANGEROUS** ⚰️\n{username} collected enough money to buy an army... they'll need one to protect it! The city's deadliest are coming.",
    "🚨 **CODE RED WEALTH** 🚨\n{username} triggered every alarm bell in the criminal network with their collection. Hide, run, or fight - but that money won't save them!",
  ],
};

/**
 * Get a random message from an array
 */
export function getRandomCollectionMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get random business collection announcement based on amount collected
 */
export function getCollectionAnnouncement(
  username: string,
  totalAmount: number
): string {
  let messages: string[];

  if (totalAmount >= 100000) {
    messages = collectionAnnouncements.massiveAmountMessages;
  } else if (totalAmount >= 25000) {
    messages = collectionAnnouncements.largeAmountMessages;
  } else if (totalAmount >= 5000) {
    messages = collectionAnnouncements.mediumAmountMessages;
  } else {
    messages = collectionAnnouncements.smallAmountMessages;
  }

  const message = getRandomCollectionMessage(messages);
  return message.replace("{username}", username);
}

/**
 * Determine if an income collection should trigger a public announcement
 * Smaller amounts have lower chance of announcement to avoid spam
 */
export function shouldAnnounceCollection(totalAmount: number): boolean {
  if (totalAmount >= 100000) {
    return true; // 100% chance for massive amounts (100k+)
  } else if (totalAmount >= 25000) {
    return Math.random() < 0.9; // 90% chance for large amounts (25k-100k)
  } else if (totalAmount >= 5000) {
    return Math.random() < 0.7; // 70% chance for medium amounts (5k-25k)
  } else if (totalAmount >= 1000) {
    return Math.random() < 0.3; // 30% chance for small amounts (1k-5k)
  } else {
    return Math.random() < 0.1; // 10% chance for tiny amounts (<1k)
  }
}
