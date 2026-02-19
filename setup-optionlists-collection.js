/**
 * Setup OptionLists Collection
 * Creates the 'option_lists' collection in the backend database with required schema
 */

const dns = require('node:dns');
require('dotenv').config();
const { Client, Databases, Permission, Role } = require('node-appwrite');

// Configure DNS
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

async function setupOptionListsCollection() {
    console.log('--- Setting up OptionLists Collection ---');

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const databaseId = '696880f7002999b80fab'; // Specific backend DB ID
    const collectionName = 'OptionLists';
    let collectionId = '';

    try {
        // 1. Create Collection
        console.log(`Creating collection '${collectionName}'...`);
        const collection = await databases.createCollection(
            databaseId,
            'option_lists_v3', // ID
            collectionName,
            [
                Permission.read(Role.any()),
                Permission.create(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any())
            ]
        );
        collectionId = collection.$id;
        console.log(`Collection created with ID: ${collectionId}`);

        // 2. Create Attributes
        console.log('Creating attributes...');

        // Helper to delay attribute creation
        const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const attributes = [
            { key: 'studentId', type: 'string', size: 255, required: true },
            { key: 'optionListData', type: 'string', size: 10000, required: true }, // Using large size for JSON
            { key: 'generatedAt', type: 'string', size: 50, required: true },
            { key: 'pdfUrl', type: 'string', size: 1000, required: false }
        ];

        for (const attr of attributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(databaseId, collectionId, attr.key, attr.size, attr.required);
                }
                console.log(`Created attribute: ${attr.key}`);
                await pause(200);
            } catch (error) {
                console.log(`Error creating attribute ${attr.key}: ${error.message}`);
            }
        }

        console.log('--- Collection Setup Complete ---');
        console.log(`Please update your frontend .env with: APPWRITE_OPTION_LISTS_COLLECTION_ID=${collectionId}`);

    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setupOptionListsCollection();
