/**
 * Simple Connection Diagnostic
 */

require('dotenv').config();

console.log('='.repeat(60));
console.log('Environment Variables Check');
console.log('='.repeat(60));
console.log('APPWRITE_ENDPOINT:', process.env.APPWRITE_ENDPOINT);
console.log('APPWRITE_PROJECT_ID:', process.env.APPWRITE_PROJECT_ID);
console.log('APPWRITE_DATABASE_ID:', process.env.APPWRITE_DATABASE_ID);
console.log('APPWRITE_API_KEY (first 30 chars):', process.env.APPWRITE_API_KEY?.substring(0, 30) + '...');
console.log('='.repeat(60));

// Test basic fetch to Appwrite
const https = require('https');

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;

console.log('\nTesting basic HTTPS connection to:', endpoint);

const url = new URL('/health', endpoint);

https.get(url.toString(), {
    headers: {
        'X-Appwrite-Project': projectId
    }
}, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response:', data);
        if (res.statusCode === 200) {
            console.log('\n✅ Connection successful!');
        } else {
            console.log('\n⚠️  Connection established but got status:', res.statusCode);
        }
    });
}).on('error', (err) => {
    console.error('❌ Connection failed:', err.message);
    console.error('Error code:', err.code);
});
