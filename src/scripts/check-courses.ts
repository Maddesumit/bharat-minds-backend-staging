/**
 * Check Courses Data
 * Quick script to view imported courses
 * 
 * Usage: npx ts-node src/scripts/check-courses.ts
 */

import { databases, config } from '../config/appwrite.config';

async function checkCourses() {
    console.log('='.repeat(80));
    console.log(' CHECKING COURSES DATA');
    console.log('='.repeat(80));

    try {
        // Get all courses
        const response = await databases.listDocuments(
            config.databaseId,
            config.collections.collegeCourses
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
        const categories: Record<string, number> = {};
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

        console.log('\n' + '='.repeat(80));
        console.log(' Data check complete!');
        console.log('='.repeat(80));

    } catch (error: any) {
        console.error('\n Error:', error.message);
    }
}

checkCourses();
