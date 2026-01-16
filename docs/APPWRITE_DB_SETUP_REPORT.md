# Appwrite Database Setup Report

**Project:** BHARAT MINDS Backend  
**Date:** January 16, 2026  
**Author:** Development Team  

---

## Executive Summary

This report documents the challenges encountered while setting up the Appwrite database for the BHARAT MINDS backend, along with the solutions implemented to resolve them. The primary issues involved missing automatic collection creation functionality, region endpoint misconfiguration, and Appwrite API constraints around boolean attributes with default values.

---

## Problem Statement

 we discovered that the database collections were not being created in Appwrite. The backend server would start, but no collections existed in the database, making the API non-functional.

---

## Issue 1: No Automatic Collection Creation

### Discovery

Upon investigating the codebase, we found that the project had well-defined schema files but **no mechanism to actually create collections** in Appwrite.

### What We Found

| File | Purpose | Creates Collections? |
|------|---------|---------------------|
| `src/config/appwrite.config.ts` | Initializes SDK client, exports collection IDs | ❌ No |
| `src/schemas/database.schema.ts` | TypeScript interfaces for type safety | ❌ No |
| `src/schemas/appwrite.schemas.ts` | Complete schema definitions with attributes & indexes | ❌ No (documentation only) |

The schema files were purely for documentation and type safety. Comments in `appwrite.schemas.ts` (lines 331-358) explicitly stated these were "setup instructions" for manual creation in the Appwrite Console.

### Solution

We created a new setup script that programmatically creates all collections, attributes, and indexes:

**File Created:** `src/scripts/setup-database.ts`

**Key Features:**
- Reads schema definitions from `appwrite.schemas.ts`
- Creates 6 collections with all attributes and indexes
- Handles rate limiting with delays between API calls
- Gracefully skips existing resources (idempotent)
- Provides clear progress logging

**NPM Script Added:**
```json
"setup:db": "ts-node src/scripts/setup-database.ts"
```

## Issue 2: Boolean Attributes with Default Values Failed

### Error Message
```
❌ Failed to create attribute hasKannada: Cannot set default value for required attribute
❌ Failed to create attribute hasRural: Cannot set default value for required attribute
❌ Failed to create attribute hasHK: Cannot set default value for required attribute
❌ Failed to create attribute profileCompleted: Cannot set default value for required attribute
❌ Failed to create attribute ranksEntered: Cannot set default value for required attribute
❌ Failed to create attribute preferencesEntered: Cannot set default value for required attribute
❌ Failed to create attribute totalOptions: Cannot set default value for required attribute
❌ Failed to create attribute isLocked: Cannot set default value for required attribute
```

### Cause

Appwrite has a constraint: **you cannot have both `required: true` AND a `default` value** for the same attribute. If an attribute has a default value, it logically cannot be required because the system will always provide a value.

### Original Schema (Problematic)
```typescript
{ key: 'hasKannada', type: 'boolean', required: true, default: false }
```

### Solution

Updated the schema to remove `required: true` from attributes that have default values:

**File Modified:** `src/schemas/appwrite.schemas.ts`

```typescript
// Before (incorrect)
{ key: 'hasKannada', type: 'boolean', required: true, default: false }

// After (correct)
{ key: 'hasKannada', type: 'boolean', required: false, default: false }
```

### Attributes Fixed

| Collection | Attributes Modified |
|------------|---------------------|
| `user_profiles` | `hasKannada`, `hasRural`, `hasHK`, `profileCompleted`, `ranksEntered`, `preferencesEntered` |
| `user_preferences` | `totalOptions`, `isLocked` |

After running the setup script a second time, all missing attributes were successfully created.

---

## Issue 3: IndexType Not Exported from node-appwrite v11

### Error Message (TypeScript)
```
Module '"node-appwrite"' has no exported member 'IndexType'.
```

### Cause

The `node-appwrite` SDK v11 does not export the `IndexType` type, but the setup script was trying to import it.

### Solution

Replaced the imported type with a custom type literal:

```typescript
// Before (incorrect)
import { Client, Databases, IndexType } from 'node-appwrite';

// After (correct)
import { Client, Databases } from 'node-appwrite';
type AppwriteIndexType = 'key' | 'unique' | 'fulltext';
```

---

## Final Results

After resolving all issues, the database setup completed successfully:

```
============================================================
SETUP COMPLETE
============================================================

✅ Successfully setup: 6 collections

Your Appwrite database is ready to use!
```

### Collections Created

| Collection | Attributes | Indexes | Status |
|------------|------------|---------|--------|
| `user_profiles` | 13 | 5 | ✅ Complete |
| `student_ranks` | 7 | 4 | ✅ Complete |
| `colleges` | 10 | 5 | ✅ Complete |
| `college_courses` | 10 | 5 | ✅ Complete |
| `user_preferences` | 6 | 4 | ✅ Complete |
| `cutoff_data` | 10 | 4 | ✅ Complete |

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `src/scripts/setup-database.ts` | Automated database setup script |
| `docs/APPWRITE_DB_SETUP_REPORT.md` | This report |

### Modified Files
| File | Changes |
|------|---------|
| `package.json` | Added `setup:db` npm script |
| `src/schemas/appwrite.schemas.ts` | Fixed `required` + `default` conflict for 8 boolean attributes |
| `.env` | Updated `APPWRITE_ENDPOINT` to correct region |

---

## Lessons Learned

1. **Appwrite Region Matters:** Always verify your project's region and use the correct endpoint.

2. **Required vs Default:** In Appwrite, these are mutually exclusive. Choose one or the other.

3. **Schema Files ≠ Auto-Creation:** Having schema definitions doesn't mean the database is auto-configured. Explicit setup scripts are needed.

4. **Idempotent Scripts:** The setup script gracefully handles existing resources, making it safe to run multiple times.

5. **Rate Limiting:** Appwrite processes attributes asynchronously and has rate limits. Adding delays between API calls prevents failures.

---

## How to Use the Setup Script

For future developers or fresh setups:

1. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Appwrite credentials
   ```

2. **Create Database in Appwrite Console:**
   - Go to Appwrite Console → Databases → Create Database
   - Copy the Database ID to `.env`

3. **Run Setup Script:**
   ```bash
   npm install
   npm run setup:db
   ```

4. **Verify in Appwrite Console:**
   - Check that all 6 collections exist
   - Verify attributes and indexes are present

---

## Conclusion

All database setup issues have been resolved. The BHARAT MINDS backend now has a fully automated database provisioning system that can recreate the entire Appwrite database structure with a single command. This significantly improves developer onboarding and ensures consistency across development environments.
