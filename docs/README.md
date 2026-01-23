# Documentation Index

Welcome to the BharatMinds AI Backend documentation! This folder contains comprehensive guides for the normalized database schema and migration strategy.

---

## 📚 Quick Start

**New to this project?** Start here:

1. 📖 **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Overview of what we've built
2. 🎨 **[SCHEMA_VISUALIZATION.md](./SCHEMA_VISUALIZATION.md)** - Visual schema diagrams
3. 📋 **[SCHEMA_QUICK_REFERENCE.md](./SCHEMA_QUICK_REFERENCE.md)** - Quick reference guide

---

## 📑 Documentation Files

### Main Guides

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** | Complete implementation overview | First time, project review |
| **[SCHEMA_VISUALIZATION.md](./SCHEMA_VISUALIZATION.md)** | Visual schema with ASCII diagrams | Understanding database structure |
| **[DUAL_WRITE_MIGRATION.md](./DUAL_WRITE_MIGRATION.md)** | Migration strategy & phases | Planning, deployment |
| **[SCHEMA_QUICK_REFERENCE.md](./SCHEMA_QUICK_REFERENCE.md)** | Quick reference & commands | Daily development |

---

## 🎯 Reading Guide by Role

### **Backend Developer**
1. Start: `IMPLEMENTATION_SUMMARY.md` (Overview)
2. Deep dive: `SCHEMA_VISUALIZATION.md` (Architecture)
3. Implementation: `../src/scripts/README.md` (Scripts)
4. Daily use: `SCHEMA_QUICK_REFERENCE.md`

### **Database Administrator**
1. Start: `SCHEMA_VISUALIZATION.md` (Schema structure)
2. Setup: `../src/scripts/schema-collections/README.md` (Collections)
3. Migration: `DUAL_WRITE_MIGRATION.md` (Strategy)
4. Monitoring: `SCHEMA_QUICK_REFERENCE.md` (Commands)

### **Project Manager**
1. Overview: `IMPLEMENTATION_SUMMARY.md` (What's built)
2. Timeline: `DUAL_WRITE_MIGRATION.md` (Phases)
3. Metrics: `SCHEMA_VISUALIZATION.md` (Performance section)

### **Frontend Developer**
1. API changes: `SCHEMA_QUICK_REFERENCE.md` (Quick reference)
2. Response format: `DUAL_WRITE_MIGRATION.md` (Dual-write section)
3. Integration: `IMPLEMENTATION_SUMMARY.md` (Next steps)

---

## 🔑 Key Concepts

### Normalized Schema
A database design where each piece of information is stored once, with relationships between tables. Enables fast queries and complex analytics.

**Before:** 1 document with JSON → **After:** 10-50 indexed documents

### Dual-Write
A migration strategy where new data is written to both old and new schemas simultaneously, ensuring zero downtime and easy rollback.

**Phase 1:** Write to both → **Phase 2:** Read from both → **Phase 3:** Switch → **Phase 4:** Cleanup

### Student Preferences v2
The core normalized collection that stores each student's college/course preference as an individual document, enabling:
- Fast competition analysis
- Probability calculations
- Advanced recommendations
- ML/AI features

---

## 📊 Schema Overview

```
7 Collections:
├── users                    (Authentication)
├── student_profiles_v2      (Ranks, categories)
├── student_preferences_v2   (⭐ MAIN - Normalized preferences)
├── historical_cutoffs       (Past year data)
├── seat_matrix             (Current year seats)
├── probability_cache       (Pre-calculated probabilities)
└── analytics_events        (User behavior tracking)
```

**Performance:** 10-100x faster queries  
**Storage:** 2.6x more (acceptable trade-off)

---

## 🚀 Quick Commands

```bash
# Setup normalized schema (first time)
npm run setup:normalized

# Start dev server
npm run dev

# Validate dual-write consistency
npm run validate:dual-write

# Validate specific user
npm run validate:user=<userId>
```

---

## 📈 Current Status

**Phase:** 1 of 4 (Dual-Write)  
**Status:** ✅ Complete - Ready for Testing  
**Commit:** `643f665`

**Next Steps:**
1. Test with real user submissions
2. Monitor dual-write success rate
3. Achieve 99%+ consistency
4. Move to Phase 2 (Dual-Read)

---

## 🗂️ Related Documentation

### In `../src/scripts/`
- **[README.md](../src/scripts/README.md)** - Scripts usage guide
- **[schema-collections/README.md](../src/scripts/schema-collections/README.md)** - Collection details

### In Root
- **[README.md](../README.md)** - Project README
- **[.env.example](../.env.example)** - Environment setup

---

## 🆘 Troubleshooting

### Common Issues

**"Collection already exists" error**
→ ✅ This is OK! Scripts are idempotent.

**Validation shows inconsistencies**
→ Check `DUAL_WRITE_MIGRATION.md` → Troubleshooting section

**Slow queries**
→ Check `SCHEMA_VISUALIZATION.md` → Indexes section

**Need help?**
→ Start with `IMPLEMENTATION_SUMMARY.md` → Support section

---

## 📞 Support

**Questions about:**
- Architecture → `SCHEMA_VISUALIZATION.md`
- Migration → `DUAL_WRITE_MIGRATION.md`
- Commands → `SCHEMA_QUICK_REFERENCE.md`
- Implementation → `IMPLEMENTATION_SUMMARY.md`

**Can't find what you need?**
→ Check the scripts README: `../src/scripts/README.md`

---

## 🔄 Document Updates

| Date | Document | Changes |
|------|----------|---------|
| 2026-01-23 | ALL | Initial creation |

---

**Last Updated:** 2026-01-23  
**Maintainer:** Backend Team  
**Version:** 1.0
