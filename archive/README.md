# Archive

This folder contains deprecated or legacy files that are no longer actively used but kept for reference.

## Deployment Scripts (Deprecated)

- `deploy.sh` - Original deployment script (replaced by `deploy_sqlite.sh`)
- `deploy_with_migration.sh` - Migration deployment script (replaced by `deploy_sqlite.sh`)

**Current deployment method:** Use `deploy_sqlite.sh` in the root directory.

## Migration Scripts (Archived)

- `migrateSupabaseToSQLite.ts` - Supabase to SQLite data migration script
- `forceMigrateMyCharacter.ts` - Force migration for individual character data  
- `completeForceSupabaseMigration.ts` - Complete database migration script
- `migrateMoney.ts` - Legacy money system to multi-layered money migration
- `migrateJailToTable.ts` - Character jail data to separate Jail table migration

**Migration Status:** The repository has successfully migrated to SQLite and updated data structures. These scripts are archived for reference only.

## Why These Were Moved

These scripts were part of the migration from Supabase to SQLite. Now that the migration is complete and the SQLite deployment is stable, these older scripts are no longer needed for regular operations but are preserved for reference or emergency use.
