#!/usr/bin/env ts-node

/**
 * SQLite Compatibility Test - Proof of Concept
 * 
 * Tests a simplified version of the schema with SQLite to verify compatibility
 * with key features before making migration decision.
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  duration: number;
}

class SQLiteCompatibilityTester {
  private testResults: TestResult[] = [];
  private sqliteSchema: string;
  
  constructor() {
    this.sqliteSchema = this.generateSQLiteSchema();
  }

  private generateSQLiteSchema(): string {
    // Simplified schema with key features for testing
    return `
// This is a test Prisma schema for SQLite compatibility testing
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test-sqlite.db"
}

model TestUser {
  id        String   @id @default(cuid())
  discordId String   @unique
  username  String
  createdAt DateTime @default(now())
  character TestCharacter?
  assets    TestAsset[]
  logs      TestLog[]
}

model TestCharacter {
  id           String   @id @default(cuid())
  name         String
  userId       String   @unique
  stats        Json     // Test JSON field
  cryptoWallet Json     @default("{}")
  cashOnHand   Int      @default(0)
  bankBalance  Int      @default(0)
  level        Int      @default(1)
  user         TestUser @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model TestAsset {
  id          String   @id @default(cuid())
  ownerId     String
  type        String
  name        String
  level       Int      @default(1)
  value       Int      @default(0)
  lastIncome  DateTime @default(now())
  owner       TestUser @relation(fields: [ownerId], references: [id], onDelete: Cascade)
}

model TestLog {
  id        String   @id @default(cuid())
  userId    String
  actionType String
  details   Json
  timestamp DateTime @default(now())
  user      TestUser @relation(fields: [userId], references: [id], onDelete: Cascade)
}
`;
  }

  async runCompatibilityTests(): Promise<TestResult[]> {
    console.log('🧪 Starting SQLite Compatibility Tests...\n');

    // Create test schema file
    await this.createTestSchema();

    // Run tests
    await this.testSchemaGeneration();
    await this.testBasicCRUD();
    await this.testJSONOperations();
    await this.testTransactions();
    await this.testRelationships();
    await this.testConcurrency();

    // Cleanup
    await this.cleanup();

    return this.testResults;
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      this.testResults.push({
        testName,
        success: true,
        duration: Date.now() - startTime
      });
      console.log(`  ✅ ${testName} - PASSED`);
    } catch (error) {
      this.testResults.push({
        testName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      console.log(`  ❌ ${testName} - FAILED: ${error}`);
    }
  }

  private async createTestSchema(): Promise<void> {
    const schemaPath = join(process.cwd(), 'test-schema.prisma');
    writeFileSync(schemaPath, this.sqliteSchema);
  }

  private async testSchemaGeneration(): Promise<void> {
    await this.runTest('Schema Generation', async () => {
      // Test if Prisma can generate client for SQLite schema
      const { execSync } = require('child_process');
      execSync('npx prisma generate --schema=./test-schema.prisma', { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
    });
  }

  private async testBasicCRUD(): Promise<void> {
    await this.runTest('Basic CRUD Operations', async () => {
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: "file:./test-sqlite.db"
          }
        }
      });

      try {
        // Apply migrations
        const { execSync } = require('child_process');
        execSync('npx prisma db push --schema=./test-schema.prisma --force-reset', { 
          stdio: 'pipe' 
        });

        // Test Create
        const user = await prisma.testUser.create({
          data: {
            discordId: '123456789',
            username: 'testuser',
            character: {
              create: {
                name: 'Test Character',
                stats: { strength: 10, stealth: 5 },
                cryptoWallet: { bitcoin: 1.5 }
              }
            }
          },
          include: {
            character: true
          }
        });

        // Test Read
        const foundUser = await prisma.testUser.findUnique({
          where: { discordId: '123456789' },
          include: { character: true, assets: true }
        });

        if (!foundUser) throw new Error('User not found after creation');

        // Test Update
        await prisma.testCharacter.update({
          where: { userId: user.id },
          data: { 
            stats: { strength: 15, stealth: 8 },
            cashOnHand: 1000
          }
        });

        // Test Delete
        await prisma.testUser.delete({
          where: { id: user.id }
        });

      } finally {
        await prisma.$disconnect();
      }
    });
  }

  private async testJSONOperations(): Promise<void> {
    await this.runTest('JSON Field Operations', async () => {
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: "file:./test-sqlite.db"
          }
        }
      });

      try {
        const user = await prisma.testUser.create({
          data: {
            discordId: '987654321',
            username: 'jsontest',
            character: {
              create: {
                name: 'JSON Test',
                stats: { 
                  strength: 10, 
                  stealth: 5, 
                  intelligence: 8,
                  nested: { skills: ['hacking', 'lockpicking'] }
                },
                cryptoWallet: { 
                  bitcoin: 1.5, 
                  ethereum: 0.8,
                  dogecoin: 1000
                }
              }
            }
          },
          include: { character: true }
        });

        // Test JSON field updates
        await prisma.testCharacter.update({
          where: { userId: user.id },
          data: {
            stats: {
              strength: 12,
              stealth: 7,
              intelligence: 10,
              nested: { skills: ['hacking', 'lockpicking', 'social_engineering'] }
            }
          }
        });

        // Test retrieving JSON data
        const updated = await prisma.testCharacter.findUnique({
          where: { userId: user.id }
        });

        if (!updated) throw new Error('Character not found');

        const stats = updated.stats as any;
        if (stats.strength !== 12) throw new Error('JSON update failed');

        await prisma.testUser.delete({ where: { id: user.id } });

      } finally {
        await prisma.$disconnect();
      }
    });
  }

  private async testTransactions(): Promise<void> {
    await this.runTest('Transaction Support', async () => {
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: "file:./test-sqlite.db"
          }
        }
      });

      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.testUser.create({
            data: {
              discordId: '555666777',
              username: 'txtest'
            }
          });

          const character = await tx.testCharacter.create({
            data: {
              name: 'TX Test',
              userId: user.id,
              stats: { strength: 5 },
              cashOnHand: 500
            }
          });

          await tx.testAsset.create({
            data: {
              ownerId: user.id,
              type: 'shop',
              name: 'Test Shop',
              value: 1000
            }
          });

          // Test rollback
          if (character.cashOnHand < 1000) {
            throw new Error('Intentional rollback test');
          }
        });

        throw new Error('Transaction should have rolled back');

      } catch (error) {
        if (error instanceof Error && error.message === 'Intentional rollback test') {
          // Check that rollback worked
          const user = await prisma.testUser.findUnique({
            where: { discordId: '555666777' }
          });
          if (user) {
            throw new Error('Transaction rollback failed');
          }
        } else {
          throw error;
        }
      } finally {
        await prisma.$disconnect();
      }
    });
  }

  private async testRelationships(): Promise<void> {
    await this.runTest('Complex Relationships', async () => {
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: "file:./test-sqlite.db"
          }
        }
      });

      try {
        const user = await prisma.testUser.create({
          data: {
            discordId: '111222333',
            username: 'reltest',
            character: {
              create: {
                name: 'Rel Test',
                stats: { strength: 10 }
              }
            },
            assets: {
              create: [
                { type: 'shop', name: 'Shop 1', value: 1000 },
                { type: 'warehouse', name: 'Warehouse 1', value: 5000 }
              ]
            },
            logs: {
              create: [
                { actionType: 'crime', details: { type: 'robbery', success: true } },
                { actionType: 'purchase', details: { item: 'asset', name: 'Shop 1' } }
              ]
            }
          },
          include: {
            character: true,
            assets: true,
            logs: true
          }
        });

        if (!user.character) throw new Error('Character relation failed');
        if (user.assets.length !== 2) throw new Error('Assets relation failed');
        if (user.logs.length !== 2) throw new Error('Logs relation failed');

        // Test cascade delete
        await prisma.testUser.delete({
          where: { id: user.id }
        });

        // Verify cascade worked
        const orphanCharacter = await prisma.testCharacter.findUnique({
          where: { userId: user.id }
        });
        if (orphanCharacter) throw new Error('Cascade delete failed');

      } finally {
        await prisma.$disconnect();
      }
    });
  }

  private async testConcurrency(): Promise<void> {
    await this.runTest('Concurrent Operations', async () => {
      const prisma1 = new PrismaClient({
        datasources: { db: { url: "file:./test-sqlite.db" } }
      });
      const prisma2 = new PrismaClient({
        datasources: { db: { url: "file:./test-sqlite.db" } }
      });

      try {
        // Test concurrent reads
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(
            prisma1.testUser.create({
              data: {
                discordId: `concurrent${i}`,
                username: `user${i}`
              }
            })
          );
        }

        await Promise.all(promises);

        // Test concurrent reads
        const readPromises = [];
        for (let i = 0; i < 10; i++) {
          readPromises.push(prisma1.testUser.findMany());
          readPromises.push(prisma2.testUser.findMany());
        }

        await Promise.all(readPromises);

        // Cleanup
        await prisma1.testUser.deleteMany({});

      } finally {
        await prisma1.$disconnect();
        await prisma2.$disconnect();
      }
    });
  }

  private async cleanup(): Promise<void> {
    try {
      const fs = require('fs');
      
      // Remove test files
      if (existsSync('test-schema.prisma')) {
        fs.unlinkSync('test-schema.prisma');
      }
      if (existsSync('test-sqlite.db')) {
        fs.unlinkSync('test-sqlite.db');
      }
      if (existsSync('test-sqlite.db-journal')) {
        fs.unlinkSync('test-sqlite.db-journal');
      }
    } catch (error) {
      console.log('⚠️  Cleanup warning:', error);
    }
  }

  generateCompatibilityReport(): string {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const averageTime = this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalTests;

    let report = `
# SQLite Compatibility Test Report

## Test Summary
- **Total Tests:** ${totalTests}
- **Passed:** ${passedTests} ✅
- **Failed:** ${failedTests} ${failedTests > 0 ? '❌' : '✅'}
- **Success Rate:** ${((passedTests/totalTests) * 100).toFixed(1)}%
- **Average Test Time:** ${averageTime.toFixed(0)}ms

## Test Results

`;

    for (const result of this.testResults) {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      report += `### ${result.testName} - ${status} (${result.duration}ms)\n`;
      if (!result.success && result.error) {
        report += `**Error:** ${result.error}\n`;
      }
      report += '\n';
    }

    report += `
## Compatibility Assessment

`;

    if (failedTests === 0) {
      report += `
✅ **EXCELLENT COMPATIBILITY**
All core features work correctly with SQLite. Migration should be straightforward.

**Recommendations:**
- Proceed with migration planning
- Implement comprehensive testing with real data
- Create backup and rollback procedures
`;
    } else if (failedTests <= 2) {
      report += `
⚠️ **GOOD COMPATIBILITY WITH MINOR ISSUES**
Most features work correctly, but some issues need addressing.

**Recommendations:**
- Investigate and resolve failing tests
- Implement workarounds for identified issues
- Proceed with caution after fixes
`;
    } else {
      report += `
❌ **POOR COMPATIBILITY**
Multiple critical features fail with SQLite.

**Recommendations:**
- Do not proceed with migration
- Focus on PostgreSQL optimization instead
- Consider addressing root causes before reconsidering
`;
    }

    return report;
  }
}

async function main() {
  try {
    const tester = new SQLiteCompatibilityTester();
    await tester.runCompatibilityTests();
    
    console.log('\n' + '='.repeat(80));
    console.log('🧪 COMPATIBILITY TESTING COMPLETE');
    console.log('='.repeat(80));
    
    const report = tester.generateCompatibilityReport();
    const reportPath = join(process.cwd(), 'docs', 'development', 'sqlite-compatibility-test.md');
    writeFileSync(reportPath, report);
    
    console.log(`\n📄 Compatibility report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Compatibility testing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SQLiteCompatibilityTester };