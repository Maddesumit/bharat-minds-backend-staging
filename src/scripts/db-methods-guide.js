/**
 * Appwrite Database Instances & SDK Methods - Complete Guide
 * 
 * This file shows you how to:
 * 1. Create database instances
 * 2. Call various SDK methods
 * 3. Perform CRUD operations
 * 
 * Usage: node src/scripts/db-methods-guide.js
 */

const sdk = require('node-appwrite');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ============================================================================
// STEP 1: CREATE DATABASE INSTANCES
// ============================================================================

console.log('='.repeat(80));
console.log('📚 APPWRITE DATABASE INSTANCES & SDK METHODS GUIDE');
console.log('='.repeat(80));

// 1.1 Initialize Appwrite Client
const client = new sdk.Client();

client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

console.log('\n Step 1: Client initialized');
console.log('   Endpoint:', process.env.APPWRITE_ENDPOINT);
console.log('   Project ID:', process.env.APPWRITE_PROJECT_ID);

// 1.2 Create Service Instances
const databases = new sdk.Databases(client);  // For database operations
const users = new sdk.Users(client);          // For user management
const storage = new sdk.Storage(client);      // For file storage

console.log('\n Step 2: Service instances created');
console.log('   - Databases service');
console.log('   - Users service');
console.log('   - Storage service');

// Get your database ID
const databaseId = process.env.APPWRITE_DATABASE_ID || 'main_db';

console.log('\n Step 3: Database ID configured:', databaseId);

// ============================================================================
// STEP 2: CALL SDK METHODS - EXAMPLES
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log(' CALLING SDK METHODS - EXAMPLES');
console.log('='.repeat(80));

// ----------------------------------------------------------------------------
// Example 1: List Documents
// ----------------------------------------------------------------------------
async function example1_ListDocuments() {
    console.log('\n📌 Example 1: List Documents\n');

    try {
        const collectionId = process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges';

        const response = await databases.listDocuments(
            databaseId,
            collectionId
        );

        console.log(` Success! Found ${response.total} documents`);
        console.log(`   First document ID: ${response.documents[0]?.$id || 'N/A'}`);

        return response;
    } catch (error) {
        console.error(' Error:', error.message);
        return null;
    }
}

// ----------------------------------------------------------------------------
// Example 2: List Documents with Queries
// ----------------------------------------------------------------------------
async function example2_ListWithQueries() {
    console.log('\n📌 Example 2: List Documents with Queries\n');

    try {
        const collectionId = process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges';

        const response = await databases.listDocuments(
            databaseId,
            collectionId,
            [
                sdk.Query.limit(5),              // Limit to 5 results
                sdk.Query.orderDesc('$createdAt')  // Sort by newest first
            ]
        );

        console.log(` Success! Retrieved ${response.documents.length} documents`);
        response.documents.forEach((doc, i) => {
            console.log(`   ${i + 1}. Document ID: ${doc.$id}`);
        });

        return response;
    } catch (error) {
        console.error(' Error:', error.message);
        return null;
    }
}

// ----------------------------------------------------------------------------
// Example 3: Get Single Document
// ----------------------------------------------------------------------------
async function example3_GetDocument(documentId) {
    console.log('\n📌 Example 3: Get Single Document\n');

    try {
        const collectionId = process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges';

        const document = await databases.getDocument(
            databaseId,
            collectionId,
            documentId
        );

        console.log(' Success! Document retrieved:');
        console.log('   Document ID:', document.$id);
        console.log('   Created:', new Date(document.$createdAt).toLocaleString());

        return document;
    } catch (error) {
        console.error(' Error:', error.message);
        return null;
    }
}

// ----------------------------------------------------------------------------
// Example 4: Create Document
// ----------------------------------------------------------------------------
async function example4_CreateDocument() {
    console.log('\n📌 Example 4: Create Document\n');

    try {
        const collectionId = process.env.APPWRITE_STUDENT_RANKS_COLLECTION_ID || 'student_ranks';

        const document = await databases.createDocument(
            databaseId,
            collectionId,
            sdk.ID.unique(),  // Auto-generate unique ID
            {
                userId: 'demo_user_' + Date.now(),
                counsellingType: 'UGCET',
                courseCategory: 'Engineering',
                generalMeritRank: 12345,
                createdAt: new Date().toISOString()
            }
        );

        console.log(' Success! Document created:');
        console.log('   Document ID:', document.$id);
        console.log('   User ID:', document.userId);

        return document;
    } catch (error) {
        console.error(' Error:', error.message);
        return null;
    }
}

// ----------------------------------------------------------------------------
// Example 5: Update Document
// ----------------------------------------------------------------------------
async function example5_UpdateDocument(documentId) {
    console.log('\n📌 Example 5: Update Document\n');

    try {
        const collectionId = process.env.APPWRITE_STUDENT_RANKS_COLLECTION_ID || 'student_ranks';

        const document = await databases.updateDocument(
            databaseId,
            collectionId,
            documentId,
            {
                generalMeritRank: 11111,  // Update only this field
                updatedAt: new Date().toISOString()
            }
        );

        console.log(' Success! Document updated:');
        console.log('   Document ID:', document.$id);
        console.log('   New Rank:', document.generalMeritRank);

        return document;
    } catch (error) {
        console.error(' Error:', error.message);
        return null;
    }
}

// ----------------------------------------------------------------------------
// Example 6: Delete Document
// ----------------------------------------------------------------------------
async function example6_DeleteDocument(documentId) {
    console.log('\n📌 Example 6: Delete Document\n');

    try {
        const collectionId = process.env.APPWRITE_STUDENT_RANKS_COLLECTION_ID || 'student_ranks';

        await databases.deleteDocument(
            databaseId,
            collectionId,
            documentId
        );

        console.log(' Success! Document deleted:');
        console.log('   Document ID:', documentId);

        return true;
    } catch (error) {
        console.error(' Error:', error.message);
        return false;
    }
}

// ----------------------------------------------------------------------------
// Example 7: Query with Filters
// ----------------------------------------------------------------------------
async function example7_QueryWithFilters() {
    console.log('\n📌 Example 7: Query with Filters\n');

    try {
        const collectionId = process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges';

        const response = await databases.listDocuments(
            databaseId,
            collectionId,
            [
                sdk.Query.equal('city', 'Bangalore'),  // Filter by city
                sdk.Query.limit(10),
                sdk.Query.orderAsc('collegeName')
            ]
        );

        console.log(` Success! Found ${response.documents.length} colleges in Bangalore`);
        response.documents.forEach((doc, i) => {
            console.log(`   ${i + 1}. ${doc.collegeName || doc.$id}`);
        });

        return response;
    } catch (error) {
        console.error(' Error:', error.message);
        return null;
    }
}

// ----------------------------------------------------------------------------
// Example 8: Count Documents
// ----------------------------------------------------------------------------
async function example8_CountDocuments() {
    console.log('\n📌 Example 8: Count Documents\n');

    try {
        const collectionId = process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges';

        const response = await databases.listDocuments(
            databaseId,
            collectionId,
            [sdk.Query.limit(1)]  // We only need the count
        );

        console.log(' Success! Document count:');
        console.log('   Total documents:', response.total);

        return response.total;
    } catch (error) {
        console.error(' Error:', error.message);
        return 0;
    }
}

// ============================================================================
// MAIN FUNCTION - RUN EXAMPLES
// ============================================================================

async function main() {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 RUNNING EXAMPLES');
    console.log('='.repeat(80));

    // Run examples one by one
    await example1_ListDocuments();
    await example2_ListWithQueries();
    await example8_CountDocuments();

    // Example 7: Query with filters
    await example7_QueryWithFilters();

    // Create, Update, Delete cycle (commented out to avoid creating test data)
    /*
    const newDoc = await example4_CreateDocument();
    if (newDoc) {
        await example5_UpdateDocument(newDoc.$id);
        await example3_GetDocument(newDoc.$id);
        await example6_DeleteDocument(newDoc.$id);
    }
    */

    console.log('\n' + '='.repeat(80));
    console.log(' ALL EXAMPLES COMPLETED!');
    console.log('='.repeat(80));
    console.log('\n💡 Tip: Uncomment the create/update/delete examples to test full CRUD.\n');
}

// Run the examples
main().catch(error => {
    console.error('\n Fatal error:', error);
    process.exit(1);
});
