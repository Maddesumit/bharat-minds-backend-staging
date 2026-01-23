import { databases } from '../config/appwrite.config';
import { Query } from 'node-appwrite';

/**
 * Validation utility to check dual-write consistency
 * Compares data between user_preferences (legacy JSON) and student_preferences_v2 (normalized)
 */

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;

interface ValidationResult {
    userId: string;
    legacy: {
        exists: boolean;
        documentId?: string;
        preferencesCount?: number;
        data?: any;
    };
    normalized: {
        exists: boolean;
        documentsCount?: number;
        documents?: any[];
    };
    consistent: boolean;
    issues: string[];
}

/**
 * Validate preferences for a specific user
 */
export async function validateUserPreferences(userId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
        userId,
        legacy: { exists: false },
        normalized: { exists: false },
        consistent: true,
        issues: []
    };

    try {
        // 1. Fetch from legacy schema (user_preferences)
        console.log(`📋 Checking legacy preferences for user: ${userId}`);

        const legacyDocs = await databases.listDocuments(
            DATABASE_ID,
            'user_preferences',
            [
                Query.equal('userId', userId),
                Query.limit(1),
                Query.orderDesc('$createdAt')
            ]
        );

        if (legacyDocs.total > 0) {
            const legacyDoc = legacyDocs.documents[0];
            result.legacy.exists = true;
            result.legacy.documentId = legacyDoc.$id;

            try {
                const parsedPreferences = JSON.parse(legacyDoc.preferences as string);
                result.legacy.data = parsedPreferences;

                // Count total preferences
                const collegesCount = parsedPreferences.colleges?.length || 0;
                const coursesCount = parsedPreferences.courses?.length || 0;
                result.legacy.preferencesCount = collegesCount + coursesCount;

                console.log(`  ✅ Legacy: ${collegesCount} colleges, ${coursesCount} courses`);
            } catch (error) {
                result.issues.push('Failed to parse legacy preferences JSON');
                result.consistent = false;
            }
        } else {
            console.log(`  ℹ️  No legacy preferences found`);
            result.issues.push('No legacy preferences found');
        }

        // 2. Fetch from normalized schema (student_preferences_v2)
        console.log(`📋 Checking normalized preferences for user: ${userId}`);

        const normalizedDocs = await databases.listDocuments(
            DATABASE_ID,
            'student_preferences_v2',
            [
                Query.equal('userId', userId),
                Query.equal('isActive', true),
                Query.orderAsc('preferenceRank'),
                Query.limit(5000)
            ]
        );

        if (normalizedDocs.total > 0) {
            result.normalized.exists = true;
            result.normalized.documentsCount = normalizedDocs.total;
            result.normalized.documents = normalizedDocs.documents;

            console.log(`  ✅ Normalized: ${normalizedDocs.total} preference documents`);
        } else {
            console.log(`  ℹ️  No normalized preferences found`);

            if (result.legacy.exists) {
                result.issues.push('Legacy exists but normalized is missing (dual-write not working)');
                result.consistent = false;
            }
        }

        // 3. Consistency checks
        if (result.legacy.exists && result.normalized.exists) {
            // Basic count validation (normalized should have more docs due to seat type combinations)
            const legacyCount = result.legacy.preferencesCount || 0;
            const normalizedCount = result.normalized.documentsCount || 0;

            // Normalized should have at least as many as legacy (due to seat type expansion)
            if (normalizedCount < legacyCount) {
                result.issues.push(
                    `Document count mismatch: Legacy has ${legacyCount} prefs, ` +
                    `normalized has only ${normalizedCount} (expected >= ${legacyCount})`
                );
                result.consistent = false;
            }

            // Check for duplicate ranks
            const ranks = result.normalized.documents?.map(d => d.preferenceRank) || [];
            const uniqueRanks = new Set(ranks);
            if (ranks.length !== uniqueRanks.size) {
                result.issues.push('Duplicate preferenceRank values found in normalized data');
                result.consistent = false;
            }
        }

        // 4. Overall status
        if (result.issues.length === 0) {
            console.log(`  ✅ Validation passed for user ${userId}`);
        } else {
            console.log(`  ⚠️  Issues found: ${result.issues.length}`);
            result.issues.forEach(issue => console.log(`     - ${issue}`));
        }

    } catch (error: any) {
        console.error(`❌ Validation error for user ${userId}:`, error.message);
        result.issues.push(`Validation error: ${error.message}`);
        result.consistent = false;
    }

    return result;
}

/**
 * Validate all users' preferences
 */
export async function validateAllPreferences(limit: number = 100): Promise<{
    total: number;
    validated: number;
    consistent: number;
    inconsistent: number;
    results: ValidationResult[];
}> {
    console.log('🔍 Starting bulk validation...\n');

    const summary = {
        total: 0,
        validated: 0,
        consistent: 0,
        inconsistent: 0,
        results: [] as ValidationResult[]
    };

    try {
        // Get all unique user IDs from legacy schema
        const legacyDocs = await databases.listDocuments(
            DATABASE_ID,
            'user_preferences',
            [Query.limit(limit)]
        );

        summary.total = legacyDocs.total;
        console.log(`Found ${summary.total} users to validate\n`);

        for (const doc of legacyDocs.documents) {
            const result = await validateUserPreferences(doc.userId as string);
            summary.results.push(result);
            summary.validated++;

            if (result.consistent) {
                summary.consistent++;
            } else {
                summary.inconsistent++;
            }

            console.log(''); // Empty line between users
        }

        // Print summary
        console.log('='.repeat(60));
        console.log('📊 VALIDATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total users:        ${summary.total}`);
        console.log(`Validated:          ${summary.validated}`);
        console.log(`✅ Consistent:      ${summary.consistent}`);
        console.log(`❌ Inconsistent:    ${summary.inconsistent}`);
        console.log(`Success rate:       ${((summary.consistent / summary.validated) * 100).toFixed(1)}%`);
        console.log('='.repeat(60));

        if (summary.inconsistent > 0) {
            console.log('\n⚠️  Issues found in:');
            summary.results.forEach(r => {
                if (!r.consistent) {
                    console.log(`  - User ${r.userId}:`);
                    r.issues.forEach(issue => console.log(`    • ${issue}`));
                }
            });
        }

    } catch (error: any) {
        console.error('❌ Bulk validation error:', error.message);
    }

    return summary;
}

/**
 * CLI entry point
 */
async function main() {
    const args = process.argv.slice(2);
    const userIdFlag = args.find(arg => arg.startsWith('--userId='));
    const limitFlag = args.find(arg => arg.startsWith('--limit='));

    if (userIdFlag) {
        // Validate specific user
        const userId = userIdFlag.split('=')[1];
        await validateUserPreferences(userId);
    } else {
        // Validate all users
        const limit = limitFlag ? parseInt(limitFlag.split('=')[1]) : 100;
        await validateAllPreferences(limit);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}
