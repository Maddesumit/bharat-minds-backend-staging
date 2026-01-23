/**
 * Student Preferences Collection (Normalized)
 * 
 * Each preference is a separate document for queryability and scale
 */

import { Databases, IndexType } from 'node-appwrite';
import { createCollectionSafe, createAttributeSafe, createIndexSafe, wait } from '../schema-helpers';

export async function setupStudentPreferences(databases: Databases, databaseId: string) {
    const collectionId = 'student_preferences_v2';

    await createCollectionSafe(databases, databaseId, collectionId, 'Student Preferences V2 (Normalized)');
    await wait(2000);

    // Identity
    await createAttributeSafe(databases, databaseId, collectionId, 'userId', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'preferenceRank', 'integer', undefined, true);

    // College & Course
    await createAttributeSafe(databases, databaseId, collectionId, 'collegeId', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'collegeCode', 'string', 20, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'collegeName', 'string', 255, true);

    await createAttributeSafe(databases, databaseId, collectionId, 'branchId', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'branchCode', 'string', 20, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'branchName', 'string', 255, true);

    // Filters
    await createAttributeSafe(databases, databaseId, collectionId, 'seatType', 'string', 5, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'category', 'string', 20, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'location', 'string', 100, true);

    // Eligibility & Probability
    await createAttributeSafe(databases, databaseId, collectionId, 'isEligible', 'boolean', undefined, false, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'eligibilityScore', 'integer', undefined, false, 0);
    await createAttributeSafe(databases, databaseId, collectionId, 'probabilityScore', 'integer', undefined, false, 0);
    await createAttributeSafe(databases, databaseId, collectionId, 'probabilityCategory', 'string', 20, false);

    // Metadata
    await createAttributeSafe(databases, databaseId, collectionId, 'counsellingType', 'string', 20, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'academicYear', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'isLocked', 'boolean', undefined, false, false);

    await createAttributeSafe(databases, databaseId, collectionId, 'createdAt', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'updatedAt', 'string', 50, true);

    await wait(3000);

    // Performance Indexes
    await createIndexSafe(databases, databaseId, collectionId, 'userId_rank', IndexType.Key, ['userId', 'preferenceRank']);
    await createIndexSafe(databases, databaseId, collectionId, 'userId_counselling', IndexType.Key, ['userId', 'counsellingType']);
    await createIndexSafe(databases, databaseId, collectionId, 'college_branch_seat', IndexType.Key, ['collegeCode', 'branchCode', 'seatType']);
    await createIndexSafe(databases, databaseId, collectionId, 'category_idx', IndexType.Key, ['category']);
    await createIndexSafe(databases, databaseId, collectionId, 'location_idx', IndexType.Key, ['location']);
    await createIndexSafe(databases, databaseId, collectionId, 'probability_idx', IndexType.Key, ['probabilityScore']);
    await createIndexSafe(databases, databaseId, collectionId, 'eligible_idx', IndexType.Key, ['isEligible']);
    await createIndexSafe(databases, databaseId, collectionId, 'year_idx', IndexType.Key, ['academicYear']);
}
