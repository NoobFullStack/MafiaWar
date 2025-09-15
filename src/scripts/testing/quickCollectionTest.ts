/**
 * Quick Collection Announcement Test
 *
 * Simple test to quickly verify announcement messages without database setup.
 *
 * Run with: yarn ts-node src/scripts/testing/quickCollectionTest.ts
 */

import { BotBranding } from "../../config/bot";
import {
  getCollectionAnnouncement,
  shouldAnnounceCollection,
} from "../../content/collectionAnnouncements";

console.log("🎭 Quick Collection Announcement Test\n");

const testAmounts = [
  { amount: 10000, label: "Small Collection" },
  { amount: 75000, label: "Medium Collection" },
  { amount: 300000, label: "Large Collection" },
  { amount: 800000, label: "Massive Collection" },
];

const testUsername = "QuickTester";

console.log(`Testing announcements for user: ${testUsername}\n`);
console.log("=".repeat(60));

testAmounts.forEach((test, index) => {
  console.log(
    `\n${index + 1}. ${test.label}: ${BotBranding.formatCurrency(test.amount)}`
  );

  const shouldAnnounce = shouldAnnounceCollection(test.amount);
  console.log(`   Should Announce: ${shouldAnnounce ? "✅ YES" : "❌ NO"}`);

  if (shouldAnnounce) {
    const announcement = getCollectionAnnouncement(testUsername, test.amount);
    console.log(`   📢 "${announcement}"`);
  }

  console.log("   " + "-".repeat(50));
});

console.log("\n✅ Quick test completed!");
console.log("\n💡 To test in Discord:");
console.log("   1. Set up business assets with high income rates");
console.log(
  "   2. Wait for income to accumulate (or modify lastIncomeTime in database)"
);
console.log("   3. Run /business collect");
console.log("   4. Watch for both private and public messages!");
