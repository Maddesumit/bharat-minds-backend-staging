/**
 * Simple Test - Using Your Exact Config (TypeScript version)
 */

import { databases, config } from '../config/appwrite.config';

console.log('='.repeat(80));
console.log(' TESTING WITH YOUR EXISTING CONFIG');
console.log('='.repeat(80));

console.log('\nConfiguration:');
console.log('  Database ID:', config.databaseId);
console.log('  Endpoint:', config.endpoint);
console.log('  Project ID:', config.projectId);

async function testCollections() {
    console.log('\n' + '='.repeat(80));
    console.log('Testing Collections...');
    console.log('='.repeat(80));

    const collections = [
        ['Colleges', config.collections.colleges],
        ['Student Ranks', config.collections.studentRanks],
        ['User Profiles', config.collections.userProfiles],
    ];

    for (const [name, collectionId] of collections) {
        try {
            console.log(`\n ${name} (${collectionId})...`);

            const response = await databases.listDocuments(
                config.databaseId,
                collectionId
            );

            console.log(`    Success! Found ${response.total} documents`);

            if (response.documents.length > 0) {
                console.log(`   First document ID: ${response.documents[0].$id}`);

                // Show first document fields
                const doc = response.documents[0];
                const fields = Object.keys(doc).filter(k => !k.startsWith('$')).slice(0, 3);
                console.log(`   Sample fields:`);
                fields.forEach(field => {
                    let value = doc[field];
                    if (typeof value === 'string' && value.length > 40) {
                        value = value.substring(0, 40) + '...';
                    }
                    console.log(`     - ${field}: ${value}`);
                });
            }

        } catch (error: any) {
            console.log(`    Error: ${error.message}`);
            if (error.code) console.log(`   Code: ${error.code}`);
            if (error.type) console.log(`   Type: ${error.type}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log(' Test Complete');
    console.log('='.repeat(80) + '\n');
}

testCollections().catch(error => {
    console.error('\n Fatal error:', error.message);
    process.exit(1);
});
