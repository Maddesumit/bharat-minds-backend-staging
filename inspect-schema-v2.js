/**
 * Inspect Backend Schema
 */

const dns = require('node:dns');
const fs = require('fs');
require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

// Configure DNS
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

async function inspectSchema() {
    const endpoint = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    const databaseId = '696880f7002999b80fab'; // Specific backend DB ID

    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    log('\n=== INSPECTING SCHEMA ===\n');

    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setKey(apiKey);

    const databases = new Databases(client);

    // Potential collections that might house student data
    const collectionsToCheck = [
        'student_ranks',
        'student_profiles_v2', // Seems to be cutoff data or ranks
        'user_preferences',
        'farm_agri_v2'
    ];

    for (const collId of collectionsToCheck) {
        try {
            log(`\nFetching attributes for: ${collId}`);
            log('-'.repeat(40));

            const response = await databases.listAttributes(databaseId, collId);
            const attributes = response.attributes.map(attr => `${attr.key} (${attr.type})`);

            log(attributes.join('\n'));

            // Checking for specific fields from student.service.ts
            // student.service.ts uses: name, mobile, counsellingTypes, ugcetCourses etc.
            const hasName = response.attributes.some(a => a.key === 'name');
            const hasMobile = response.attributes.some(a => a.key === 'mobile');
            const hasCounselling = response.attributes.some(a => a.key === 'counsellingTypes');

            if (hasName && hasMobile) {
                log(`\n!!! MATCH FOUND: ${collId} seems to be a Student-related collection !!!`);
                if (hasCounselling) {
                    log(`!!! AND it has counsellingTypes !!!`);
                }
            }

        } catch (error) {
            log(`❌ Error fetching ${collId}: ${error.message}`);
        }
    }

    fs.writeFileSync('schema_inspection_output.txt', output);
    console.log('Output written to schema_inspection_output.txt');
}

inspectSchema();
