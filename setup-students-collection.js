/**
 * Setup Students Collection
 * Creates the 'students' collection in the backend database with required schema
 */

const dns = require('node:dns');
require('dotenv').config();
const { Client, Databases, Permission, Role } = require('node-appwrite');

// Configure DNS
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

async function setupStudentsCollection() {
    console.log('--- Setting up Students Collection ---');

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const databaseId = '696880f7002999b80fab'; // Specific backend DB ID
    const collectionName = 'Students';
    let collectionId = '';

    try {
        // 1. Create Collection
        console.log(`Creating collection '${collectionName}'...`);
        const collection = await databases.createCollection(
            databaseId,
            'students_v3', // ID
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
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'mobile', type: 'string', size: 20, required: true },
            { key: 'email', type: 'string', size: 255, required: true },
            { key: 'counsellingTypes', type: 'string', size: 5000, required: false }, // JSON
            { key: 'ugcetCourses', type: 'string', size: 5000, required: false }, // JSON
            { key: 'farmScienceCourses', type: 'string', size: 5000, required: false }, // JSON
            { key: 'ugneetCourses', type: 'string', size: 5000, required: false }, // JSON
            { key: 'ugneetSpecialCategories', type: 'string', size: 5000, required: false }, // JSON
            { key: 'neetAIR', type: 'integer', required: false },
            { key: 'courseRanks', type: 'string', size: 5000, required: false }, // JSON
            { key: 'baseCategory', type: 'string', size: 50, required: false },
            { key: 'hasKannada', type: 'boolean', required: false },
            { key: 'hasRural', type: 'boolean', required: false },
            { key: 'hasHK', type: 'boolean', required: false },
            { key: 'snqApplied', type: 'boolean', required: false },
            { key: 'incomeSlab', type: 'string', size: 50, required: false },
            { key: 'eligibleCategories', type: 'string', size: 5000, required: false }, // JSON
            { key: 'specialCategories', type: 'string', size: 5000, required: false }, // JSON
            { key: 'preferredLocations', type: 'string', size: 5000, required: false }, // JSON
            { key: 'preferredCollegeTypes', type: 'string', size: 5000, required: false }, // JSON
            { key: 'preferredColleges', type: 'string', size: 5000, required: false }, // JSON
            { key: 'createdAt', type: 'string', size: 50, required: false }
        ];

        for (const attr of attributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(databaseId, collectionId, attr.key, attr.size, attr.required);
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(databaseId, collectionId, attr.key, attr.required);
                } else if (attr.type === 'boolean') {
                    await databases.createBooleanAttribute(databaseId, collectionId, attr.key, attr.required);
                }
                console.log(`Created attribute: ${attr.key}`);
                await pause(200); // Small delay to avoid rate limits
            } catch (error) {
                console.log(`Error creating attribute ${attr.key}: ${error.message}`);
            }
        }

        console.log('--- Collection Setup Complete ---');
        console.log(`Please update your frontend .env with: APPWRITE_STUDENTS_COLLECTION_ID=${collectionId}`);

    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setupStudentsCollection();
