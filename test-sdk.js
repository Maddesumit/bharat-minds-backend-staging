const { Client, Databases } = require('node-appwrite');
const dns = require('node:dns');

// Force IPv4
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('69646c40003dfe3257f7'); // Using ID from .env

console.log('Testing Appwrite connection via SDK...');

const databases = new Databases(client);

// Try to list documents from a collection we know exists or just list collections
// Or just check health if possible, but SDK doesn't have direct health check usually exposed conveniently.
// We'll try to get the project info if we had an API key, but we don't want to put the key in this script if we can help it,
// or we can read from process.env if we run with dotenv.

require('dotenv').config();

if (process.env.APPWRITE_API_KEY) {
    client.setKey(process.env.APPWRITE_API_KEY);
    console.log('API Key set.');
} else {
    console.log('No API Key found in env.');
}

async function test() {
    try {
        console.log('Making request...');
        const start = Date.now();
        // Just try to fetch something simple. 
        // If we don't have a valid collection ID handy without looking up, 
        // assume validationConnection logic: it prints config. 
        // We will try to list documents from 'colleges' which seems to exist based on file content.
        // Or better, just invalid call to see if we reach the server.

        // We will try to get the user prefs or something simple.
        // Actually, let's just use the databases.listDocuments with a known collection invalid or valid.
        // The error "fetch failed" is network level. Even 404 is a success for network.

        await databases.listDocuments(
            process.env.APPWRITE_DATABASE_ID || 'main_db',
            'colleges',
            []
        );
        console.log(`Success! Took ${Date.now() - start}ms`);
    } catch (error) {
        console.log(`Error! Took ${Date.now() - start}ms`);
        console.error(error);
        if (error.cause) {
            console.error('Cause:', error.cause);
        }
    }
}

test();
