
import { databases, config } from '../config/appwrite.config';

async function listDocs() {
    const list = await databases.listDocuments(config.databaseId, 'historical_cutoffs', []);
    console.log(`Total Docs: ${list.total}`);
    if (list.total > 0) {
        console.log('Sample Doc:', JSON.stringify(list.documents[0], null, 2));
    }
}
listDocs();
