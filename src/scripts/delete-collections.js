/**
 * ⚠️ DESTRUCTIVE OPERATION ⚠️
 * Delete All Collections & Start Fresh
 * 
 * This script will:
 * 1. DELETE all existing collections
 * 2. DELETE all documents inside them
 * 3. You will lose ALL DATA
 * 
 * Usage: node src/scripts/delete-collections.js
 * 
 * ⚠️ REQUIRES MANUAL CONFIRMATION BEFORE RUNNING
 */

const sdk = require('node-appwrite');
const dotenv = require('dotenv');
const readline = require('readline');

dotenv.config();

const client = new sdk.Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new sdk.Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'main_db';

// Collections to delete
const collectionsToDelete = [
    { name: 'User Profiles', id: process.env.APPWRITE_USER_PROFILES_COLLECTION_ID || 'user_profiles' },
    { name: 'Student Ranks', id: process.env.APPWRITE_STUDENT_RANKS_COLLECTION_ID || 'student_ranks' },
    { name: 'Colleges', id: process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges' },
    { name: 'College Courses', id: process.env.APPWRITE_COLLEGE_COURSES_COLLECTION_ID || 'college_courses' },
    { name: 'User Preferences', id: process.env.APPWRITE_USER_PREFERENCES_COLLECTION_ID || 'user_preferences' },
    { name: 'Cutoff Data', id: process.env.APPWRITE_CUTOFF_DATA_COLLECTION_ID || 'cutoff_data' },
    { name: 'Option Lists', id: process.env.APPWRITE_OPTION_LISTS_COLLECTION_ID || 'option_lists' },
    { name: 'Students (Legacy)', id: process.env.APPWRITE_STUDENTS_COLLECTION_ID || 'students' },
];

// Create readline interface for confirmation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function deleteAllCollections() {
    console.log('='.repeat(80));
    console.log('⚠️  DELETE ALL COLLECTIONS - FRESH START');
    console.log('='.repeat(80));

    console.log('\n🔥 This will DELETE the following collections:');
    console.log('');
    collectionsToDelete.forEach((col, i) => {
        console.log(`   ${i + 1}. ${col.name} (${col.id})`);
    });

    console.log('\n⚠️  WARNING:');
    console.log('   - All documents will be permanently deleted');
    console.log('   - All collection schemas will be removed');
    console.log('   - This action CANNOT be undone');
    console.log('   - No backup will be created');

    // First confirmation
    const confirm1 = await askQuestion('\n❓ Are you ABSOLUTELY sure you want to proceed? (type "DELETE" to confirm): ');

    if (confirm1 !== 'DELETE') {
        console.log('\n Operation cancelled. No changes made.');
        rl.close();
        return;
    }

    // Second confirmation
    const confirm2 = await askQuestion('\n❓ Last chance! Type "YES DELETE EVERYTHING" to proceed: ');

    if (confirm2 !== 'YES DELETE EVERYTHING') {
        console.log('\n Operation cancelled. No changes made.');
        rl.close();
        return;
    }

    console.log('\n🔥 Starting deletion process...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const collection of collectionsToDelete) {
        try {
            console.log(`🗑️  Deleting: ${collection.name}...`);

            await databases.deleteCollection(
                databaseId,
                collection.id
            );

            console.log(`    Deleted successfully`);
            successCount++;

        } catch (error) {
            console.log(`    Error: ${error.message}`);
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log(' DELETION SUMMARY');
    console.log('='.repeat(80));
    console.log(` Successfully deleted: ${successCount} collections`);
    console.log(` Errors: ${errorCount}`);
    console.log('='.repeat(80));

    if (successCount > 0) {
        console.log('\n Collections deleted successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Recreate collections in Appwrite Console');
        console.log('   2. Or run: node src/scripts/recreate-collections.js (if available)');
        console.log('   3. Update your .env file with new collection IDs');
    }

    rl.close();
}

// Run the deletion
deleteAllCollections().catch(error => {
    console.error('\n Fatal error:', error.message);
    rl.close();
    process.exit(1);
});
