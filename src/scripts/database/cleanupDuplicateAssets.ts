/**
 * CLEANUP DUPLICATE ASSETS SCRIPT
 *
 * This script helps clean up duplicate assets that may have been created
 * due to race conditions in the purchase system.
 */

import DatabaseManager from "../../utils/DatabaseManager";

interface AssetCount {
  ownerId: string;
  name: string;
  type: string;
  count: number;
  assets: Array<{
    id: string;
    lastIncomeTime: Date;
    level: number;
    incomeRate: number;
  }>;
}

async function findDuplicateAssets(): Promise<AssetCount[]> {
  const db = DatabaseManager.getClient();

  // Get all assets grouped by owner, name, and type
  const assets = await db.asset.findMany({
    orderBy: [
      { ownerId: "asc" },
      { name: "asc" },
      { lastIncomeTime: "asc" }, // Use lastIncomeTime as a proxy for creation order
    ],
  });

  // Group by owner + name + type to find duplicates
  const grouped = new Map<string, AssetCount>();

  assets.forEach((asset: any) => {
    const key = `${asset.ownerId}-${asset.name}-${asset.type}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        ownerId: asset.ownerId,
        name: asset.name,
        type: asset.type,
        count: 0,
        assets: [],
      });
    }

    const group = grouped.get(key)!;
    group.count++;
    group.assets.push({
      id: asset.id,
      lastIncomeTime: asset.lastIncomeTime,
      level: asset.level,
      incomeRate: asset.incomeRate,
    });
  });

  // Return only groups with duplicates
  return Array.from(grouped.values()).filter((group) => group.count > 1);
}

async function cleanupDuplicates(dryRun: boolean = true): Promise<void> {
  try {
    await DatabaseManager.connect();

    console.log("🔍 Scanning for duplicate assets...\n");

    const duplicates = await findDuplicateAssets();

    if (duplicates.length === 0) {
      console.log("✅ No duplicate assets found!");
      return;
    }

    console.log(
      `⚠️  Found ${duplicates.length} groups with duplicate assets:\n`
    );

    for (const group of duplicates) {
      console.log(`👤 Owner: ${group.ownerId.substring(0, 8)}...`);
      console.log(`🏢 Asset: ${group.name} (${group.type})`);
      console.log(`📊 Count: ${group.count} duplicates`);

      // Sort by lastIncomeTime to keep the first one created (likely the oldest)
      group.assets.sort(
        (a, b) => a.lastIncomeTime.getTime() - b.lastIncomeTime.getTime()
      );

      console.log("   Assets:");
      group.assets.forEach((asset, index) => {
        const isKeep = index === 0;
        console.log(
          `   ${isKeep ? "✅ KEEP" : "❌ DELETE"} ${asset.id.substring(
            0,
            8
          )}... (Level ${asset.level}, Last Income: ${
            asset.lastIncomeTime.toISOString().split("T")[0]
          })`
        );
      });

      if (!dryRun) {
        // Delete all but the first (oldest) asset
        const assetsToDelete = group.assets.slice(1);

        for (const assetToDelete of assetsToDelete) {
          await DatabaseManager.getClient().asset.delete({
            where: { id: assetToDelete.id },
          });
          console.log(
            `   🗑️  Deleted asset ${assetToDelete.id.substring(0, 8)}...`
          );
        }
      }

      console.log();
    }

    if (dryRun) {
      console.log("🔴 DRY RUN MODE - No assets were actually deleted.");
      console.log(
        "💡 To actually delete duplicates, run: yarn cleanup-duplicates --execute"
      );
    } else {
      console.log("✅ Cleanup completed!");
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await DatabaseManager.disconnect();
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes("--execute");

if (dryRun) {
  console.log("🟡 RUNNING IN DRY RUN MODE");
  console.log(
    "📋 This will show what would be deleted without actually deleting anything.\n"
  );
}

cleanupDuplicates(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
