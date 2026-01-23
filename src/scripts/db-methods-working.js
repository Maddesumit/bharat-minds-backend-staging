/**
 * Appwrite Database SDK Methods - Fixed for SDK v11
 * 
 * Working examples with node-appwrite v11.0.0
 * 
 * Usage: node src/scripts/db-methods-working.js
 */

const sdk = require('node-appwrite');
const dotenv = require('dotenv');

dotenv.config();

console.log('='.repeat(80));
console.log('📚 APPWRITE SDK v11 - DATABASE METHODS');
console.log('='.repeat(80));

// Create client
const client = new sdk.Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

console.log('\n Client initialized');
console.log('   Endpoint:', process.env.APPWRITE_ENDPOINT);

// Create database instance
const databases = new sdk.Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'main_db';

console.log(' Databases instance created');
console.log('   Database ID:', databaseId);

// ============================================================================
// WORKING EXAMPLES FOR SDK v11
// ============================================================================

// Example 1: List all documents (no queries)
async function example1_ListAll() {
    console.log('\n' + '='.repeat(80));
    console.log('📌 Example 1: List All Documents');
    console.log('='.repeat(80));

    try {
        const collectionId = process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges';

        const response = await databases.listDocuments(
            databaseId,
            collectionId
        );

        console.log(`\n Success! Found ${response.total} documents`);
        if (response.documents.length > 0) {
            console.log(`   First document ID: ${response.documents[0].$id}`);
            console.log(`   Showing first 3:`)
                ;
            response.documents.slice(0, 3).forEach((doc, i) => {
                console.log(`   ${i + 1}. ID: ${doc.$id}`);
            });
        }

        return response;
    } catch (error) {
        console.error('\n Error:', error.message);
        if (error.code) console.error('   Code:', error.code);
        if (error.type) console.error('   Type:', error.type);
        return null;
    }
}

// Example 2: Get single document
async function example2_GetDocument() {
    console.log('\n' + '='.repeat(80));
    console.log('📌 Example 2: Get Single Document');
    console.log('='.repeat(80));

    try {
        const collectionId = process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges';

        // First get list to find a document ID
        const list = await databases.listDocuments(databaseId, collectionId);

        if (list.documents.length === 0) {
            console.log('\n⚠️  No documents found to retrieve');
            return null;
        }

        const docId = list.documents[0].$id;

        const document = await databases.getDocument(
            databaseId,
            collectionId,
            docId
        );

        console.log(`\n Success! Document retrieved:`);
        console.log(`   ID: ${document.$id}`);
        console.log(`   Created: ${new Date(document.$createdAt).toLocaleString()}`);

        // Show first 3 fields
        const fields = Object.keys(document).filter(k => !k.startsWith('$')).slice(0, 3);
        console.log(`   Fields:`);
        fields.forEach(field => {
            console.log(`     - ${field}: ${document[field]}`);
        });

        return document;
    } catch (error) {
        console.error('\n Error:', error.message);
        return null;
    }
}

// Example 3: Create document
async function example3_CreateDocument() {
    console.log('\n' + '='.repeat(80));
    console.log('📌 Example 3: Create Document');
    console.log('='.repeat(80));

    try {
        const collectionId = process.env.APPWRITE_STUDENT_RANKS_COLLECTION_ID || 'student_ranks';

        const data = {
            userId: 'demo_' + Date.now(),
            counsellingType: 'UGCET',
            courseCategory: 'Engineering',
            generalMeritRank: 98765,
            createdAt: new Date().toISOString()
        };

        const document = await databases.createDocument(
            databaseId,
            collectionId,
            sdk.ID.unique(),
            data
        );

        console.log(`\n Success! Document created:`);
        console.log(`   ID: ${document.$id}`);
        console.log(`   User ID: ${document.userId}`);
        console.log(`   Rank: ${document.generalMeritRank}`);

        return document;
    } catch (error) {
        console.error('\n Error:', error.message);
        if (error.code) console.error('   Code:', error.code);
        return null;
    }
}

// Example 4: Update document
async function example4_UpdateDocument(documentId) {
    console.log('\n' + '='.repeat(80));
    console.log('📌 Example 4: Update Document');
    console.log('='.repeat(80));

    try {
        const collectionId = process.env.APPWRITE_STUDENT_RANKS_COLLECTION_ID || 'student_ranks';

        const document = await databases.updateDocument(
            databaseId,
            collectionId,
            documentId,
            {
                generalMeritRank: 55555,
                updatedAt: new Date().toISOString()
            }
        );

        console.log(`\n Success! Document updated:`);
        console.log(`   ID: ${document.$id}`);
        console.log(`   New Rank: ${document.generalMeritRank}`);

        return document;
    } catch (error) {
        console.error('\n Error:', error.message);
        return null;
    }
}

// Example 5: Delete document
async function example5_DeleteDocument(documentId) {
    console.log('\n' + '='.repeat(80));
    console.log('📌 Example 5: Delete Document');
    console.log('='.repeat(80));

    try {
        const collectionId = process.env.APPWRITE_STUDENT_RANKS_COLLECTION_ID || 'student_ranks';

        await databases.deleteDocument(
            databaseId,
            collectionId,
            documentId
        );

        console.log(`\n Success! Document deleted:`);
        console.log(`   ID: ${documentId}`);

        return true;
    } catch (error) {
        console.error('\n Error:', error.message);
        return false;
    }
}

// Example 6: Count documents
async function example6_CountDocuments() {
    console.log('\n' + '='.repeat(80));
    console.log('📌 Example 6: Count Documents in Each Collection');
    console.log('='.repeat(80));

    const collections = {
        'Colleges': process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges',
        'Student Ranks': process.env.APPWRITE_STUDENT_RANKS_COLLECTION_ID || 'student_ranks',
        'User Profiles': process.env.APPWRITE_USER_PROFILES_COLLECTION_ID || 'user_profiles',
    };

    console.log('');
    for (const [name, collectionId] of Object.entries(collections)) {
        try {
            const response = await databases.listDocuments(databaseId, collectionId);
            console.log(` ${name.padEnd(20)}: ${response.total} documents`);
        } catch (error) {
            console.log(` ${name.padEnd(20)}: Error - ${error.message}`);
        }
    }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 RUNNING EXAMPLES');
    console.log('='.repeat(80));

    // Run safe examples (read-only)
    await example1_ListAll();
    await example2_GetDocument();
    await example6_CountDocuments();

    // Uncomment to test create/update/delete
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  CREATE/UPDATE/DELETE EXAMPLES (commented out)');
    console.log('='.repeat(80));
    console.log('\nUncomment the following code to test CRUD operations:\n');
    console.log('const newDoc = await example3_CreateDocument();');
    console.log('if (newDoc) {');
    console.log('    await example4_UpdateDocument(newDoc.$id);');
    console.log('    await example5_DeleteDocument(newDoc.$id);');
    console.log('}');

    /*
    // Uncomment this block to test create/update/delete
    const newDoc = await example3_CreateDocument();
    if (newDoc) {
        await example4_UpdateDocument(newDoc.$id);
        await example5_DeleteDocument(newDoc.$id);
    }
    */

    console.log('\n' + '='.repeat(80));
    console.log(' ALL EXAMPLES COMPLETED!');
    console.log('='.repeat(80));
    console.log('\n💡 SDK v11 works without query arrays in basic calls');
    console.log('💡 For filtering, use Query helper in a future version\n');
}

// Run
main().catch(error => {
    console.error('\n Fatal error:', error);
    process.exit(1);
});
