/**
 * Simple Test - Using Your Exact Config
 */

// Import from your existing config
const { databases, config } = require('../config/appwrite.config');

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
            }

        } catch (error) {
            console.log(`    Error: ${error.message}`);
            if (error.code) console.log(`   Code: ${error.code}`);
            if (error.response) {
                console.log(`   Response:`, JSON.stringify(error.response).substring(0, 200));
            }
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log(' Test Complete');
    console.log('='.repeat(80) + '\n');
}

testCollections().catch(error => {
    console.error('\n Fatal error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
});
