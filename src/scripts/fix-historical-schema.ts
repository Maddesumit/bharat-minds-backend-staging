
import { databases, config } from '../config/appwrite.config';
import { setupHistoricalCutoffs } from './schema-collections/historical-cutoffs';

async function fixSchema() {
    try {
        console.log(' Deleting historical_cutoffs collection...');
        await databases.deleteCollection(config.databaseId, 'historical_cutoffs');
        console.log(' Deleted.');
    } catch (error: any) {
        if (error.code === 404) {
            console.log(' Collection did not exist, skipping delete.');
        } else {
            console.error(' Error deleting collection:', error);
        }
    }

    console.log('Re-creating historical_cutoffs collection with Correct Schema...');
    await setupHistoricalCutoffs(databases, config.databaseId);
    console.log(' Done.');
}

fixSchema();
