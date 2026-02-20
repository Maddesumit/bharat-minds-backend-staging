require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

async function check() {
    try {
        const response = await databases.listCollections(databaseId);
        const searchNames = ['student_option_entry_farmagri', 'student_option_entry_engineering'];

        console.log('RESULTS_START');
        response.collections.forEach(col => {
            if (searchNames.includes(col.name) || searchNames.includes(col.$id) || col.name.toLowerCase().includes('option_entry')) {
                console.log(`FOUND|${col.name}|${col.$id}`);
            }
        });
        console.log('RESULTS_END');
    } catch (e) {
        console.error(e.message);
    }
}
check();
