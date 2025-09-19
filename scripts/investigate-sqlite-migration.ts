#!/usr/bin/env ts-node

/**
 * SQLite Migration Investigation Script
 * 
 * This script analyzes the current Supabase/PostgreSQL usage and evaluates
 * the feasibility of migrating to SQLite3 for performance gains.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface AnalysisResult {
  currentDatabase: {
    provider: string;
    models: number;
    relationships: number;
    features: string[];
  };
  supabaseUsage: {
    filesUsingSupabase: string[];
    directUsage: boolean;
    onlyPrismaUsage: boolean;
  };
  postgresFeatures: {
    jsonFields: string[];
    arrays: string[];
    uuids: boolean;
    indexes: string[];
    constraints: string[];
  };
  migrationComplexity: {
    highRisk: string[];
    mediumRisk: string[];
    lowRisk: string[];
  };
  performanceImplications: {
    currentBottlenecks: string[];
    sqliteAdvantages: string[];
    sqliteDisadvantages: string[];
  };
}

class SQLiteMigrationInvestigator {
  private rootDir: string;
  private result: AnalysisResult;

  constructor() {
    this.rootDir = process.cwd();
    this.result = {
      currentDatabase: {
        provider: '',
        models: 0,
        relationships: 0,
        features: []
      },
      supabaseUsage: {
        filesUsingSupabase: [],
        directUsage: false,
        onlyPrismaUsage: true
      },
      postgresFeatures: {
        jsonFields: [],
        arrays: [],
        uuids: false,
        indexes: [],
        constraints: []
      },
      migrationComplexity: {
        highRisk: [],
        mediumRisk: [],
        lowRisk: []
      },
      performanceImplications: {
        currentBottlenecks: [],
        sqliteAdvantages: [
          'Zero-latency local file access',
          'No network round trips',
          'Simplified deployment (single file)',
          'No external dependencies',
          'Built-in backup (file copy)',
          'Excellent read performance for single-user scenarios'
        ],
        sqliteDisadvantages: [
          'Limited concurrent write performance',
          'No built-in user management',
          'File corruption risks',
          'Manual backup strategies required',
          'Limited scalability for multiple concurrent Discord servers'
        ]
      }
    };
  }

  async investigate(): Promise<AnalysisResult> {
    console.log('🔍 Starting SQLite Migration Investigation...\n');

    await this.analyzePrismaSchema();
    await this.auditSupabaseUsage();
    await this.analyzeCodebaseForQueries();
    await this.assessMigrationComplexity();
    
    return this.result;
  }

  private async analyzePrismaSchema(): Promise<void> {
    console.log('📊 Analyzing Prisma schema...');
    
    const schemaPath = join(this.rootDir, 'prisma', 'schema.prisma');
    if (!existsSync(schemaPath)) {
      throw new Error('Prisma schema not found');
    }

    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Extract database provider (not client provider)
    const providerMatch = schema.match(/datasource\s+db\s*{[^}]*provider\s*=\s*"([^"]+)"/s);
    this.result.currentDatabase.provider = providerMatch ? providerMatch[1] : 'unknown';

    // Count models
    const modelMatches = schema.match(/^model\s+\w+/gm);
    this.result.currentDatabase.models = modelMatches ? modelMatches.length : 0;

    // Count relationships
    const relationshipMatches = schema.match(/\s+@relation/g);
    this.result.currentDatabase.relationships = relationshipMatches ? relationshipMatches.length : 0;

    // Identify PostgreSQL-specific features
    this.analyzePostgreSQLFeatures(schema);

    console.log(`  ✅ Provider: ${this.result.currentDatabase.provider}`);
    console.log(`  ✅ Models: ${this.result.currentDatabase.models}`);
    console.log(`  ✅ Relationships: ${this.result.currentDatabase.relationships}`);
  }

  private analyzePostgreSQLFeatures(schema: string): void {
    // JSON fields
    const jsonMatches = schema.match(/^\s*\w+\s+Json/gm);
    if (jsonMatches) {
      this.result.postgresFeatures.jsonFields = jsonMatches.map(match => 
        match.trim().split(/\s+/)[0]
      );
    }

    // UUID usage
    this.result.postgresFeatures.uuids = schema.includes('@default(uuid())');

    // PostgreSQL array fields (not Prisma relationship arrays)
    // Look for actual PostgreSQL array syntax like: field String[]
    const actualArrayMatches = schema.match(/^\s*\w+\s+\w+\[\]/gm);
    if (actualArrayMatches) {
      this.result.postgresFeatures.arrays = actualArrayMatches.map(match => 
        match.trim().split(/\s+/)[0]
      );
    }

    // Indexes and constraints
    const indexMatches = schema.match(/@(?:index|unique)/g);
    if (indexMatches) {
      this.result.postgresFeatures.indexes = indexMatches;
    }
  }

  private async auditSupabaseUsage(): Promise<void> {
    console.log('🔍 Auditing Supabase usage...');

    try {
      // Find files importing/using Supabase
      const findCmd = `find src -name "*.ts" | xargs grep -l "supabase\\|@supabase" 2>/dev/null || true`;
      const supabaseFiles = execSync(findCmd, { encoding: 'utf-8' }).trim();
      
      if (supabaseFiles) {
        this.result.supabaseUsage.filesUsingSupabase = supabaseFiles.split('\n').filter(f => f);
      }

      // Check if Supabase client is actually used
      const usageCmd = `find src -name "*.ts" | xargs grep -l "supabase\\." 2>/dev/null || true`;
      const directUsage = execSync(usageCmd, { encoding: 'utf-8' }).trim();
      
      this.result.supabaseUsage.directUsage = !!directUsage;
      this.result.supabaseUsage.onlyPrismaUsage = !directUsage;

      console.log(`  ✅ Files mentioning Supabase: ${this.result.supabaseUsage.filesUsingSupabase.length}`);
      console.log(`  ✅ Direct Supabase usage: ${this.result.supabaseUsage.directUsage ? 'Yes' : 'No'}`);
      console.log(`  ✅ Prisma-only usage: ${this.result.supabaseUsage.onlyPrismaUsage ? 'Yes' : 'No'}`);
    } catch (error) {
      console.log('  ⚠️  Could not analyze Supabase usage completely');
    }
  }

  private async analyzeCodebaseForQueries(): Promise<void> {
    console.log('🔍 Analyzing database queries and operations...');

    try {
      // Find complex queries that might have compatibility issues
      const complexQueryPatterns = [
        'prisma.*\\.\\$transaction',
        'prisma.*\\.\\$queryRaw',
        'prisma.*\\.\\$executeRaw',
        '\\.aggregate\\(',
        '\\.groupBy\\(',
        'Json\\.',
        'JSONB',
        'CASCADE',
        'ON DELETE',
        'ON UPDATE'
      ];

      for (const pattern of complexQueryPatterns) {
        try {
          const cmd = `find src -name "*.ts" | xargs grep -l "${pattern}" 2>/dev/null || true`;
          const matches = execSync(cmd, { encoding: 'utf-8' }).trim();
          if (matches) {
            this.result.currentDatabase.features.push(`Complex pattern: ${pattern}`);
          }
        } catch (e) {
          // Ignore grep errors
        }
      }

      console.log(`  ✅ Complex query patterns found: ${this.result.currentDatabase.features.length}`);
    } catch (error) {
      console.log('  ⚠️  Could not analyze all query patterns');
    }
  }

  private assessMigrationComplexity(): void {
    console.log('⚖️  Assessing migration complexity...');

    // High-risk items
    if (this.result.supabaseUsage.directUsage) {
      this.result.migrationComplexity.highRisk.push('Direct Supabase client usage detected');
    }
    
    // Check for actual PostgreSQL array types (not Prisma relationships)
    const hasActualArrays = this.result.postgresFeatures.arrays.length > 0;
    if (hasActualArrays) {
      this.result.migrationComplexity.highRisk.push('PostgreSQL array fields not supported in SQLite');
    }

    if (this.result.currentDatabase.features.some(f => f.includes('$queryRaw') || f.includes('$executeRaw'))) {
      this.result.migrationComplexity.highRisk.push('Raw SQL queries may need rewriting');
    }

    // Medium-risk items
    if (this.result.postgresFeatures.jsonFields.length > 0) {
      this.result.migrationComplexity.mediumRisk.push(`JSON fields need testing: ${this.result.postgresFeatures.jsonFields.join(', ')}`);
    }

    if (this.result.currentDatabase.relationships > 10) {
      this.result.migrationComplexity.mediumRisk.push('Complex relationship graph may need careful migration');
    }

    if (this.result.currentDatabase.features.some(f => f.includes('transaction'))) {
      this.result.migrationComplexity.mediumRisk.push('Transactions need testing for SQLite compatibility');
    }

    // Low-risk items
    if (this.result.supabaseUsage.onlyPrismaUsage) {
      this.result.migrationComplexity.lowRisk.push('Prisma ORM provides good abstraction');
    }

    if (this.result.postgresFeatures.uuids) {
      this.result.migrationComplexity.lowRisk.push('UUID support available in SQLite with cuid() or uuid()');
    }

    this.result.migrationComplexity.lowRisk.push('Basic CRUD operations should work identically');
    this.result.migrationComplexity.lowRisk.push('Discord bot single-instance deployment suits SQLite well');

    console.log(`  ✅ High risk: ${this.result.migrationComplexity.highRisk.length} items`);
    console.log(`  ✅ Medium risk: ${this.result.migrationComplexity.mediumRisk.length} items`);
    console.log(`  ✅ Low risk: ${this.result.migrationComplexity.lowRisk.length} items`);
  }

  generateReport(): string {
    const report = `
# SQLite Migration Investigation Report

## Executive Summary

**Current Setup:** PostgreSQL via Supabase with Prisma ORM
**Recommendation:** ${this.getRecommendation()}

## Current Database Analysis

### Database Configuration
- **Provider:** ${this.result.currentDatabase.provider}
- **Models:** ${this.result.currentDatabase.models}
- **Relationships:** ${this.result.currentDatabase.relationships}
- **Complex Features:** ${this.result.currentDatabase.features.length}

### Supabase Usage Assessment
- **Direct Supabase Usage:** ${this.result.supabaseUsage.directUsage ? 'Yes ⚠️' : 'No ✅'}
- **Prisma-only Database Access:** ${this.result.supabaseUsage.onlyPrismaUsage ? 'Yes ✅' : 'No ⚠️'}
- **Files Referencing Supabase:** ${this.result.supabaseUsage.filesUsingSupabase.length}

## PostgreSQL Features Analysis

### JSON Fields (${this.result.postgresFeatures.jsonFields.length})
${this.result.postgresFeatures.jsonFields.map(field => `- ${field}`).join('\n') || 'None detected'}

### Arrays (${this.result.postgresFeatures.arrays.length})
${this.result.postgresFeatures.arrays.map(arr => `- ${arr}`).join('\n') || 'None detected'}

### UUIDs
${this.result.postgresFeatures.uuids ? '✅ Used (compatible with SQLite)' : '❌ Not used'}

## Migration Complexity Assessment

### 🔴 High Risk Items (${this.result.migrationComplexity.highRisk.length})
${this.result.migrationComplexity.highRisk.map(item => `- ${item}`).join('\n') || 'None identified'}

### 🟡 Medium Risk Items (${this.result.migrationComplexity.mediumRisk.length})
${this.result.migrationComplexity.mediumRisk.map(item => `- ${item}`).join('\n') || 'None identified'}

### 🟢 Low Risk Items (${this.result.migrationComplexity.lowRisk.length})
${this.result.migrationComplexity.lowRisk.map(item => `- ${item}`).join('\n') || 'None identified'}

## Performance Implications

### SQLite Advantages
${this.result.performanceImplications.sqliteAdvantages.map(adv => `- ${adv}`).join('\n')}

### SQLite Disadvantages
${this.result.performanceImplications.sqliteDisadvantages.map(dis => `- ${dis}`).join('\n')}

## Migration Effort Estimate

### Code Changes Required
- **Prisma Schema:** Update provider from "postgresql" to "sqlite"
- **Environment Variables:** Replace DATABASE_URL with local SQLite file path
- **JSON Field Testing:** Verify all JSON operations work correctly
- **Transaction Testing:** Ensure all Prisma transactions work with SQLite
- **Migration Scripts:** Create data migration scripts from PostgreSQL to SQLite

### Testing Required
- **Full Test Suite:** Run all existing tests against SQLite
- **Performance Testing:** Benchmark Discord bot response times
- **Concurrent Load Testing:** Test multiple simultaneous Discord interactions
- **Data Integrity Testing:** Verify complex relationships and constraints

### Deployment Changes
- **Backup Strategy:** Implement SQLite file backup procedures
- **Monitoring:** Add SQLite-specific health checks and monitoring
- **Recovery Procedures:** Document SQLite corruption recovery steps

## Recommendation: ${this.getRecommendation()}

${this.getRecommendationDetails()}

## Next Steps

${this.getNextSteps()}

---
*Report generated on ${new Date().toISOString()}*
`;

    return report;
  }

  public getRecommendation(): string {
    const highRiskCount = this.result.migrationComplexity.highRisk.length;
    const mediumRiskCount = this.result.migrationComplexity.mediumRisk.length;
    
    if (highRiskCount > 0) {
      return "❌ DO NOT MIGRATE - High Risk Issues Present";
    } else if (mediumRiskCount > 3) {
      return "⚠️  PROCEED WITH CAUTION - Significant Testing Required";
    } else if (this.result.supabaseUsage.onlyPrismaUsage) {
      return "✅ PROCEED - Low Risk Migration";
    } else {
      return "🤔 FURTHER INVESTIGATION NEEDED";
    }
  }

  private getRecommendationDetails(): string {
    const highRiskCount = this.result.migrationComplexity.highRisk.length;
    const recommendation = this.getRecommendation();

    if (recommendation.includes("DO NOT MIGRATE")) {
      return `
**Why not to migrate:**
The presence of ${highRiskCount} high-risk compatibility issues makes this migration too risky for the expected benefits. Focus on optimizing PostgreSQL performance instead.

**Alternative optimizations:**
- Implement connection pooling
- Add Redis caching for frequently accessed data
- Optimize slow queries identified in the codebase
- Consider read replicas for better performance
`;
    } else if (recommendation.includes("PROCEED WITH CAUTION")) {
      return `
**Why to proceed carefully:**
While migration is technically possible, the ${this.result.migrationComplexity.mediumRisk.length} medium-risk items require thorough testing. The effort may outweigh the performance benefits.

**Required before migration:**
- Comprehensive testing of all JSON field operations
- Transaction compatibility verification
- Performance benchmarking to quantify actual gains
- Backup and recovery procedure testing
`;
    } else if (recommendation.includes("PROCEED")) {
      return `
**Why to migrate:**
- Current usage is primarily through Prisma ORM, providing good abstraction
- No direct Supabase features detected that would complicate migration
- Discord bot single-instance deployment pattern suits SQLite well
- Potential for significant performance improvements for read-heavy operations

**Expected benefits:**
- Reduced latency from eliminating network calls
- Simplified deployment with single-file database
- Reduced operational complexity
- Lower hosting costs
`;
    }

    return "Further analysis needed to make a definitive recommendation.";
  }

  private getNextSteps(): string {
    const recommendation = this.getRecommendation();

    if (recommendation.includes("DO NOT MIGRATE")) {
      return `
1. **Focus on PostgreSQL optimization** instead of migration
2. **Implement caching strategies** for frequently accessed data
3. **Profile and optimize slow queries** in the current setup
4. **Consider connection pooling** to reduce connection overhead
`;
    } else if (recommendation.includes("PROCEED")) {
      return `
1. **Create test migration** with sample data
2. **Update Prisma schema** to use SQLite provider
3. **Implement comprehensive test suite** covering all database operations
4. **Benchmark performance** comparing PostgreSQL vs SQLite response times
5. **Create migration scripts** for data transfer
6. **Develop backup and recovery procedures**
7. **Plan rollback strategy** in case of issues
`;
    } else {
      return `
1. **Deeper code analysis** to identify specific compatibility issues
2. **Create proof-of-concept** SQLite implementation
3. **Performance testing** to quantify potential gains
4. **Risk assessment** for identified medium-risk items
5. **Cost-benefit analysis** comparing migration effort to expected performance gains
`;
    }
  }
}

async function main() {
  try {
    const investigator = new SQLiteMigrationInvestigator();
    const result = await investigator.investigate();
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 INVESTIGATION COMPLETE');
    console.log('='.repeat(80));
    
    const report = investigator.generateReport();
    
    // Write report to file
    const reportPath = join(process.cwd(), 'docs', 'development', 'sqlite-migration-investigation.md');
    writeFileSync(reportPath, report);
    
    console.log(`\n📄 Report saved to: ${reportPath}`);
    console.log('\n🎯 Key Findings:');
    console.log(`   • Database Models: ${result.currentDatabase.models}`);
    console.log(`   • Direct Supabase Usage: ${result.supabaseUsage.directUsage ? 'Yes' : 'No'}`);
    console.log(`   • High Risk Items: ${result.migrationComplexity.highRisk.length}`);
    console.log(`   • Medium Risk Items: ${result.migrationComplexity.mediumRisk.length}`);
    console.log(`   • Recommendation: ${investigator.getRecommendation()}`);
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SQLiteMigrationInvestigator };