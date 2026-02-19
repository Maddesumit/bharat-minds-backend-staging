/**
 * Inspect Frontend Project
 * Checks collections in the 'Frontend' Appwrite project (6941...) to see if correct collections exist.
 */

const dns = require('node:dns');
const fs = require('fs');
const { Client, Databases } = require('node-appwrite');

// Configure DNS
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

async function inspectFrontendProject() {
    // Credentials for the FRONTEND project
    const endpoint = 'https://sgp.cloud.appwrite.io/v1';
    const projectId = '694160ab00190d61cdfe';
    const apiKey = 'standard_499f16907385983741f3920eeba029297be09ecd5ecf7bb48a43040258899310f49db04db2866e9739729a3d56defed8483ab79557d166bcbe9d0ede0a7498ba20418e72a8b7af24c014cae81bf8462de3c635078cef5f5e253c7b917fb39fee1053ba4ce5f5654024ed374a6c9b21cbc09d2fed9e8437b30eee913ed97f6d14';
    const databaseId = '694594f200315b6b7aa2';

    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    log('\n=== INSPECTING FRONTEND PROJECT APPWRITE ===\n');
    log(`Project ID: ${projectId}`);
    log(`Database ID: ${databaseId}`);

    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setKey(apiKey);

    const databases = new Databases(client);

    try {
        log('\nFetching collections from FRONTEND Project...');
        const response = await databases.listCollections(databaseId);

        log(`Found ${response.total} collections:`);

        response.collections.forEach(col => {
            log(`\n- Name: ${col.name}`);
            log(`  ID: ${col.$id}`);
            log(`  Created: ${col.$createdAt}`);
        });

    } catch (error) {
        log(`Error: ${error.message}`);
        if (error.code === 404) {
            log('Database or Project not found with these credentials.');
        }
    }

    fs.writeFileSync('frontend_inspection_result.txt', output);
    console.log('Written to frontend_inspection_result.txt');
}

inspectFrontendProject();
