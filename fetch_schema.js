
const { Client, Databases } = require('node-appwrite');

const ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = '694160ab00190d61cdfe';
const API_KEY = 'standard_499f16907385983741f3920eeba029297be09ecd5ecf7bb48a43040258899310f49db04db2866e9739729a3d56defed8483ab79557d166bcbe9d0ede0a7498ba20418e72a8b7af24c014cae81bf8462de3c635078cef5f5e253c7b917fb39fee1053ba4ce5f5654024ed374a6c9b21cbc09d2fed9e8437b30eee913ed97f6d14';
const DATABASE_ID = '694594f200315b6b7aa2';
const COLLECTION_ID = '694594f3002aa33b574b';

async function fetchSchema() {
    console.log('STARTING SCRIPT');
    const client = new Client()
        .setEndpoint(ENDPOINT)
        .setProject(PROJECT_ID)
        .setKey(API_KEY);

    const databases = new Databases(client);

    try {
        console.log(`Fetching attributes for collection ${COLLECTION_ID}...`);
        const response = await databases.listAttributes(DATABASE_ID, COLLECTION_ID);

        console.log('--- Collection Attributes ---');
        const simplified = response.attributes.map(attr => ({
            key: attr.key,
            type: attr.type,
            required: attr.required,
            array: attr.array
        }));

        console.log(JSON.stringify(simplified, null, 2));
        console.log('---------------------------');
    } catch (error) {
        console.error('Error fetching schema:', error.message);
    }
}

fetchSchema();
