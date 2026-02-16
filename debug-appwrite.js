const { Client, Databases } = require('node-appwrite');
const dns = require('node:dns');

// Force IPv4
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config();

console.log('--- Debug Appwrite ---');
console.log('Endpoint Env:', process.env.APPWRITE_ENDPOINT);
console.log('Project Env:', process.env.APPWRITE_PROJECT_ID);

const client = new Client();
// Explicitly use the one from env, or fallback to check
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
console.log('Using Endpoint:', endpoint);

client
    .setEndpoint(endpoint)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function test() {
    try {
        console.log('1. Testing "colleges" collection (public read?)...');
        await databases.listDocuments(
            process.env.APPWRITE_DATABASE_ID,
            'colleges',
            []
        );
        console.log('   [SUCCESS] "colleges" reachable.');

        console.log('2. Testing "student_profiles_v2" collection (auth required?)...');
        await databases.listDocuments(
            process.env.APPWRITE_DATABASE_ID,
            'student_profiles_v2',
            []
        );
        console.log('   [SUCCESS] "student_profiles_v2" reachable.');

    } catch (error) {
        console.error('   [FAILED]', error.message);
        if (error.response) console.error('   Response:', error.response);
    }
}

test();
