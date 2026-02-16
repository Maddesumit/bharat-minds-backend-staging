/**
 * Check Available Collections in Database
 */

const dns = require('node:dns');
require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

// Configure DNS
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

async function checkCollections() {
    const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_PROJECT_ID || '';
    const apiKey = process.env.APPWRITE_API_KEY || '';
    const databaseId = process.env.APPWRITE_DATABASE_ID || '';

    console.log('\n=== CHECKING AVAILABLE COLLECTIONS ===\n');

    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setKey(apiKey);

    const databases = new Databases(client);

    // Check for farm-related collections
    const collectionsToCheck = [
        'Farm_Agri',
        'Farm_AgriV2',
        'farm_agri',
        'farm_agriv2',
        'Veterinary',
        'veterinary',
        'Medical',
        'medical'
    ];

    console.log('Checking collections:');
    console.log('-'.repeat(60));

    for (const collName of collectionsToCheck) {
        try {
            const result = await databases.listDocuments(databaseId, collName, []);
            console.log(`✅ ${collName.padEnd(25)} - ${result.total} documents`);
        } catch (error) {
            if (error.code === 404) {
                console.log(`❌ ${collName.padEnd(25)} - Not found`);
            } else {
                console.log(`⚠️  ${collName.padEnd(25)} - ${error.message}`);
            }
        }
    }

    console.log('-'.repeat(60));
    console.log('\nNow listing ALL collections in database...\n');

    try {
        const response = await fetch(`${endpoint}/databases/${databaseId}/collections`, {
            headers: {
                'X-Appwrite-Project': projectId,
                'X-Appwrite-Key': apiKey
            }
        });
        const data = await response.json();

        if (response.status === 200 && data.collections) {
            console.log(`Found ${data.total} collections:\n`);
            data.collections.forEach((col) => {
                console.log(`  - ${col.name} (ID: ${col.$id})`);
            });
        }
    } catch (error) {
        console.log('Could not list collections:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');
}

checkCollections()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Check failed:', error);
        process.exit(1);
    });
