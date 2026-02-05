/**
 * Seat Matrix Collection
 * 
 * Current year seat availability and allocation tracking
 */

import { Databases, IndexType } from 'node-appwrite';
import { createCollectionSafe, createAttributeSafe, createIndexSafe, wait } from '../schema-helpers';

export async function setupSeatMatrix(databases: Databases, databaseId: string) {
    const collectionId = 'seat_matrix';

    await createCollectionSafe(databases, databaseId, collectionId, 'Seat Matrix');
    await wait(2000);

    // Identifiers
    await createAttributeSafe(databases, databaseId, collectionId, 'courseId', 'string', 36, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'academicYear', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'counsellingType', 'string', 20, true);

    // Seat Classification
    await createAttributeSafe(databases, databaseId, collectionId, 'seatType', 'string', 10, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'category', 'string', 20, true);

    // Seat Distribution Breakdown
    await createAttributeSafe(databases, databaseId, collectionId, 'hk', 'integer', undefined, false, 0); // Hyderabad-Karnataka
    await createAttributeSafe(databases, databaseId, collectionId, 'rk', 'integer', undefined, false, 0); // Rest of Karnataka
    await createAttributeSafe(databases, databaseId, collectionId, 'govt', 'integer', undefined, false, 0);
    await createAttributeSafe(databases, databaseId, collectionId, 'management', 'integer', undefined, false, 0);
    await createAttributeSafe(databases, databaseId, collectionId, 'nri', 'integer', undefined, false, 0);

    // Aggregates
    await createAttributeSafe(databases, databaseId, collectionId, 'totalSeats', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'reservedSeats', 'integer', undefined, false, 0);
    await createAttributeSafe(databases, databaseId, collectionId, 'availableSeats', 'integer', undefined, true);

    // Metadata
    await createAttributeSafe(databases, databaseId, collectionId, 'isActive', 'boolean', undefined, false, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'createdAt', 'string', 50, true); // Timestamp
    await createAttributeSafe(databases, databaseId, collectionId, 'updatedAt', 'string', 50, true); // Timestamp

    await wait(3000);

    // Indexes
    await createIndexSafe(databases, databaseId, collectionId, 'course_year', IndexType.Key, ['courseId', 'academicYear']);
    await createIndexSafe(databases, databaseId, collectionId, 'seat_category', IndexType.Key, ['seatType', 'category']);
    await createIndexSafe(databases, databaseId, collectionId, 'availability', IndexType.Key, ['availableSeats']);
}
