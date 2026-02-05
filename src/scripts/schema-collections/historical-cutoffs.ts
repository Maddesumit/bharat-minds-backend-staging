/**
 * Historical Cutoffs Collection
 * 
 * Previous year cutoff data for probability calculations and trend analysis
 */

import { Databases, IndexType } from 'node-appwrite';
import { createCollectionSafe, createAttributeSafe, createIndexSafe, wait } from '../schema-helpers';

export async function setupHistoricalCutoffs(databases: Databases, databaseId: string) {
    const collectionId = 'historical_cutoffs';

    await createCollectionSafe(databases, databaseId, collectionId, 'Historical Cutoffs');
    await wait(2000);

    // Identifiers
    await createAttributeSafe(databases, databaseId, collectionId, 'courseId', 'string', 36, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'academicYear', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'counsellingType', 'string', 20, true);

    // Seat Details
    await createAttributeSafe(databases, databaseId, collectionId, 'seatType', 'string', 20, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'category', 'string', 20, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'round', 'integer', undefined, true);

    // Data
    await createAttributeSafe(databases, databaseId, collectionId, 'cutoffRank', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'verified', 'boolean', undefined, false, false);

    // Metadata
    await createAttributeSafe(databases, databaseId, collectionId, 'createdAt', 'string', 50, true); // Timestamp
    await createAttributeSafe(databases, databaseId, collectionId, 'updatedAt', 'string', 50, true); // Timestamp

    await wait(3000);

    // Indexes
    await createIndexSafe(databases, databaseId, collectionId, 'course_year_round', IndexType.Key, ['courseId', 'academicYear', 'round']);
    await createIndexSafe(databases, databaseId, collectionId, 'counselling_cat', IndexType.Key, ['counsellingType', 'category']);
    await createIndexSafe(databases, databaseId, collectionId, 'cutoff_idx', IndexType.Key, ['cutoffRank']);
}
