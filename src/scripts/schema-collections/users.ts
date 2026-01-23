/**
 * Users Collection
 * 
 * Student authentication and basic profile information
 */

import { Databases, IndexType } from 'node-appwrite';
import { createCollectionSafe, createAttributeSafe, createIndexSafe, wait } from '../schema-helpers';

export async function setupUsers(databases: Databases, databaseId: string) {
    const collectionId = 'users';

    await createCollectionSafe(databases, databaseId, collectionId, 'Users');
    await wait(2000);

    // Core Identity
    await createAttributeSafe(databases, databaseId, collectionId, 'userId', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'email', 'email', 255, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'phone', 'string', 15, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'name', 'string', 255, true);

    // Academic Context
    await createAttributeSafe(databases, databaseId, collectionId, 'counsellingType', 'string', 20, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'academicYear', 'integer', undefined, true);

    // Status Flags
    await createAttributeSafe(databases, databaseId, collectionId, 'isActive', 'boolean', undefined, false, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'isVerified', 'boolean', undefined, false, false);

    // Timestamps
    await createAttributeSafe(databases, databaseId, collectionId, 'createdAt', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'updatedAt', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'lastLoginAt', 'string', 50, false);

    await wait(3000);

    // Indexes
    await createIndexSafe(databases, databaseId, collectionId, 'userId_unique', IndexType.Unique, ['userId']);
    await createIndexSafe(databases, databaseId, collectionId, 'email_unique', IndexType.Unique, ['email']);
    await createIndexSafe(databases, databaseId, collectionId, 'counsellingType_idx', IndexType.Key, ['counsellingType']);
    await createIndexSafe(databases, databaseId, collectionId, 'academicYear_idx', IndexType.Key, ['academicYear']);
}
