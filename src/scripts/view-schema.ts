/**
 * View Appwrite Schema - Collections and Attributes
 * 
 * This script demonstrates how to view your Appwrite database schema,
 * including collections list and their attributes (fields).
 * 
 * Usage: npx ts-node src/scripts/view-schema.ts
 */

const { Client, Databases } = require('node-appwrite');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Appwrite Client
const client = new Client();

client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

// Create Database service instance
const databases = new Databases(client);

// Get Database ID from environment
const databaseId = process.env.APPWRITE_DATABASE_ID || 'main_db';

// ============================================================================
// SCHEMA INSPECTION FUNCTIONS
// ============================================================================

/**
 * List all collections in the database
 */
async function listAllCollections() {
    try {
        console.log('\n📚 Fetching collections from database...\n');

        const response = await databases.listCollections(databaseId);

        console.log(`Found ${response.total} collections:\n`);
        console.log('='.repeat(80));

        response.collections.forEach((collection, index) => {
            console.log(`\n${index + 1}. ${collection.name}`);
            console.log(`   Collection ID: ${collection.$id}`);
            console.log(`   Created: ${new Date(collection.$createdAt).toLocaleString()}`);
            console.log(`   Updated: ${new Date(collection.$updatedAt).toLocaleString()}`);
            console.log(`   Enabled: ${collection.enabled}`);
        });

        console.log('\n' + '='.repeat(80));

        return response.collections;
    } catch (error) {
        console.error('❌ Error listing collections:', error.message);
        return [];
    }
}

/**
 * Get detailed information about a specific collection including attributes
 */
async function getCollectionSchema(collectionId) {
    try {
        console.log(`\n🔍 Fetching schema for collection: ${collectionId}\n`);

        const collection = await databases.getCollection(databaseId, collectionId);

        console.log('='.repeat(80));
        console.log(`Collection: ${collection.name}`);
        console.log(`ID: ${collection.$id}`);
        console.log(`Database: ${collection.databaseId}`);
        console.log('='.repeat(80));

        // Display Attributes (Schema Fields)
        console.log(`\n📋 Attributes (${collection.attributes.length} fields):\n`);

        if (collection.attributes.length === 0) {
            console.log('   No attributes defined');
        } else {
            collection.attributes.forEach((attr, index) => {
                console.log(`${index + 1}. ${attr.key}`);
                console.log(`   Type: ${attr.type}`);
                console.log(`   Required: ${attr.required}`);
                console.log(`   Array: ${attr.array || false}`);

                if (attr.default !== undefined && attr.default !== null) {
                    console.log(`   Default: ${attr.default}`);
                }

                if (attr.size) {
                    console.log(`   Size: ${attr.size}`);
                }

                if (attr.min !== undefined || attr.max !== undefined) {
                    console.log(`   Range: ${attr.min || 'N/A'} - ${attr.max || 'N/A'}`);
                }

                console.log('');
            });
        }

        // Display Indexes
        console.log(`📇 Indexes (${collection.indexes.length}):\n`);

        if (collection.indexes.length === 0) {
            console.log('   No indexes defined');
        } else {
            collection.indexes.forEach((index, i) => {
                console.log(`${i + 1}. ${index.key}`);
                console.log(`   Type: ${index.type}`);
                console.log(`   Attributes: ${index.attributes.join(', ')}`);
                console.log('');
            });
        }

        console.log('='.repeat(80) + '\n');

        return collection;
    } catch (error) {
        console.error(`❌ Error fetching collection schema: ${error.message}`);
        return null;
    }
}

/**
 * View schema for all configured collections
 */
async function viewAllSchemas() {
    const collections = {
        'User Profiles': process.env.APPWRITE_USER_PROFILES_COLLECTION_ID || 'user_profiles',
        'Student Ranks': process.env.APPWRITE_STUDENT_RANKS_COLLECTION_ID || 'student_ranks',
        'Colleges': process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges',
        'College Courses': process.env.APPWRITE_COLLEGE_COURSES_COLLECTION_ID || 'college_courses',
        'User Preferences': process.env.APPWRITE_USER_PREFERENCES_COLLECTION_ID || 'user_preferences',
        'Cutoff Data': process.env.APPWRITE_CUTOFF_DATA_COLLECTION_ID || 'cutoff_data',
    };

    console.log('\n🔍 Viewing Schema for All Collections\n');

    for (const [name, collectionId] of Object.entries(collections)) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📦 ${name.toUpperCase()}`);
        await getCollectionSchema(collectionId);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

/**
 * Sample documents from a collection
 */
async function sampleCollectionData(collectionId, limit = 3) {
    try {
        console.log(`\n📄 Sample documents from ${collectionId}:\n`);

        const response = await databases.listDocuments(
            databaseId,
            collectionId,
            []
        );

        console.log(`Total documents: ${response.total}`);
        console.log(`Showing first ${Math.min(limit, response.documents.length)} documents:\n`);

        response.documents.slice(0, limit).forEach((doc, index) => {
            console.log(`Document ${index + 1}:`);
            console.log(`  ID: ${doc.$id}`);

            // Show first 5 non-system fields
            const fields = Object.keys(doc).filter(k => !k.startsWith('$')).slice(0, 5);
            fields.forEach(field => {
                let value = doc[field];
                if (typeof value === 'string' && value.length > 50) {
                    value = value.substring(0, 50) + '...';
                }
                console.log(`  ${field}: ${value}`);
            });
            console.log('');
        });

        return response;
    } catch (error) {
        console.error(`❌ Error sampling data: ${error.message}`);
        return null;
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log('='.repeat(80));
    console.log('🔍 APPWRITE DATABASE SCHEMA VIEWER');
    console.log('='.repeat(80));

    console.log('\nConfiguration:');
    console.log(`  Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
    console.log(`  Project ID: ${process.env.APPWRITE_PROJECT_ID}`);
    console.log(`  Database ID: ${databaseId}`);

    // Option 1: List all collections in the database
    const collections = await listAllCollections();

    if (collections.length === 0) {
        console.log('\n❌ No collections found. Check your database ID and connection.');
        return;
    }

    // Option 2: Get schema for a specific collection
    console.log('\n\n' + '='.repeat(80));
    console.log('DETAILED SCHEMA EXAMPLES');
    console.log('='.repeat(80));

    // Example: View colleges collection schema
    const collegesCollectionId = process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges';
    await getCollectionSchema(collegesCollectionId);

    // Example: Sample data from colleges
    await sampleCollectionData(collegesCollectionId, 2);

    // Uncomment to view all schemas
    // await viewAllSchemas();

    console.log('\n✅ Schema inspection complete!\n');
    console.log('💡 Tip: Edit this file and uncomment viewAllSchemas() to see all collection schemas.\n');
}

// Run the script
main().catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
});
