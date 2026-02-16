import { databases, config } from '../config/appwrite.config';
import { calculateSearchRange } from '../services/option-generator.service';

async function checkColleges() {
    try {
        console.log(`Checking collection: ${config.collections.colleges}`);

        // Test Search Range Calculation
        const testRank = 15234;
        const range = calculateSearchRange(testRank);
        console.log(`\n--- Testing Search Range Calculation ---`);
        console.log(`Student Rank: ${testRank.toLocaleString()}`);
        console.log(`Search Range: ${range.minRank.toLocaleString()} to ${range.maxRank.toLocaleString()}`);

        const list = await databases.listDocuments(
            config.databaseId,
            config.collections.colleges,
            []
        );
        console.log(`\nTotal Colleges Found: ${list.total}`);
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
