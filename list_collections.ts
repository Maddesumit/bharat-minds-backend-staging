
import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);

async function listCollections() {
    try {
        const dbId = process.env.APPWRITE_DATABASE_ID;
        console.log(`Listing collections for Database ID: ${dbId}`);
        const collections = await databases.listCollections(dbId!);

        console.log('Available Collections:');
        collections.collections.forEach(c => {
            console.log(`- Name: ${c.name}, ID: ${c.$id}`);
        });
    } catch (error) {
        console.error('Error listing collections:', error);
    }
}

listCollections();
