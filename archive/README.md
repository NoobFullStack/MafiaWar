# Archive

This folder contains deprecated or legacy files that are no longer actively used but kept for reference.

## Deployment Scripts (Deprecated)

- `deploy.sh` - Original deployment script (replaced by `deploy_sqlite.sh`)
- `deploy_with_migration.sh` - Migration deployment script (replaced by `deploy_sqlite.sh`)

**Current deployment method:** Use `deploy_sqlite.sh` in the root directory.

## Why These Were Moved

These scripts were part of the migration from Supabase to SQLite. Now that the migration is complete and the SQLite deployment is stable, these older scripts are no longer needed for regular deployments but are preserved for reference.
