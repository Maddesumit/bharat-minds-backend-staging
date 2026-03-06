/**
 * Students Collection
 *
 * Stores registered student profiles used by the Next.js frontend.
 * Mirrors the Student type defined in the web app (ai-counsellor-web).
 */

import { Databases, IndexType } from 'node-appwrite';
import { createCollectionSafe, createAttributeSafe, createIndexSafe, wait } from '../schema-helpers';

export async function setupStudents(databases: Databases, databaseId: string) {
    const collectionId = 'students';

    await createCollectionSafe(databases, databaseId, collectionId, 'Students');
    await wait(2000);

    // Identity (document ID is the userId from Auth, but we also store it explicitly)
    await createAttributeSafe(databases, databaseId, collectionId, 'userId', 'string', 50, true);

    // Basic info
    await createAttributeSafe(databases, databaseId, collectionId, 'name', 'string', 255, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'mobile', 'string', 20, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'email', 'string', 320, true);

    // Counselling & courses (stored as JSON strings)
    await createAttributeSafe(databases, databaseId, collectionId, 'counsellingTypes', 'string', 255, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'ugcetCourses', 'string', 1024, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'farmScienceCourses', 'string', 1024, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'ugneetCourses', 'string', 1024, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'ugneetSpecialCategories', 'string', 1024, false);

    // Ranks
    await createAttributeSafe(databases, databaseId, collectionId, 'neetAIR', 'integer', undefined, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'courseRanks', 'string', 4096, false);

    // Category information
    await createAttributeSafe(databases, databaseId, collectionId, 'baseCategory', 'string', 10, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'hasKannada', 'boolean', undefined, false, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'hasRural', 'boolean', undefined, false, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'hasHK', 'boolean', undefined, false, false);

    // SNQ
    await createAttributeSafe(databases, databaseId, collectionId, 'snqApplied', 'boolean', undefined, false, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'incomeSlab', 'string', 100, false);

    // Categories & preferences (JSON strings)
    await createAttributeSafe(databases, databaseId, collectionId, 'eligibleCategories', 'string', 1024, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'specialCategories', 'string', 1024, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'preferredLocations', 'string', 1024, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'preferredCollegeTypes', 'string', 1024, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'preferredColleges', 'string', 1024, false);

    // Metadata
    await createAttributeSafe(databases, databaseId, collectionId, 'createdAt', 'string', 50, true);

    await wait(3000);

    // Indexes
    await createIndexSafe(databases, databaseId, collectionId, 'userId_unique', IndexType.Unique, ['userId']);
    await createIndexSafe(databases, databaseId, collectionId, 'email_idx', IndexType.Key, ['email']);
}

