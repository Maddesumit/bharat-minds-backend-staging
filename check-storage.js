/**
 * Check Storage Buckets
 */

const dns = require('node:dns');
require('dotenv').config();
const { Client, Storage } = require('node-appwrite');

// Configure DNS
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

async function checkStorage() {
    const endpoint = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;

    console.log('\n=== CHECKING STORAGE BUCKETS ===\n');

    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setKey(apiKey);

    const storage = new Storage(client);

    try {
        const result = await storage.listBuckets();
        console.log(`Found ${result.total} buckets:`);
        result.buckets.forEach(b => {
            console.log(`- ${b.name} (ID: ${b.$id})`);
        });

        if (result.total === 0) {
            console.log('\nCreating "pdfs" bucket...');
            try {
                const bucket = await storage.createBucket('pdfs_v3', 'PDFs', ['read("any")', 'create("any")'], false, true, undefined, ['pdf']);
                console.log(`Created bucket: ${bucket.name} (ID: ${bucket.$id})`);
            } catch (createError) {
                console.log(`Failed to create bucket: ${createError.message}`);
                // Try to create with minimal args if permissions fail
                try {
                    const bucket = await storage.createBucket('pdfs_v3', 'PDFs');
                    console.log(`Created bucket (minimal): ${bucket.name} (ID: ${bucket.$id})`);
                } catch (retryError) {
                    console.log(`Retry failed: ${retryError.message}`);
                }
            }
        }

    } catch (error) {
        console.log(`Error checking storage: ${error.message}`);
    }
}

checkStorage();
