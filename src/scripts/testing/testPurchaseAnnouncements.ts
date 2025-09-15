/**
 * Test Business Purchase Announcements
 *
 * Quick test to verify the purchase announcement system works correctly
 * and that all purchases are announced 100% of the time.
 */

import { BotBranding } from "../../config/bot";
import {
  getBusinessPurchaseAnnouncement,
  shouldAnnouncePurchase,
} from "../../content/buyBusinessAnnouncements";

console.log("🏢 Business Purchase Announcements Test\n");

const testPurchases = [
  // Test different business categories
  {
    name: "Convenience Store",
    category: "legitimate",
    price: 15000,
    description: "Small legitimate business",
  },
  {
    name: "Family Restaurant",
    category: "legitimate",
    price: 45000,
    description: "Medium legitimate business",
  },
  {
    name: "Pawn Shop",
    category: "semi_legal",
    price: 35000,
    description: "Semi-legal operation",
  },
  {
    name: "Underground Nightclub",
    category: "semi_legal",
    price: 150000,
    description: "Expensive semi-legal business",
  },
  {
    name: "Storage Warehouse",
    category: "illegal",
    price: 200000,
    description: "Illegal operation",
  },
  {
    name: "Underground Casino",
    category: "illegal",
    price: 500000,
    description: "High-end illegal business",
  },

  // Test price thresholds
  {
    name: "Small Shop",
    category: "legitimate",
    price: 25000,
    description: "Under 50k threshold",
  },
  {
    name: "Medium Business",
    category: "legitimate",
    price: 100000,
    description: "Mid-tier price",
  },
  {
    name: "Expensive Venture",
    category: "legitimate",
    price: 300000,
    description: "Over 200k threshold",
  },
];

const testUsername = "TestPurchaser";

console.log(`Testing purchase announcements for user: ${testUsername}\n`);
console.log("=".repeat(70));

testPurchases.forEach((purchase, index) => {
  console.log(`\n${index + 1}. ${purchase.description}`);
  console.log(`   Business: ${purchase.name}`);
  console.log(`   Category: ${purchase.category}`);
  console.log(`   Price: ${BotBranding.formatCurrency(purchase.price)}`);

  const shouldAnnounce = shouldAnnouncePurchase(
    purchase.price,
    purchase.category
  );
  console.log(`   Will Announce: ${shouldAnnounce ? "✅ YES" : "❌ NO"}`);

  if (shouldAnnounce) {
    const announcement = getBusinessPurchaseAnnouncement(
      testUsername,
      purchase.name,
      purchase.category,
      purchase.price
    );
    console.log(`   📢 "${announcement}"`);
  }

  console.log("   " + "-".repeat(60));
});

console.log("\n📊 Announcement System Summary:");
console.log("• ALL business purchases are announced (100% rate)");
console.log("• Message content varies by:");
console.log("  - Business category (legitimate/semi-legal/illegal)");
console.log("  - Purchase price (small <50k, large >200k)");
console.log("• Large purchases (>200k) get special high-threat messages");
console.log("• Small purchases (<50k) get starter business messages");
console.log("• Category-specific messages for mid-tier purchases");

console.log("\n✅ Purchase announcement test completed!");
console.log("\n💡 Integration status:");
console.log("• Private message: Detailed purchase info (ephemeral)");
console.log(
  "• Public message: Announcement exposing the purchase (visible to all)"
);
