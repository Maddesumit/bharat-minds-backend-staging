/**
 * Student Profiles Collection
 * 
 * Extended student information including ranks, categories, and eligibility
 */

import { Databases, IndexType } from 'node-appwrite';
import { createCollectionSafe, createAttributeSafe, createIndexSafe, wait } from '../schema-helpers';

export async function setupStudentProfiles(databases: Databases, databaseId: string) {
    const collectionId = 'student_profiles_v2';

    await createCollectionSafe(databases, databaseId, collectionId, 'Student Profiles V2');
    await wait(2000);

    // Identity
    await createAttributeSafe(databases, databaseId, collectionId, 'userId', 'string', 50, true);

    // Rank Information
    await createAttributeSafe(databases, databaseId, collectionId, 'generalMeritRank', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'theoryRank', 'integer', undefined, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'practicalRank', 'integer', undefined, false);

    // Category & Reservations
    await createAttributeSafe(databases, databaseId, collectionId, 'baseCategory', 'string', 10, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'reservationKannada', 'boolean', undefined, false, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'reservationRural', 'boolean', undefined, false, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'reservationHK', 'boolean', undefined, false, false);

    // Special Categories
    await createAttributeSafe(databases, databaseId, collectionId, 'ncc', 'boolean', undefined, false, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'spo', 'boolean', undefined, false, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'def', 'boolean', undefined, false, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'ph', 'boolean', undefined, false, false);

    // SNQ
    await createAttributeSafe(databases, databaseId, collectionId, 'snqEligible', 'boolean', undefined, false, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'snqSlab', 'string', 10, false);

    // Computed Fields (for fast matching)
    await createAttributeSafe(databases, databaseId, collectionId, 'eligibleCategories', 'string', 50, false, undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'rankRange', 'string', 20, true);

    // Timestamps
    await createAttributeSafe(databases, databaseId, collectionId, 'createdAt', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'updatedAt', 'string', 50, true);

    await wait(3000);

    // Indexes
    await createIndexSafe(databases, databaseId, collectionId, 'userId_unique', IndexType.Unique, ['userId']);
    await createIndexSafe(databases, databaseId, collectionId, 'rank_idx', IndexType.Key, ['generalMeritRank']);
    await createIndexSafe(databases, databaseId, collectionId, 'category_idx', IndexType.Key, ['baseCategory']);
    await createIndexSafe(databases, databaseId, collectionId, 'rankRange_idx', IndexType.Key, ['rankRange']);
}
