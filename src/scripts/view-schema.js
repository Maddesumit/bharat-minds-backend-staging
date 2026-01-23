const sdk = require('node-appwrite');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new sdk.Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'main_db';

// View all collections and their schemas
async function viewSchema() {
    try {
        console.log('='.repeat(80));
        console.log('🔍 APPWRITE DATABASE SCHEMA VIEWER');
        console.log('='.repeat(80));
        console.log(`\nDatabase ID: ${databaseId}\n`);

        // List all collections
        console.log('📚 Fetching collections...\n');
        const collections = await databases.listCollections(databaseId);

        console.log(`Found ${collections.total} collections:\n`);
        console.log('='.repeat(80));

        // Show each collection
        for (let i = 0; i < collections.collections.length; i++) {
            const col = collections.collections[i];
            console.log(`\n${i + 1}. ${col.name}`);
            console.log(`   Collection ID: ${col.$id}`);
            console.log(`   Created: ${new Date(col.$createdAt).toLocaleString()}`);
            console.log(`   Enabled: ${col.enabled}`);

            // Show attributes
            console.log(`\n    Attributes (${col.attributes.length} fields):`);

            if (col.attributes.length === 0) {
                console.log('      No attributes defined');
            } else {
                col.attributes.forEach((attr, index) => {
                    console.log(`\n      ${index + 1}. ${attr.key}`);
                    console.log(`         Type: ${attr.type}`);
                    console.log(`         Required: ${attr.required}`);
                    if (attr.size) console.log(`         Size: ${attr.size}`);
                });
            }

            // Show indexes
            if (col.indexes && col.indexes.length > 0) {
                console.log(`\n   📇 Indexes (${col.indexes.length}):`);
                col.indexes.forEach((idx, j) => {
                    console.log(`      ${j + 1}. ${idx.key} (${idx.type})`);
                });
            }

            console.log('\n' + '-'.repeat(80));
        }

        console.log('\n' + '='.repeat(80));
        console.log(' Schema inspection complete!');
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error(' Error:', error.message);
        if (error.code) console.error('Error Code:', error.code);
        if (error.type) console.error('Error Type:', error.type);
        throw error;
    }
}

// Run the function
viewSchema()
    .then(() => console.log(' Done!\n'))
    .catch(error => {
        console.error('\n Failed:', error.message);
        process.exit(1);
    });
