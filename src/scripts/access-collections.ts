import { databases, config } from '../config/appwrite.config';
import { Query } from 'node-appwrite';

async function main() {
    console.log('Fetching colleges from Appwrite...');
    const docs = await databases.listDocuments(
        config.databaseId,
        config.collections.colleges,
        [Query.limit(5)] // just get 5 to see what fields exist
    );
    console.log(`\nTotal colleges in DB: ${docs.total}`);
    
    if (docs.documents.length > 0) {
        console.log('\nSample document fields (first college):');
        const sample = docs.documents[0] as any;
        console.log(JSON.stringify(sample, null, 2));
    } else {
        console.log('No documents found in colleges collection.');
    }
}

main().catch(console.error);
