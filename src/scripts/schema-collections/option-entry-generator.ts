/**
 * Option Entry Generator Collection
 *
 */

import { Databases, IndexType } from 'node-appwrite';
import { createCollectionSafe, createAttributeSafe, createIndexSafe, wait } from '../schema-helpers';

export async function setupOptionEntryGenerator(databases: Databases, databaseId: string) {
    const collectionId = 'option_entry_generator';
    const collectionName = 'option-entry generator';

    await createCollectionSafe(databases, databaseId, collectionId, collectionName);
    await wait(2000);

    await createAttributeSafe(databases, databaseId, collectionId, 'userId', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'courseType', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'options', 'string', 100000, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'count', 'integer', undefined, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'createdAt', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'updatedAt', 'string', 50, true);

    await wait(3000);

    await createIndexSafe(databases, databaseId, collectionId, 'userId_unique', IndexType.Unique, ['userId']);
}

