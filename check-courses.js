/**
 * Check Courses Data (JavaScript)
 * Quick script to view imported courses
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
const courseCollectionId = process.env.APPWRITE_COLLEGE_COURSES_COLLECTION_ID || 'college_courses';

async function checkCourses() {
    console.log('='.repeat(80));
    console.log(' CHECKING COURSES DATA');
    console.log('='.repeat(80));

    try {
        const response = await databases.listDocuments(
            databaseId,
            courseCollectionId
        );

        console.log(`\n Total Courses: ${response.total}\n`);

        if (response.total === 0) {
            console.log(' No courses found. Import may have failed.');
            return;
        }

        // Show first 10 courses
        console.log(' First 10 Courses:\n');
        response.documents.slice(0, 10).forEach((course, index) => {
            console.log(`${index + 1}. ${course.courseName}`);
            console.log(`   Code: ${course.courseCode}`);
            console.log(`   Category: ${course.courseCategory}`);
            console.log(`   Seats: ${course.seats || 'N/A'}`);
            console.log(`   College ID: ${course.collegeId}`);
            console.log('');
        });

        // Group by category
        const categories = {};
        response.documents.forEach(doc => {
            const cat = doc.courseCategory || 'Unknown';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        console.log('='.repeat(80));
        console.log(' COURSES BY CATEGORY');
        console.log('='.repeat(80));
        Object.entries(categories).forEach(([category, count]) => {
            console.log(`${category}: ${count} courses`);
        });

        // Show some sample course codes
        console.log('\n' + '='.repeat(80));
        console.log('📝 SAMPLE COURSE CODES');
        console.log('='.repeat(80));
        const uniqueCodes = [...new Set(response.documents.map(d => d.courseCode))].slice(0, 15);
        console.log(uniqueCodes.join(', '));

        console.log('\n' + '='.repeat(80));
        console.log(' Data check complete!');
        console.log('='.repeat(80));
        console.log(`\n💡 To view all data: https://cloud.appwrite.io/console\n`);

    } catch (error) {
        console.error('\n Error:', error.message);
    }
}

checkCourses();
