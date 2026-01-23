/**
 * Verify All Collections
 * Quick overview of all imported data
 */

const sdk = require('node-appwrite');
const dotenv = require('dotenv');

dotenv.config();

const client = new sdk.Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new sdk.Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || '';

async function verifyAll() {
    console.log('\n' + '='.repeat(80));
    console.log(' BHARAT MINDS - DATABASE VERIFICATION');
    console.log('='.repeat(80));
    console.log(`\nDatabase ID: ${databaseId}\n`);

    const collections = [
        { id: 'colleges', name: 'Colleges', env: 'APPWRITE_COLLEGES_COLLECTION_ID' },
        { id: 'college_courses', name: 'College Courses', env: 'APPWRITE_COLLEGE_COURSES_COLLECTION_ID' },
        { id: 'cutoff_data', name: 'Cutoff Data', env: 'APPWRITE_CUTOFF_DATA_COLLECTION_ID' },
        { id: 'student_ranks', name: 'Student Ranks', env: 'APPWRITE_STUDENT_RANKS_COLLECTION_ID' },
        { id: 'user_profiles', name: 'User Profiles', env: 'APPWRITE_USER_PROFILES_COLLECTION_ID' },
        { id: 'user_preferences', name: 'User Preferences', env: 'APPWRITE_USER_PREFERENCES_COLLECTION_ID' },
    ];

    console.log('='.repeat(80));
    console.log('COLLECTION STATUS');
    console.log('='.repeat(80));

    for (const coll of collections) {
        try {
            const response = await databases.listDocuments(databaseId, coll.id);
            const status = response.total > 0 ? '' : '⚠️ ';
            const emoji = response.total > 0 ? '' : '📭';

            console.log(`${status} ${emoji} ${coll.name.padEnd(20)} : ${response.total.toString().padStart(4)} documents`);
        } catch (error) {
            console.log(` ⚠️  ${coll.name.padEnd(20)} : ERROR (${error.message})`);
        }
    }

    console.log('='.repeat(80));
    console.log('\n💡 NEXT STEPS:\n');

    // Check colleges
    try {
        const colleges = await databases.listDocuments(databaseId, 'colleges');
        if (colleges.total === 0) {
            console.log('   📥 Import colleges:');
            console.log('      npx ts-node src/scripts/import-csv-data.ts\n');
        } else {
            console.log(`    Colleges imported: ${colleges.total}\n`);
        }
    } catch (e) { }

    // Check courses
    try {
        const courses = await databases.listDocuments(databaseId, 'college_courses');
        if (courses.total === 0) {
            console.log('   📥 Import courses:');
            console.log('      npx ts-node src/scripts/import-csv-data1-FIXED.ts\n');
        } else {
            console.log(`    Courses imported: ${courses.total}\n`);
        }
    } catch (e) { }

    // Check cutoff data
    try {
        const cutoffs = await databases.listDocuments(databaseId, 'cutoff_data');
        if (cutoffs.total === 0) {
            console.log('   ⚠️  Cutoff data needed for option generation!');
            console.log('      This is required to match ranks with colleges.\n');
        } else {
            console.log(`    Cutoff data imported: ${cutoffs.total}\n`);
        }
    } catch (e) { }

    console.log('='.repeat(80));
    console.log(' Verification complete!');
    console.log('='.repeat(80));
    console.log('\n🌐 View in Appwrite Console: https://cloud.appwrite.io/console\n');
}

verifyAll().catch(error => {
    console.error('\n Error:', error.message);
    process.exit(1);
});
