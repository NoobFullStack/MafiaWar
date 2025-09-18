import DatabaseManager from "../../utils/DatabaseManager";
import { MoneyServiceV2 } from "../../services/MoneyServiceV2";
import { logger } from "../../utils/ResponseUtil";

/**
 * Test script to validate MoneyServiceV2 hybrid capabilities
 * This tests the service's ability to read from both old and new systems
 */

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

async function runHybridServiceTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const moneyService = MoneyServiceV2.getInstance();

  try {
    await DatabaseManager.connect();
    
    logger.info("Starting MoneyServiceV2 hybrid system tests...");

    // Test 1: Get balance from Character table (fallback mode)
    try {
      const db = DatabaseManager.getClient();
      
      // Find a user with character but no currency balances (legacy mode)
      const legacyUser = await db.user.findFirst({
        where: {
          character: { isNot: null },
          currencyBalances: { none: {} }
        },
        include: { character: true }
      });

      if (legacyUser) {
        const balance = await moneyService.getUserBalance(legacyUser.discordId);
        
        if (balance) {
          const characterBalance = legacyUser.character!;
          const cryptoWallet = typeof characterBalance.cryptoWallet === 'string' 
            ? JSON.parse(characterBalance.cryptoWallet) 
            : characterBalance.cryptoWallet;

          const match = 
            balance.cashOnHand === characterBalance.cashOnHand &&
            balance.bankBalance === characterBalance.bankBalance &&
            JSON.stringify(balance.cryptoWallet) === JSON.stringify(cryptoWallet);

          results.push({
            testName: "Legacy Character Table Read",
            passed: match,
            details: {
              expected: {
                cash: characterBalance.cashOnHand,
                bank: characterBalance.bankBalance,
                crypto: cryptoWallet
              },
              actual: balance
            }
          });
        } else {
          results.push({
            testName: "Legacy Character Table Read",
            passed: false,
            error: "Could not retrieve balance"
          });
        }
      } else {
        results.push({
          testName: "Legacy Character Table Read",
          passed: true,
          details: "No legacy users found (this is expected if migration has run)"
        });
      }
    } catch (error) {
      results.push({
        testName: "Legacy Character Table Read",
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 2: Get balance from CurrencyBalance tables (new mode)
    try {
      const db = DatabaseManager.getClient();
      
      // Find a user with currency balances (new mode)
      const newUser = await db.user.findFirst({
        where: {
          currencyBalances: { some: {} }
        },
        include: { 
          character: true, 
          currencyBalances: true,
          bankingProfile: true 
        }
      });

      if (newUser) {
        const balance = await moneyService.getUserBalance(newUser.discordId);
        
        if (balance) {
          // Calculate expected values from CurrencyBalance records
          let expectedCash = 0;
          let expectedBank = 0;
          const expectedCrypto: Record<string, number> = {};

          for (const cb of newUser.currencyBalances) {
            if (cb.currencyType === "cash" && !cb.coinType) {
              expectedCash = cb.amount;
            } else if (cb.currencyType === "bank" && !cb.coinType) {
              expectedBank = cb.amount;
            } else if (cb.currencyType === "crypto" && cb.coinType) {
              expectedCrypto[cb.coinType] = cb.amount;
            }
          }

          const match = 
            balance.cashOnHand === expectedCash &&
            balance.bankBalance === expectedBank &&
            JSON.stringify(balance.cryptoWallet) === JSON.stringify(expectedCrypto);

          results.push({
            testName: "New CurrencyBalance Table Read",
            passed: match,
            details: {
              expected: {
                cash: expectedCash,
                bank: expectedBank,
                crypto: expectedCrypto
              },
              actual: balance
            }
          });
        } else {
          results.push({
            testName: "New CurrencyBalance Table Read",
            passed: false,
            error: "Could not retrieve balance"
          });
        }
      } else {
        results.push({
          testName: "New CurrencyBalance Table Read",
          passed: true,
          details: "No migrated users found (this is expected if migration hasn't run yet)"
        });
      }
    } catch (error) {
      results.push({
        testName: "New CurrencyBalance Table Read",
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 3: Banking profile hybrid read
    try {
      const db = DatabaseManager.getClient();
      
      // Test with a user that has a character
      const testUser = await db.user.findFirst({
        where: { character: { isNot: null } },
        include: { character: true, bankingProfile: true }
      });

      if (testUser) {
        const profile = await (moneyService as any).getBankingProfile(testUser.discordId);
        
        if (profile) {
          // Determine expected source
          const expected = testUser.bankingProfile ? {
            accessLevel: testUser.bankingProfile.accessLevel,
            lastVisit: testUser.bankingProfile.lastVisit,
            interestAccrued: testUser.bankingProfile.interestAccrued
          } : {
            accessLevel: testUser.character!.bankAccessLevel,
            lastVisit: testUser.character!.lastBankVisit,
            interestAccrued: testUser.character!.bankInterestAccrued
          };

          const match = 
            profile.accessLevel === expected.accessLevel &&
            profile.interestAccrued === expected.interestAccrued;

          results.push({
            testName: "Banking Profile Hybrid Read",
            passed: match,
            details: {
              expected,
              actual: profile,
              source: testUser.bankingProfile ? "BankingProfile table" : "Character table"
            }
          });
        } else {
          results.push({
            testName: "Banking Profile Hybrid Read",
            passed: false,
            error: "Could not retrieve banking profile"
          });
        }
      } else {
        results.push({
          testName: "Banking Profile Hybrid Read",
          passed: false,
          error: "No test users found"
        });
      }
    } catch (error) {
      results.push({
        testName: "Banking Profile Hybrid Read",
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 4: Crypto price functionality
    try {
      const price = await moneyService.getCoinPrice("crypto");
      
      results.push({
        testName: "Crypto Price Retrieval",
        passed: typeof price === "number" && price > 0,
        details: { price }
      });
    } catch (error) {
      results.push({
        testName: "Crypto Price Retrieval",
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }

  } catch (error) {
    logger.error("Test suite failed:", error);
    results.push({
      testName: "Test Suite Setup",
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    await DatabaseManager.disconnect();
  }

  return results;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runHybridServiceTests()
    .then((results) => {
      console.log("\n=== MoneyServiceV2 Hybrid System Test Results ===\n");
      
      let passed = 0;
      let failed = 0;

      results.forEach((result) => {
        const status = result.passed ? "✅ PASS" : "❌ FAIL";
        console.log(`${status} ${result.testName}`);
        
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        
        if (result.details) {
          console.log(`   Details:`, JSON.stringify(result.details, null, 2));
        }
        
        console.log("");
        
        if (result.passed) {
          passed++;
        } else {
          failed++;
        }
      });

      console.log(`Summary: ${passed} passed, ${failed} failed`);
      
      if (failed === 0) {
        console.log("🎉 All tests passed!");
        process.exit(0);
      } else {
        console.log("⚠️ Some tests failed!");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Test execution failed:", error);
      process.exit(1);
    });
}

export { runHybridServiceTests };