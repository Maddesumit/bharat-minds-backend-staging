
import { databases, config } from '../config/appwrite.config';

async function checkCollection() {
    try {
        console.log(`Checking collection: ${config.collections.optionLists}`);
        const list = await databases.listDocuments(
            config.databaseId,
            config.collections.optionLists,
            []
        );
        console.log(`Total Option Lists: ${list.total}`);
    } catch (error: any) {
        if (error.code === 404) {
            console.log('Collection option_lists does NOT exist.');
        } else {
            console.error('Error checking collection:', error.message);
        }
    }
}
checkCollection();
