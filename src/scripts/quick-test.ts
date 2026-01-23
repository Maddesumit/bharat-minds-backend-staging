/**
 * Simple Collection Access Test
 * Tests basic connectivity to Appwrite collections
 */

import { databases, config } from '../config/appwrite.config';
import { Query } from 'node-appwrite';

async function quickTest() {
    console.log('='.repeat(50));
    console.log('QUICK COLLECTION ACCESS TEST');
    console.log('='.repeat(50));
    console.log('\nConfiguration:');
    console.log('  Endpoint:', config.endpoint);
    console.log('  Project ID:', config.projectId);
    console.log('  Database ID:', config.databaseId);
    console.log('\nTesting collections...\n');

    const collectionsToTest = [
        ['Colleges', config.collections.colleges],
        ['User Profiles', config.collections.userProfiles],
        ['Student Ranks', config.collections.studentRanks],
    ];

    for (const [name, collectionId] of collectionsToTest) {
        try {
            const result = await databases.listDocuments(
                config.databaseId,
                collectionId,
                [Query.limit(1)]
            );
            console.log(` ${name}: ${result.total} documents`);
        } catch (error: any) {
            console.log(` ${name}: ERROR - ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(50));
}

quickTest().catch(console.error);
