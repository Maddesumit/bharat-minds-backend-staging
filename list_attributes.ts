
import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);

async function listAttributes(collectionId: string) {
    try {
        const dbId = process.env.APPWRITE_DATABASE_ID;
        console.log(`Listing attributes for Collection ID: ${collectionId}`);
        const attributes = await databases.listAttributes(dbId!, collectionId);

        let output = `Attributes for ${collectionId}:\n`;
        attributes.attributes.forEach((a: any) => {
            output += `- Key: ${a.key}, Type: ${a.type}\n`;
        });

        fs.appendFileSync('collection_attributes.txt', output + '\n');
        console.log(`Attributes for ${collectionId} written to file.`);
    } catch (error: any) {
        console.error(`Error listing attributes for ${collectionId}:`, error.message);
        fs.appendFileSync('collection_attributes.txt', `Error for ${collectionId}: ${error.message}\n`);
    }
}

async function main() {
    fs.writeFileSync('collection_attributes.txt', ''); // Clear file
    await listAttributes('student_profiles_v2');
}

main();
