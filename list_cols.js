const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

async function list() {
    try {
        const response = await databases.listCollections(databaseId);
        console.log('COLLECTIONS_LIST_START');
        response.collections.forEach(col => {
            console.log(`|${col.name}|${col.$id}|`);
        });
        console.log('COLLECTIONS_LIST_END');
    } catch (e) {
        console.error(e.message);
    }
}
list();
