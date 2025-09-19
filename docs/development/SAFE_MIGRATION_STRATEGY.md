# Safe Migration Strategy: Supabase to SQLite

## 🛡️ Safety-First Approach

This document outlines our **SAFE MIGRATION STRATEGY** that prioritizes data protection and system reliability.

## 📋 Migration Phases

### Phase 1: Preparation & Setup ✅
- [x] SQLite database structure created
- [x] WriteQueueService implemented
- [x] Migration scripts developed
- [x] Environment variables configured

### Phase 2: Data Migration (Current Phase) 🔄
- [ ] **COPY** data from Supabase to SQLite (NO deletion)
- [ ] Validate data integrity
- [ ] Test application functionality with SQLite
- [ ] Performance testing

### Phase 3: Testing & Validation ⏳
- [ ] Full application testing with SQLite
- [ ] User acceptance testing
- [ ] Production-like load testing
- [ ] Backup strategy validation

### Phase 4: Gradual Transition ⏳
- [ ] Switch application to use SQLite in development
- [ ] Monitor for any issues or missing data
- [ ] Fix any problems while Supabase is still available
- [ ] Document any differences or issues

### Phase 5: Production Deployment ⏳
- [ ] Deploy to VPS with SQLite
- [ ] Monitor production for 1-2 weeks
- [ ] Keep Supabase connection available as emergency fallback
- [ ] Verify all features work correctly

### Phase 6: Cleanup (Future) ⏳
- [ ] **ONLY AFTER 100% CONFIDENCE** - remove Supabase dependencies
- [ ] Remove Supabase environment variables
- [ ] Decommission Supabase instance
- [ ] Archive final backup of Supabase data

## 🔧 Current Environment Setup

```bash
# Required for SQLite operation
DATABASE_URL="file:./data/dev.db"

# Keep these during migration period - DO NOT REMOVE YET!
SOURCE_DATABASE_URL="postgresql://..." # For data migration
SUPABASE_URL="https://..."             # Keep as fallback
SUPABASE_ANON_KEY="..."               # Keep as fallback
```

## 🛡️ Safety Measures

### Data Protection
- ✅ **Never delete Supabase data** until migration is 100% validated
- ✅ **Copy operations only** - no destructive actions
- ✅ **Keep all connection strings** for emergency fallback
- ✅ **Multiple backups** of critical data

### Rollback Strategy
1. **Immediate Rollback**: Switch `DATABASE_URL` back to Supabase
2. **Emergency Access**: Use `SOURCE_DATABASE_URL` for direct Supabase access
3. **Data Recovery**: Re-run migration scripts if SQLite corruption occurs

### Validation Checklist
- [ ] User count matches between databases
- [ ] Character data integrity verified
- [ ] Asset ownership preserved
- [ ] Transaction history complete
- [ ] All relationships maintained
- [ ] Performance acceptable

## 🚀 Migration Commands

```bash
# 1. Migrate data (safe copy operation)
yarn migrate-data

# 2. Validate data integrity
yarn test:sqlite-queue

# 3. Test application functionality
yarn dev

# 4. Check environment setup
yarn env:validate
```

## ⚠️ Do NOT Do Yet

- ❌ **Do NOT remove Supabase from package.json**
- ❌ **Do NOT delete Supabase environment variables**
- ❌ **Do NOT decommission Supabase instance**
- ❌ **Do NOT remove migration/fallback code**

## ✅ Safe to Do Now

- ✅ **Test SQLite database extensively**
- ✅ **Run migration scripts multiple times**
- ✅ **Switch DATABASE_URL to SQLite for testing**
- ✅ **Deploy SQLite version to VPS for testing**
- ✅ **Keep both systems available**

## 🎯 Success Criteria

Migration is considered successful ONLY when:

1. ✅ **Data Integrity**: 100% of data migrated correctly
2. ✅ **Functionality**: All features work with SQLite
3. ✅ **Performance**: Response times acceptable
4. ✅ **Reliability**: No crashes or data corruption
5. ✅ **User Experience**: No user-facing issues
6. ✅ **Deployment**: VPS deployment works smoothly

## 📞 Emergency Procedures

If SQLite fails or data is lost:

1. **Immediate**: Switch back to Supabase
   ```bash
   # Emergency rollback
   DATABASE_URL="postgresql://..." # Use SOURCE_DATABASE_URL value
   ```

2. **Recovery**: Re-run migration scripts
   ```bash
   yarn migrate-data
   ```

3. **Analysis**: Check logs and identify issues

4. **Fix**: Resolve problems before trying again

---

**Remember: Data safety is paramount. Take your time and test thoroughly!**