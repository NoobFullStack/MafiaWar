/**
 * Test New Collection Thresholds
 *
 * Quick test to verify the new threshold system: <5k, 5-25k, 25-100k, 100k+
 */

import { BotBranding } from "../../config/bot";
import {
  getCollectionAnnouncement,
  shouldAnnounceCollection,
} from "../../content/collectionAnnouncements";

console.log("🎭 New Collection Thresholds Test\n");

const testAmounts = [
  { amount: 2000, label: "Small (<5k)", expectedTier: "small" },
  { amount: 15000, label: "Medium (5k-25k)", expectedTier: "medium" },
  { amount: 60000, label: "Large (25k-100k)", expectedTier: "large" },
  { amount: 250000, label: "Massive (100k+)", expectedTier: "massive" },
];

console.log("NEW THRESHOLDS:");
console.log("• Small: < €5,000");
console.log("• Medium: €5,000 - €25,000");
console.log("• Large: €25,000 - €100,000");
console.log("• Massive: €100,000+");
console.log("\n" + "=".repeat(60));

testAmounts.forEach((test, index) => {
  console.log(
    `\n${index + 1}. ${test.label}: ${BotBranding.formatCurrency(test.amount)}`
  );

  const shouldAnnounce = shouldAnnounceCollection(test.amount);
  console.log(`   Should Announce: ${shouldAnnounce ? "✅ YES" : "❌ NO"}`);

  if (shouldAnnounce) {
    const announcement = getCollectionAnnouncement("TestPlayer", test.amount);
    console.log(`   📢 "${announcement}"`);
  }

  console.log("   " + "-".repeat(50));
});

console.log("\n📊 Announcement Probabilities:");
console.log("• Massive (100k+): 100% chance");
console.log("• Large (25k-100k): 90% chance");
console.log("• Medium (5k-25k): 70% chance");
console.log("• Small (1k-5k): 30% chance");
console.log("• Tiny (<1k): 10% chance");

console.log("\n✅ New threshold test completed!");
