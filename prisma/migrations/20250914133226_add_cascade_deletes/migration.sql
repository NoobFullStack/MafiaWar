-- DropForeignKey
ALTER TABLE "public"."ActionLog" DROP CONSTRAINT "ActionLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Asset" DROP CONSTRAINT "Asset_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AssetRobberyLog" DROP CONSTRAINT "AssetRobberyLog_assetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AssetRobberyLog" DROP CONSTRAINT "AssetRobberyLog_robberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AssetUpgrade" DROP CONSTRAINT "AssetUpgrade_assetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BankTransaction" DROP CONSTRAINT "BankTransaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Character" DROP CONSTRAINT "Character_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CryptoTransaction" DROP CONSTRAINT "CryptoTransaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GangMember" DROP CONSTRAINT "GangMember_gangId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GangMember" DROP CONSTRAINT "GangMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Inventory" DROP CONSTRAINT "Inventory_itemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Inventory" DROP CONSTRAINT "Inventory_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Leaderboard" DROP CONSTRAINT "Leaderboard_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MoneyEvent" DROP CONSTRAINT "MoneyEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMission" DROP CONSTRAINT "UserMission_missionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserMission" DROP CONSTRAINT "UserMission_userId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GangMember" ADD CONSTRAINT "GangMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GangMember" ADD CONSTRAINT "GangMember_gangId_fkey" FOREIGN KEY ("gangId") REFERENCES "public"."Gang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inventory" ADD CONSTRAINT "Inventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Asset" ADD CONSTRAINT "Asset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetRobberyLog" ADD CONSTRAINT "AssetRobberyLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetRobberyLog" ADD CONSTRAINT "AssetRobberyLog_robberId_fkey" FOREIGN KEY ("robberId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssetUpgrade" ADD CONSTRAINT "AssetUpgrade_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMission" ADD CONSTRAINT "UserMission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMission" ADD CONSTRAINT "UserMission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActionLog" ADD CONSTRAINT "ActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Leaderboard" ADD CONSTRAINT "Leaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MoneyEvent" ADD CONSTRAINT "MoneyEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BankTransaction" ADD CONSTRAINT "BankTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CryptoTransaction" ADD CONSTRAINT "CryptoTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
