
import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'main_db';

async function listCollections() {
    try {
        console.log(`Fetching collections for DB: ${databaseId}...`);
        const response = await databases.listCollections(databaseId);
        console.log('Found collections:');
        response.collections.forEach(col => {
            console.log(`- Name: "${col.name}" | ID: "${col.$id}"`);
        });
    } catch (error) {
        console.error('Error listing collections:', error);
    }
}

listCollections();
