/**
 * Seat Matrix Collection
 * 
 * Current year seat availability and allocation tracking
 */

import { Databases, IndexType } from 'node-appwrite';
import { createCollectionSafe, createAttributeSafe, createIndexSafe, wait } from '../schema-helpers';

export async function setupSeatMatrix(databases: Databases, databaseId: string) {
    const collectionId = 'seat_matrix';

    await createCollectionSafe(databases, databaseId, collectionId, 'Seat Matrix (Current Year)');
    await wait(2000);

    // Academic Context
    await createAttributeSafe(databases, databaseId, collectionId, 'academicYear', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'counsellingType', 'string', 20, true);

    // College & Branch
    await createAttributeSafe(databases, databaseId, collectionId, 'collegeId', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'collegeCode', 'string', 20, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'branchId', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'branchCode', 'string', 20, true);

    // Seat Category
    await createAttributeSafe(databases, databaseId, collectionId, 'seatType', 'string', 5, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'category', 'string', 20, true);

    // Seat Counts
    await createAttributeSafe(databases, databaseId, collectionId, 'totalSeats', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'reservedSeats', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'availableSeats', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'allocatedSeats', 'integer', undefined, false, 0);

    // Special Quotas
    await createAttributeSafe(databases, databaseId, collectionId, 'snqSeats', 'integer', undefined, false, 0);
    await createAttributeSafe(databases, databaseId, collectionId, 'nccSeats', 'integer', undefined, false, 0);
    await createAttributeSafe(databases, databaseId, collectionId, 'spoSeats', 'integer', undefined, false, 0);

    // Status
    await createAttributeSafe(databases, databaseId, collectionId, 'isActive', 'boolean', undefined, false, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'lastUpdated', 'string', 50, true);

    await createAttributeSafe(databases, databaseId, collectionId, 'createdAt', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'updatedAt', 'string', 50, true);

    await wait(3000);

    // Indexes
    await createIndexSafe(databases, databaseId, collectionId, 'year_college_branch', IndexType.Key, ['academicYear', 'collegeCode', 'branchCode']);
    await createIndexSafe(databases, databaseId, collectionId, 'seat_category', IndexType.Key, ['seatType', 'category']);
    await createIndexSafe(databases, databaseId, collectionId, 'available_idx', IndexType.Key, ['availableSeats']);
}
