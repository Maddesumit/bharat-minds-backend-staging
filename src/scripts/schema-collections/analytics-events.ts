/**
 * Analytics Events Collection
 * 
 * User behavior tracking for ML/AI recommendations
 */

import { Databases, IndexType } from 'node-appwrite';
import { createCollectionSafe, createAttributeSafe, createIndexSafe, wait } from '../schema-helpers';

export async function setupAnalyticsEvents(databases: Databases, databaseId: string) {
    const collectionId = 'analytics_events';

    await createCollectionSafe(databases, databaseId, collectionId, 'Analytics Events');
    await wait(2000);

    // Event Identity
    await createAttributeSafe(databases, databaseId, collectionId, 'userId', 'string', 50, true);
    await createAttributeSafe(databases, databaseId, collectionId, 'eventType', 'string', 100, true);

    // Event Data
    await createAttributeSafe(databases, databaseId, collectionId, 'collegeCode', 'string', 20, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'branchCode', 'string', 20, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'seatType', 'string', 5, false);

    // Session Tracking
    await createAttributeSafe(databases, databaseId, collectionId, 'sessionId', 'string', 100, false);
    await createAttributeSafe(databases, databaseId, collectionId, 'timestamp', 'string', 50, true);

    // Flexible metadata for any additional event data
    await createAttributeSafe(databases, databaseId, collectionId, 'metadata', 'string', 5000, false);

    await wait(3000);

    // Indexes
    await createIndexSafe(databases, databaseId, collectionId, 'user_time', IndexType.Key, ['userId', 'timestamp']);
    await createIndexSafe(databases, databaseId, collectionId, 'event_idx', IndexType.Key, ['eventType']);
}
