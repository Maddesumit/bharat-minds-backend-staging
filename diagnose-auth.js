/**
 * Comprehensive Appwrite Authentication Diagnostic Tool
 * JavaScript version for easier execution
 */

const dns = require('node:dns');
require('dotenv').config();
const { Client, Databases, Users } = require('node-appwrite');

// Configure DNS
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
    console.log('✅ DNS Resolution: Set to ipv4first\n');
}


async function runDiagnostics() {
    const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_PROJECT_ID || '';
    const apiKey = process.env.APPWRITE_API_KEY || '';
    const databaseId = process.env.APPWRITE_DATABASE_ID || '';

    console.log('\n' + '='.repeat(70));
    console.log('APPWRITE AUTHENTICATION DIAGNOSTIC TOOL');
    console.log('='.repeat(70) + '\n');

    // Step 1: Verify Environment Variables
    console.log('📋 Step 1: Environment Variables Check');
    console.log('-'.repeat(70));
    console.log(`Endpoint:     ${endpoint}`);
    console.log(`Project ID:   ${projectId}`);
    console.log(`Database ID:  ${databaseId}`);
    console.log(`API Key:      ${apiKey ? apiKey.substring(0, 40) + '...' : 'NOT SET'}`);
    console.log(`API Key Type: ${apiKey.startsWith('standard_') ? 'Standard (Server)' : apiKey.startsWith('project_') ? 'Project' : 'Unknown'}`);

    if (!endpoint || !projectId || !apiKey || !databaseId) {
        console.log('\n❌ ERROR: Missing required environment variables!');
        process.exit(1);
    }
    console.log('✅ All environment variables are set\n');

    // Step 2: Test Basic Connectivity
    console.log('🔌 Step 2: Testing Basic Connectivity');
    console.log('-'.repeat(70));

    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setKey(apiKey);

    const databases = new Databases(client);
    const users = new Users(client);

    // Test 2a: Health Check
    console.log('Testing /health endpoint...');
    try {
        const response = await fetch(`${endpoint}/health`, {
            headers: {
                'X-Appwrite-Project': projectId
            }
        });
        const data = await response.json();
        console.log(`✅ Health check: ${response.status} - ${data.status || 'OK'}`);
    } catch (error) {
        console.log(`❌ Health check failed: ${error.message}`);
    }

    // Step 3: Test API Key Permissions
    console.log('\n🔑 Step 3: Testing API Key Permissions');
    console.log('-'.repeat(70));

    // Test 3a: List Users (requires Users.read permission)
    console.log('Testing Users.read permission...');
    try {
        const result = await users.list();
        console.log(`✅ Users.read: SUCCESS - Found ${result.total} users`);
    } catch (error) {
        console.log(`❌ Users.read: FAILED - ${error.message}`);
        if (error.code === 401) {
            console.log('   → API key lacks Users.read permission');
        }
    }

    // Test 3b: List Databases (requires Databases.read permission)
    console.log('Testing Databases.read permission...');
    try {
        const response = await fetch(`${endpoint}/databases`, {
            headers: {
                'X-Appwrite-Project': projectId,
                'X-Appwrite-Key': apiKey
            }
        });
        const data = await response.json();

        if (response.status === 200) {
            console.log(`✅ Databases.read: SUCCESS - Found ${data.total} databases`);
            if (data.databases) {
                console.log('   Available databases:');
                data.databases.forEach((db) => {
                    console.log(`   - ${db.name} (${db.$id})`);
                });
            }
        } else {
            console.log(`❌ Databases.read: FAILED - Status ${response.status}`);
            console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
        }
    } catch (error) {
        console.log(`❌ Databases.read: FAILED - ${error.message}`);
    }

    // Step 4: Test Database Access
    console.log('\n💾 Step 4: Testing Database Access');
    console.log('-'.repeat(70));
    console.log(`Target Database: ${databaseId}`);

    // Test 4a: List Collections
    console.log('Listing collections in database...');
    try {
        const response = await fetch(`${endpoint}/databases/${databaseId}/collections`, {
            headers: {
                'X-Appwrite-Project': projectId,
                'X-Appwrite-Key': apiKey
            }
        });
        const data = await response.json();

        if (response.status === 200) {
            console.log(`✅ Collections.read: SUCCESS - Found ${data.total} collections`);
            if (data.collections) {
                console.log('   Available collections:');
                data.collections.forEach((col) => {
                    console.log(`   - ${col.name} (${col.$id})`);
                });
            }
        } else {
            console.log(`❌ Collections.read: FAILED - Status ${response.status}`);
            console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
            if (response.status === 404) {
                console.log(`   → Database '${databaseId}' not found!`);
            }
        }
    } catch (error) {
        console.log(`❌ Collections.read: FAILED - ${error.message}`);
    }

    // Step 5: Test Specific Collections
    console.log('\n📚 Step 5: Testing Specific Collections');
    console.log('-'.repeat(70));

    const collectionsToTest = [
        'student_profiles_v2',
        'historical_cutoffs',
        'farm_agri',
        'colleges'
    ];

    for (const collectionId of collectionsToTest) {
        console.log(`\nTesting collection: ${collectionId}`);
        try {
            const result = await databases.listDocuments(databaseId, collectionId, []);
            console.log(`✅ ${collectionId}: SUCCESS - ${result.total} documents`);
        } catch (error) {
            console.log(`❌ ${collectionId}: FAILED - ${error.message}`);
            if (error.code === 401) {
                console.log(`   → API key lacks permission to read this collection`);
            } else if (error.code === 404) {
                console.log(`   → Collection '${collectionId}' does not exist`);
            }
        }
    }

    // Step 6: Recommendations
    console.log('\n💡 Step 6: Recommendations');
    console.log('-'.repeat(70));

    console.log(`
Based on the test results above, here's what to check:

1. If you see 401 errors:
   → Go to Appwrite Console → Settings → API Keys
   → Verify your API key has these scopes:
     - databases.read
     - databases.write
     - collections.read
     - collections.write
     - documents.read
     - documents.write
     - users.read (optional, for user management)

2. If you see 404 errors for database:
   → Verify database ID '${databaseId}' exists in your project
   → Go to Appwrite Console → Databases
   → Check the database ID matches

3. If you see 404 errors for collections:
   → The collection doesn't exist in your database
   → You may need to run setup scripts to create collections
   → Check: src/scripts/setup-database.ts or similar

4. If collections exist but you can't read them:
   → Check collection-level permissions
   → Go to Appwrite Console → Database → Collection → Settings
   → Ensure API key has read/write permissions

5. To fix immediately:
   → Create a new API key with ALL permissions
   → Update .env file with the new key
   → Restart the server
`);

    console.log('='.repeat(70));
    console.log('DIAGNOSTIC COMPLETE');
    console.log('='.repeat(70) + '\n');
}

// Run the diagnostics
runDiagnostics()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Diagnostic failed:', error);
        process.exit(1);
    });
