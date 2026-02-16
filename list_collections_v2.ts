
import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);

async function listCollections() {
    try {
        const dbId = process.env.APPWRITE_DATABASE_ID;
        // console.log(`Listing collections for Database ID: ${dbId}`);
        const collections = await databases.listCollections(dbId!);

        let output = 'Available Collections:\n';
        collections.collections.forEach(c => {
            output += `- Name: ${c.name}, ID: ${c.$id}\n`;
        });

        fs.writeFileSync('collections_list_simple.txt', output);
        // console.log(output); 
    } catch (error: any) {
        fs.writeFileSync('collections_error.txt', error.toString());
    }
}

listCollections();
