/**
 * Quick Auth Status Check
 */

const dns = require('node:dns');
require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

// Configure DNS
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

async function quickCheck() {
    const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_PROJECT_ID || '';
    const apiKey = process.env.APPWRITE_API_KEY || '';
    const databaseId = process.env.APPWRITE_DATABASE_ID || '';

    console.log('\n=== QUICK AUTH CHECK ===\n');
    console.log('Endpoint:', endpoint);
    console.log('Project:', projectId);
    console.log('Database:', databaseId);
    console.log('');

    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setKey(apiKey);

    const databases = new Databases(client);

    const collections = ['student_profiles_v2', 'historical_cutoffs', 'farm_agri', 'colleges'];

    console.log('Testing Collections:');
    console.log('-'.repeat(50));

    let allSuccess = true;

    for (const coll of collections) {
        try {
            const result = await databases.listDocuments(databaseId, coll, []);
            console.log(`✅ ${coll.padEnd(25)} - ${result.total} docs`);
        } catch (error) {
            allSuccess = false;
            const status = error.code || error.status || 'ERROR';
            console.log(`❌ ${coll.padEnd(25)} - ${status}: ${error.message}`);
        }
    }

    console.log('-'.repeat(50));
    if (allSuccess) {
        console.log('\n✅ ALL CHECKS PASSED - API is working correctly!\n');
    } else {
        console.log('\n⚠️  SOME CHECKS FAILED - See errors above\n');
    }
}

quickCheck()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Check failed:', error.message);
        process.exit(1);
    });
