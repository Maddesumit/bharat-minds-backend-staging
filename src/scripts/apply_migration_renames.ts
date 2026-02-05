
import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'main_db';

const ACTIONS = [
    // Deletions
    { type: 'delete', target: ['Users', 'user_profiles'] },
    { type: 'delete', target: ['CutOff Data', 'cutoff_data'] },

    // Renames
    // target can be ID or Name
    { type: 'rename', target: ['student_preferences_v2', 'student_preferences_v2 (Normalisesd)'], newName: 'Engineering Preference' },
    { type: 'rename', target: ['student_ranks'], newName: 'Student_OptionEntry_Farm_Agri' },
    { type: 'rename', target: ['historical_cutoffs', 'Historical cut_off'], newName: 'Past Engineering Cutoff' },
    { type: 'rename', target: ['college_courses', 'College Courses'], newName: 'Engineering College Courses' },
    { type: 'rename', target: ['colleges', 'Colleges'], newName: 'Engineering Colleges' },
    { type: 'rename', target: ['student_ranks'], newName: 'Student_OptionEntry_Engineering' },
    { type: 'rename', target: ['student_profiles_v2'], newName: 'Student_OptionEntry_FarmAgri' }

];

async function applyMigration() {
    console.log(`🔌 Connecting to Database: ${databaseId}`);

    try {
        const response = await databases.listCollections(databaseId);
        const existingCollections = response.collections;

        console.log(`📦 Found ${existingCollections.length} collections.`);

        for (const action of ACTIONS) {
            // Find collection by checking if ID or Name is in the target list
            const collection = existingCollections.find(c =>
                action.target.includes(c.$id) || action.target.includes(c.name)
            );

            if (!collection) {
                console.log(`⚠️  Could not find collection matching: ${action.target.join(' or ')}`);
                continue;
            }

            if (action.type === 'delete') {
                console.log(`🗑️  Deleting collection: "${collection.name}" (${collection.$id})...`);
                await databases.deleteCollection(databaseId, collection.$id);
                console.log(`   ✅ Deleted.`);
            } else if (action.type === 'rename') {
                if (collection.name === action.newName) {
                    console.log(`⏭️  Collection "${collection.name}" already has the correct name.`);
                    continue;
                }
                console.log(`✏️  Renaming "${collection.name}" (${collection.$id}) -> "${action.newName}"...`);
                await databases.updateCollection(databaseId, collection.$id, action.newName!);
                console.log(`   ✅ Renamed.`);
            }
        }

        console.log('\n✨ Migration complete.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

applyMigration();
