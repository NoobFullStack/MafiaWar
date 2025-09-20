/**
 * Test Collection Announcements System
 *
 * This script tests the business income collection announcement system
 * by simulating realistic collection scenarios with various amounts.
 *
 * Run with: yarn ts-node src/scripts/testing/testCollectionAnnouncements.ts
 */

import { PrismaClient } from "@prisma/client";
import { BotBranding } from "../src/config/bot";
import {
  collectionAnnouncements,
  getCollectionAnnouncement,
  shouldAnnounceCollection,
} from "../src/content/collectionAnnouncements";

const prisma = new PrismaClient();

interface TestUser {
  discordId: string;
  username: string;
  character?: {
    cashOnHand: number;
    bankBalance: number;
    cryptoWallet: any;
  };
}

interface TestScenario {
  name: string;
  collectionAmount: number;
  description: string;
  expectedTier: "small" | "medium" | "large" | "massive";
}

const testScenarios: TestScenario[] = [
  {
    name: "Small Business Collection",
    collectionAmount: 25000,
    description: "A modest convenience store collection",
    expectedTier: "small",
  },
  {
    name: "Medium Business Collection",
    collectionAmount: 125000,
    description: "A successful restaurant chain collection",
    expectedTier: "medium",
  },
  {
    name: "Large Business Collection",
    collectionAmount: 350000,
    description: "A nightclub empire collection",
    expectedTier: "large",
  },
  {
    name: "Massive Business Collection",
    collectionAmount: 750000,
    description: "A casino/heist-level collection",
    expectedTier: "massive",
  },
  {
    name: "Edge Case - Tiny Amount",
    collectionAmount: 5000,
    description: "Very small collection - low announcement chance",
    expectedTier: "small",
  },
  {
    name: "Edge Case - Medium Threshold",
    collectionAmount: 50000,
    description: "Exactly on medium threshold",
    expectedTier: "medium",
  },
  {
    name: "Edge Case - Large Threshold",
    collectionAmount: 200000,
    description: "Exactly on large threshold",
    expectedTier: "large",
  },
  {
    name: "Edge Case - Massive Threshold",
    collectionAmount: 500000,
    description: "Exactly on massive threshold",
    expectedTier: "massive",
  },
];

async function createTestUser(username: string): Promise<TestUser> {
  const discordId = `test_${username.toLowerCase()}_${Date.now()}`;

  try {
    // Create or find test user
    const user = await prisma.user.upsert({
      where: { discordId },
      update: {},
      create: {
        discordId,
        username,
        character: {
          create: {
            name: `${username} The Tester`,
            stats: JSON.stringify({
              strength: 10,
              stealth: 8,
              intelligence: 12,
              charisma: 9,
            }),
            cashOnHand: 1000000, // Give them plenty of money for testing
            bankBalance: 2000000,
            cryptoWallet: JSON.stringify({
              bitcoin: 10.5,
              ethereum: 25.0,
              mafia: 1000.0,
            }),
            level: 15,
            experience: 50000,
            reputation: 1000,
          },
        },
      },
      include: {
        character: true,
      },
    });

    return {
      discordId: user.discordId,
      username: user.username,
      character: user.character
        ? {
            cashOnHand: user.character.cashOnHand,
            bankBalance: user.character.bankBalance,
            cryptoWallet: user.character.cryptoWallet,
          }
        : undefined,
    };
  } catch (error) {
    console.error(`Failed to create test user ${username}:`, error);
    throw error;
  }
}

async function createTestAssets(userId: string): Promise<void> {
  try {
    // Create realistic business assets for testing
    const assets = [
      {
        type: "convenience_store",
        name: "Quick Stop Market",
        level: 3,
        incomeRate: 15000, // $15k/hour
        securityLevel: 2,
        value: 150000,
      },
      {
        type: "restaurant",
        name: "Famiglia Pizza",
        level: 5,
        incomeRate: 45000, // $45k/hour
        securityLevel: 4,
        value: 500000,
      },
      {
        type: "nightclub",
        name: "Neon Nights",
        level: 8,
        incomeRate: 125000, // $125k/hour
        securityLevel: 6,
        value: 1500000,
      },
      {
        type: "casino",
        name: "Lucky Strike Casino",
        level: 10,
        incomeRate: 250000, // $250k/hour
        securityLevel: 8,
        value: 3000000,
      },
    ];

    for (const asset of assets) {
      await prisma.asset.create({
        data: {
          ownerId: userId,
          type: asset.type,
          name: asset.name,
          level: asset.level,
          incomeRate: asset.incomeRate,
          securityLevel: asset.securityLevel,
          value: asset.value,
          lastIncomeTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago for testing
        },
      });
    }

    console.log(`✅ Created ${assets.length} test assets for user`);
  } catch (error) {
    console.error("Failed to create test assets:", error);
    throw error;
  }
}

function testAnnouncementLogic(): void {
  console.log("\n🧪 Testing Announcement Logic\n");
  console.log("=".repeat(50));

  // Test each scenario
  testScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. ${scenario.name}`);
    console.log(
      `   Amount: ${BotBranding.formatCurrency(scenario.collectionAmount)}`
    );
    console.log(`   Description: ${scenario.description}`);
    console.log(`   Expected Tier: ${scenario.expectedTier}`);

    // Test announcement probability
    const shouldAnnounce = shouldAnnounceCollection(scenario.collectionAmount);
    console.log(`   Should Announce: ${shouldAnnounce ? "✅ YES" : "❌ NO"}`);

    if (shouldAnnounce) {
      // Generate announcement message
      const announcement = getCollectionAnnouncement(
        "TestPlayer",
        scenario.collectionAmount
      );
      console.log(`   Message: "${announcement}"`);
    }

    console.log("   " + "-".repeat(40));
  });
}

function testMessageVariety(): void {
  console.log("\n🎲 Testing Message Variety\n");
  console.log("=".repeat(50));

  const testUsername = "VarietyTester";
  const testAmount = 750000; // Massive amount to guarantee announcement

  console.log(
    `Testing 10 messages for ${BotBranding.formatCurrency(
      testAmount
    )} collection:\n`
  );

  for (let i = 1; i <= 10; i++) {
    const announcement = getCollectionAnnouncement(testUsername, testAmount);
    console.log(`${i}. ${announcement}\n`);
  }
}

function testAnnouncementProbabilities(): void {
  console.log("\n📊 Testing Announcement Probabilities\n");
  console.log("=".repeat(50));

  const testAmounts = [5000, 25000, 75000, 150000, 300000, 600000];
  const testRuns = 1000;

  testAmounts.forEach((amount) => {
    let announceCount = 0;

    for (let i = 0; i < testRuns; i++) {
      if (shouldAnnounceCollection(amount)) {
        announceCount++;
      }
    }

    const actualPercentage = (announceCount / testRuns) * 100;
    console.log(
      `${BotBranding.formatCurrency(
        amount
      )}: ${announceCount}/${testRuns} = ${actualPercentage.toFixed(1)}%`
    );
  });
}

function displayAnnouncementTiers(): void {
  console.log("\n📋 Announcement Tier Overview\n");
  console.log("=".repeat(50));

  console.log("💰 SMALL (< $50k):");
  console.log(
    `   Messages: ${collectionAnnouncements.smallAmountMessages.length}`
  );
  console.log(
    `   Sample: "${collectionAnnouncements.smallAmountMessages[0].replace(
      "{username}",
      "TestPlayer"
    )}"\n`
  );

  console.log("💵 MEDIUM ($50k - $200k):");
  console.log(
    `   Messages: ${collectionAnnouncements.mediumAmountMessages.length}`
  );
  console.log(
    `   Sample: "${collectionAnnouncements.mediumAmountMessages[0].replace(
      "{username}",
      "TestPlayer"
    )}"\n`
  );

  console.log("💎 LARGE ($200k - $500k):");
  console.log(
    `   Messages: ${collectionAnnouncements.largeAmountMessages.length}`
  );
  console.log(
    `   Sample: "${collectionAnnouncements.largeAmountMessages[0].replace(
      "{username}",
      "TestPlayer"
    )}"\n`
  );

  console.log("👑 MASSIVE ($500k+):");
  console.log(
    `   Messages: ${collectionAnnouncements.massiveAmountMessages.length}`
  );
  console.log(
    `   Sample: "${collectionAnnouncements.massiveAmountMessages[0].replace(
      "{username}",
      "TestPlayer"
    )}"\n`
  );
}

async function simulateRealisticCollection(): Promise<void> {
  console.log("\n🎮 Simulating Realistic Collection Scenario\n");
  console.log("=".repeat(50));

  try {
    // Create test user
    const testUser = await createTestUser("CollectionTester");
    console.log(
      `✅ Created test user: ${testUser.username} (${testUser.discordId})`
    );

    // Create test assets
    const userId = (
      await prisma.user.findUnique({
        where: { discordId: testUser.discordId },
      })
    )?.id;

    if (!userId) {
      throw new Error("Failed to find created test user");
    }

    await createTestAssets(userId);

    // Simulate various collection scenarios
    const collections = [
      {
        description: "Hourly collection from convenience store",
        amount: 15000,
      },
      { description: "4-hour collection from restaurant", amount: 180000 },
      { description: "12-hour collection from nightclub", amount: 1500000 },
      { description: "Daily collection from casino empire", amount: 6000000 },
    ];

    console.log("\n📈 Collection Simulations:");
    collections.forEach((collection, index) => {
      console.log(`\n${index + 1}. ${collection.description}`);
      console.log(
        `   Amount: ${BotBranding.formatCurrency(collection.amount)}`
      );

      const shouldAnnounce = shouldAnnounceCollection(collection.amount);
      console.log(`   Will Announce: ${shouldAnnounce ? "✅ YES" : "❌ NO"}`);

      if (shouldAnnounce) {
        const announcement = getCollectionAnnouncement(
          testUser.username,
          collection.amount
        );
        console.log(`   📢 Announcement: "${announcement}"`);
      }
    });

    // Cleanup test data
    console.log("\n🧹 Cleaning up test data...");
    await prisma.asset.deleteMany({ where: { ownerId: userId } });
    await prisma.character.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { discordId: testUser.discordId } });
    console.log("✅ Test data cleaned up");
  } catch (error) {
    console.error("❌ Simulation failed:", error);
    throw error;
  }
}

async function main(): Promise<void> {
  console.log("🎭 MafiaWar Collection Announcements Test Suite");
  console.log("=".repeat(60));

  try {
    // Connect to database
    await prisma.$connect();
    console.log("✅ Connected to database");

    // Run tests
    displayAnnouncementTiers();
    testAnnouncementLogic();
    testAnnouncementProbabilities();
    testMessageVariety();
    await simulateRealisticCollection();

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n💡 Integration Tips:");
    console.log(
      "   - Small amounts have low announcement chance to avoid spam"
    );
    console.log("   - Large amounts always announce to create targets");
    console.log("   - Messages get more threatening as amounts increase");
    console.log("   - Use followUp() in Discord to send public announcements");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log("\n✅ Disconnected from database");
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Test interrupted, cleaning up...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Test terminated, cleaning up...");
  await prisma.$disconnect();
  process.exit(0);
});

// Run the test suite
if (require.main === module) {
  main().catch(console.error);
}

export {
  simulateRealisticCollection,
  testAnnouncementLogic,
  testAnnouncementProbabilities,
  testMessageVariety,
};
