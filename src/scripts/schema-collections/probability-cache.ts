/**
 * Probability Cache Collection
 * 
 * Pre-calculated probability scores for fast retrieval
 */

import { Databases, IndexType } from 'node-appwrite';
import { createCollectionSafe, createAttributeSafe, createIndexSafe, wait } from '../schema-helpers';

export async function setupProbabilityCache(databases: Databases, databaseId: string) {
    const collectionId = 'probability_cache';

    await createCollectionSafe(databases, databaseId, collectionId, 'Probability Cache');
    await wait(2000);

    // Cache Key
    await createAttributeSafe(databases, databaseId, collectionId, 'userId', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'preferenceId', 'string', 50, true);

    // Probability Results
    await createAttributeSafe(databases, databaseId, collectionId, 'probabilityScore', 'integer', undefined, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'probabilityCategory', 'string', 20, true);

    // Calculation Factors
    await createAttributeSafe(databases, databaseId, collectionId, 'rankDifference', 'integer', undefined, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'competitionIndex', 'integer', undefined, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'categoryAdvantage', 'integer', undefined, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'trendFactor', 'integer', undefined, false);

    // Explanation for UI
    await createAttributeSafe(databases, databaseId, collectionId, 'reason', 'string', 500, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'recommendations', 'string', 1000, false);

    // Cache Management
    await createAttributeSafe(databases, databaseId, collectionId, 'calculatedAt', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'expiresAt', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'version', 'integer', undefined, false, 1);

    await wait(3000);

    // Indexes
    await createIndexSafe(databases, databaseId, collectionId, 'user_pref', IndexType.Unique, ['userId', 'preferenceId']);
    await createIndexSafe(databases, databaseId, collectionId, 'expires_idx', IndexType.Key, ['expiresAt']);
}
