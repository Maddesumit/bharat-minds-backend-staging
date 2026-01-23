# Scripts Documentation

This directory contains utility scripts for database setup, migration, and validation.

---

## Available Scripts

### 1. **Setup Normalized Schema** ✨
Creates all normalized collections for the scalable database architecture.

```bash
npm run setup:normalized
```

**What it does:**
- Creates 7 collections: `users`, `student_profiles_v2`, `student_preferences_v2`, `historical_cutoffs`, `seat_matrix`, `probability_cache`, `analytics_events`
- Sets up all attributes and indexes
- Idempotent (safe to run multiple times)

**Files:**
- `src/scripts/setup-normalized-schema-v2.ts` (main entry point)
- `src/scripts/schema-helpers.ts` (shared utilities)
- `src/scripts/schema-collections/*.ts` (individual collection setups)

---

### 2. **Validate Dual-Write** 🔍
Checks consistency between legacy JSON and normalized schemas.

```bash
# Validate all users (limit 100)
npm run validate:dual-write

# Validate all users with custom limit
npm run validate:dual-write -- --limit=50

# Validate specific user
npm run validate:user=<userId>
```

**Example output:**
```
📋 Checking legacy preferences for user: abc123
  ✅ Legacy: 5 colleges, 3 courses
📋 Checking normalized preferences for user: abc123
  ✅ Normalized: 16 preference documents
  ✅ Validation passed for user abc123

📊 VALIDATION SUMMARY
Total users:        42
Validated:          42
✅ Consistent:      40
❌ Inconsistent:    2
Success rate:       95.2%
```

**What it checks:**
- ✅ Legacy document exists
- ✅ Normalized documents exist
- ✅ Document counts are reasonable
- ✅ No duplicate preference ranks
- ✅ Data consistency

**Files:**
- `src/scripts/validate-dual-write.ts`

---

### 3. **Setup Legacy Database** 🗄️
Sets up the original database collections (colleges, courses, user_preferences).

```bash
npm run setup:db
```

**What it does:**
- Creates legacy collections
- Sets up initial indexes
- Required before using the app

**Files:**
- `src/scripts/setup-database.ts`

---

## Common Workflows

### **Initial Project Setup**
```bash
# 1. Install dependencies
npm install

# 2. Setup legacy database
npm run setup:db

# 3. Setup normalized schema (for dual-write)
npm run setup:normalized

# 4. Start dev server
npm run dev
```

---

### **Testing Dual-Write After User Submission**
```bash
# User submits preferences form in browser

# Validate the latest user
npm run validate:dual-write

# Or validate specific user
npm run validate:user=<userId>
```

---

### **Monitoring Migration Progress**
```bash
# Check all users
npm run validate:dual-write -- --limit=1000

# Check consistency rate
# Target: 99%+ success rate before switching to normalized reads
```

---

## File Structure

```
src/scripts/
├── setup-database.ts                 # Legacy DB setup
├── setup-normalized-schema.ts        # Original (monolithic)
├── setup-normalized-schema-v2.ts     # New modular version ⭐
├── validate-dual-write.ts            # Validation utility
├── schema-helpers.ts                 # Shared utilities
│
└── schema-collections/               # Modular collection setup
    ├── README.md                     # Collection docs
    ├── users.ts
    ├── student-profiles.ts
    ├── student-preferences.ts
    ├── historical-cutoffs.ts
    ├── seat-matrix.ts
    ├── probability-cache.ts
    └── analytics-events.ts
```

---

## Planned Scripts (TODO)

### **Backfill Historical Data**
```bash
npm run migrate:backfill
```
Convert all existing JSON preferences to normalized format.

### **Import Cutoff Data**
```bash
npm run import:cutoffs -- --file=cutoffs.csv
```
Import historical cutoff data for probability calculations.

### **Calculate Probabilities**
```bash
npm run calculate:probabilities
```
Generate probability scores for all active preferences.

### **Data Cleanup**
```bash
npm run cleanup:legacy
```
Archive and remove legacy schema after migration is complete.

---

## Environment Variables

All scripts require these variables in `.env`:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=your-database-id
```

---

## Troubleshooting

### **Script fails with "Collection already exists"**
✅ This is OK! Scripts are idempotent. Existing collections are skipped.

### **Script fails with "Attribute already exists"**
✅ This is OK! Existing attributes are skipped.

### **Validation shows inconsistencies**
⚠️ Check:
1. Is dual-write enabled in `preferences.routes.ts`?
2. Check backend logs for errors
3. Verify Appwrite permissions
4. Run validation again after new submission

### **"Cannot find module" error**
```bash
# Rebuild TypeScript
npm run build

# Or run with ts-node
npx ts-node src/scripts/<script-name>.ts
```

---

## Best Practices

1. **Always validate after making changes**
   ```bash
   npm run validate:dual-write
   ```

2. **Test on small dataset first**
   ```bash
   npm run validate:dual-write -- --limit=10
   ```

3. **Monitor logs during migration**
   ```bash
   npm run dev | grep NORMALIZED
   ```

4. **Keep both schemas in sync during migration**
   - Don't skip dual-write
   - Don't modify normalized data manually

---

## Support

**Questions?**
- Check `docs/DUAL_WRITE_MIGRATION.md` for migration strategy
- Check `src/scripts/schema-collections/README.md` for schema details

**Found a bug?**
- Create an issue with script output
- Include environment (Node version, OS)
- Include error logs

---

**Last Updated:** 2026-01-23  
**Maintained by:** Backend Team
