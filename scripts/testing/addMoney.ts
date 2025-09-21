import { PrismaClient } from "@prisma/client";
import { MoneyService } from "../../src/services/MoneyService";

const prisma = new PrismaClient();

async function addMoney() {
  try {
    // Get your Discord ID from command line args or hardcode it
    const discordId = process.argv[2];
    const amount = parseInt(process.argv[3]) || 10000;
    const moneyType = process.argv[4] || "cash"; // 'cash', 'bank', or 'crypto'

    if (!discordId) {
      console.log("Usage: ts-node addMoney.ts <discordId> [amount] [type]");
      console.log("Example: ts-node addMoney.ts 123456789012345678 50000 cash");
      console.log("Types: cash, bank, crypto (defaults to cash)");
      process.exit(1);
    }

    console.log(
      `Adding ${amount} to ${moneyType} for Discord ID: ${discordId}`
    );

    // Find the user
    const user = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });

    if (!user || !user.character) {
      console.log("❌ User or character not found!");
      process.exit(1);
    }

    console.log(`Found character: ${user.character.name}`);

    // Initialize services
    const moneyService = MoneyService.getInstance();

    // Add money based on type
    if (moneyType === "cash") {
      await moneyService.addMoney(discordId, amount, "cash");
      console.log(`✅ Added ${amount} cash to ${user.character.name}`);
    } else if (moneyType === "bank") {
      await moneyService.addMoney(discordId, amount, "bank");
      console.log(
        `✅ Added ${amount} to bank account for ${user.character.name}`
      );
    } else if (moneyType === "crypto") {
      // For crypto, let's add some Bitcoin
      const btcPrice = 45000; // Approximate BTC price
      const btcAmount = amount / btcPrice;

      await prisma.character.update({
        where: { id: user.character.id },
        data: {
          cryptoWallet: {
            bitcoin: btcAmount,
          },
        },
      });
      console.log(
        `✅ Added ${btcAmount.toFixed(8)} BTC (≈$${amount}) to ${
          user.character.name
        }`
      );
    }

    // Show updated balance
    const balance = await moneyService.getUserBalance(discordId, true);
    console.log("\n📊 Updated Balance:");
    console.log(`💵 Cash: $${balance?.cashOnHand.toLocaleString()}`);
    console.log(`🏦 Bank: $${balance?.bankBalance.toLocaleString()}`);
    console.log(
      `₿ Crypto: $${(
        (balance?.totalValue || 0) -
        (balance?.cashOnHand || 0) -
        (balance?.bankBalance || 0)
      ).toLocaleString()}`
    );
    console.log(`💰 Total: $${balance?.totalValue?.toLocaleString()}`);
  } catch (error) {
    console.error("❌ Error adding money:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

addMoney();
