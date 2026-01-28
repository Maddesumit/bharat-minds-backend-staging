
import { databases, config } from '../config/appwrite.config';

async function checkColleges() {
    try {
        console.log(`Checking collection: ${config.collections.colleges}`);
        const list = await databases.listDocuments(
            config.databaseId,
            config.collections.colleges,
            []
        );
        console.log(`Total Colleges Found: ${list.total}`);
        if (list.total > 0) {
            console.log('Sample College:', JSON.stringify(list.documents[0], null, 2));
        } else {
            console.log('Collection is empty.');
        }
    } catch (error) {
        console.error('Error checking colleges:', error);
    }
}
checkColleges();
