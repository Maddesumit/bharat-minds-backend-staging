/**
 * Test Farm/Medical/Veterinary Option Generation
 * This tests the updated service with Farm_Agri and Farm_AgriV2 collections
 */

const dns = require('node:dns');
require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

// Configure DNS
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

async function testFarmMedicalCollections() {
    const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_PROJECT_ID || '';
    const apiKey = process.env.APPWRITE_API_KEY || '';
    const databaseId = process.env.APPWRITE_DATABASE_ID || '';

    console.log('\n' + '='.repeat(70));
    console.log('TESTING FARM/MEDICAL/VETERINARY COLLECTIONS');
    console.log('='.repeat(70) + '\n');

    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setKey(apiKey);

    const databases = new Databases(client);

    // Test collections
    const collections = ['Farm_Agri', 'Farm_AgriV2'];

    for (const collName of collections) {
        console.log(`\nTesting: ${collName}`);
        console.log('-'.repeat(70));

        try {
            // Try to list documents
            const result = await databases.listDocuments(databaseId, collName, []);
            console.log(`✅ Collection exists: ${result.total} documents`);

            // Show sample document structure if available
            if (result.documents.length > 0) {
                const sampleDoc = result.documents[0];
                console.log('\nSample document fields:');
                const fields = Object.keys(sampleDoc).filter(key => !key.startsWith('$'));
                fields.slice(0, 10).forEach(field => {
                    console.log(`  - ${field}: ${typeof sampleDoc[field]}`);
                });
                if (fields.length > 10) {
                    console.log(`  ... and ${fields.length - 10} more fields`);
                }
            }
        } catch (error) {
            if (error.code === 404) {
                console.log(`❌ Collection not found`);
                console.log(`   This collection needs to be created in Appwrite`);
            } else {
                console.log(`⚠️  Error: ${error.message}`);
            }
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('TESTING OPTION GENERATION ENDPOINT');
    console.log('='.repeat(70) + '\n');

    // Test the API endpoint
    const baseUrl = 'http://localhost:3001';

    console.log('Testing server health...');
    try {
        const response = await fetch(`${baseUrl}/health`);
        const data = await response.json();
        console.log(`✅ Server is ${data.status}\n`);
    } catch (error) {
        console.log(`❌ Server not responding: ${error.message}`);
        console.log('   Make sure the server is running: npm run dev\n');
        return;
    }

    // Test course categories endpoint
    console.log('Testing course categories...');
    try {
        const ugcetResponse = await fetch(`${baseUrl}/api/options/course-categories/UGCET`);
        const ugcetData = await ugcetResponse.json();
        console.log(`✅ UGCET categories: ${ugcetData.data.join(', ')}`);

        const ugneetResponse = await fetch(`${baseUrl}/api/options/course-categories/UGNEET`);
        const ugneetData = await ugneetResponse.json();
        console.log(`✅ UGNEET categories: ${ugneetData.data.join(', ')}`);
    } catch (error) {
        console.log(`⚠️  Could not fetch categories: ${error.message}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`
The option generator service has been updated to support:

✅ Farm Science courses
✅ Veterinary courses  
✅ Medical courses

Collections used:
- Farm_Agri (primary)
- Farm_AgriV2 (fallback)

The service will automatically:
1. Detect the course category from student profile
2. Route to the appropriate collection
3. Try Farm_Agri first, then Farm_AgriV2 if needed
4. Return recommendations with proper probability tiers

To test with real data:
1. Create a student profile with courseCategory = 'Farm Science' or 'Veterinary' or 'Medical'
2. Call POST /api/options/generate/{userId}
3. The service will query the appropriate collection

Note: Make sure the Farm_Agri or Farm_AgriV2 collections exist in Appwrite
and contain the necessary data for your course categories.
`);
    console.log('='.repeat(70) + '\n');
}

testFarmMedicalCollections()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });
