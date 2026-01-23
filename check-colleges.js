/**
 * Check Colleges Data
 * Quick script to view imported colleges
 */

const sdk = require('node-appwrite');
const dotenv = require('dotenv');

dotenv.config();

const client = new sdk.Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new sdk.Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || '';
const collegeCollectionId = process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges';

async function checkColleges() {
    console.log('='.repeat(80));
    console.log(' CHECKING COLLEGES DATA');
    console.log('='.repeat(80));

    try {
        const response = await databases.listDocuments(
            databaseId,
            collegeCollectionId
        );

        console.log(`\n Total Colleges: ${response.total}\n`);

        if (response.total === 0) {
            console.log(' No colleges found. Import may have failed.');
            console.log('\n💡 To import colleges, run:');
            console.log('   npx ts-node src/scripts/import-csv-data.ts\n');
            return;
        }

        // Show first 10 colleges
        console.log(' First 10 Colleges:\n');
        response.documents.slice(0, 10).forEach((college, index) => {
            console.log(`${index + 1}. ${college.collegeName}`);
            console.log(`   Code: ${college.collegeCode}`);
            console.log(`   City: ${college.city}`);
            console.log(`   Type: ${college.collegeType}`);
            console.log(`   Counselling: ${college.counsellingTypes || 'N/A'}`);
            console.log('');
        });

        // Group by city
        const cities = {};
        response.documents.forEach(doc => {
            const city = doc.city || 'Unknown';
            cities[city] = (cities[city] || 0) + 1;
        });

        console.log('='.repeat(80));
        console.log(' COLLEGES BY CITY');
        console.log('='.repeat(80));
        Object.entries(cities)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([city, count]) => {
                console.log(`${city}: ${count} colleges`);
            });

        // Group by type
        const types = {};
        response.documents.forEach(doc => {
            const type = doc.collegeType || 'Unknown';
            types[type] = (types[type] || 0) + 1;
        });

        console.log('\n' + '='.repeat(80));
        console.log(' COLLEGES BY TYPE');
        console.log('='.repeat(80));
        Object.entries(types).forEach(([type, count]) => {
            console.log(`${type}: ${count} colleges`);
        });

        console.log('\n' + '='.repeat(80));
        console.log(' Data check complete!');
        console.log('='.repeat(80));
        console.log(`\n💡 To view all data: https://cloud.appwrite.io/console\n`);

    } catch (error) {
        console.error('\n Error:', error.message);
        console.log('\n💡 Make sure:');
        console.log('   1. Server is running (npm run dev)');
        console.log('   2. Appwrite credentials are correct in .env');
        console.log('   3. Database and collection exist\n');
    }
}

checkColleges();
