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

    // Academic Context
    await createAttributeSafe(databases, databaseId, collectionId, 'academicYear', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'round', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'counsellingType', 'string', 20, true);

    // College Information
    await createAttributeSafe(databases, databaseId, collectionId, 'collegeId', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'collegeCode', 'string', 20, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'collegeName', 'string', 255, true);

    // Branch Information
    await createAttributeSafe(databases, databaseId, collectionId, 'branchId', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'branchCode', 'string', 20, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'branchName', 'string', 255, true);

    // Seat Details
    await createAttributeSafe(databases, databaseId, collectionId, 'seatType', 'string', 20, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'category', 'string', 20, true);

    // Cutoff Data
    await createAttributeSafe(databases, databaseId, collectionId, 'cutoffRank', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'totalSeats', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'seatsAllocated', 'integer', undefined, true);

    // Additional Statistics
    await createAttributeSafe(databases, databaseId, collectionId, 'openingRank', 'integer', undefined, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'closingRank', 'integer', undefined, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'avgRank', 'integer', undefined, false);

    // Metadata
    await createAttributeSafe(databases, databaseId, collectionId, 'source', 'string', 100, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'verified', 'boolean', undefined, false, false);

    await createAttributeSafe(databases, databaseId, collectionId, 'createdAt', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'updatedAt', 'string', 50, true);

    await wait(3000);

    // Critical Indexes for Matching
    await createIndexSafe(databases, databaseId, collectionId, 'year_college_branch', IndexType.Key, ['academicYear', 'collegeCode', 'branchCode']);
    await createIndexSafe(databases, databaseId, collectionId, 'counselling_year', IndexType.Key, ['counsellingType', 'academicYear']);
    await createIndexSafe(databases, databaseId, collectionId, 'college_seat_cat', IndexType.Key, ['collegeCode', 'seatType', 'category']);
    await createIndexSafe(databases, databaseId, collectionId, 'cutoff_idx', IndexType.Key, ['cutoffRank']);
}
