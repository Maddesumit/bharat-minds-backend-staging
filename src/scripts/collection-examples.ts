/**
 * Practical Examples: Accessing Collections
 * 
 * Copy any of these examples to test collection access
 */

import { databases, config } from '../config/appwrite.config';
import { ID, Query } from 'node-appwrite';

// ================================================================================
// EXAMPLE 1: List all colleges
// ================================================================================
export async function example1_ListColleges() {
    console.log('\n📋 Example 1: List All Colleges\n');

    try {
        const response = await databases.listDocuments(
            config.databaseId,
            config.collections.colleges,
            [Query.limit(10)]  // Limit to 10 for demo
        );

        console.log(`Total Colleges: ${response.total}`);
        console.log(`Showing first ${response.documents.length} colleges:\n`);

        response.documents.forEach((doc: any, index) => {
            console.log(`${index + 1}. ${doc.collegeName || 'N/A'}`);
            console.log(`   Code: ${doc.collegeCode || 'N/A'}`);
            console.log(`   City: ${doc.city || 'N/A'}`);
            console.log(`   Type: ${doc.collegeType || 'N/A'}\n`);
        });

        return response.documents;
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        return [];
    }
}

// ================================================================================
// EXAMPLE 2: Search colleges by city
// ================================================================================
export async function example2_SearchByCity(city: string) {
    console.log(`\n🔍 Example 2: Search Colleges in ${city}\n`);

    try {
        const response = await databases.listDocuments(
            config.databaseId,
            config.collections.colleges,
            [Query.equal('city', city)]
        );

        console.log(`Found ${response.total} colleges in ${city}:\n`);

        response.documents.forEach((doc: any, index) => {
            console.log(`${index + 1}. ${doc.collegeName}`);
        });

        return response.documents;
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        return [];
    }
}

// ================================================================================
// EXAMPLE 3: Get student ranks for a user
// ================================================================================
export async function example3_GetStudentRanks(userId: string) {
    console.log(`\n📊 Example 3: Get Ranks for User ${userId}\n`);

    try {
        const response = await databases.listDocuments(
            config.databaseId,
            config.collections.studentRanks,
            [Query.equal('userId', userId)]
        );

        console.log(`User has ${response.total} rank entries:\n`);

        response.documents.forEach((doc: any, index) => {
            console.log(`${index + 1}. ${doc.courseCategory || 'N/A'}`);
            console.log(`   Counselling Type: ${doc.counsellingType || 'N/A'}`);
            if (doc.generalMeritRank) {
                console.log(`   Rank: ${doc.generalMeritRank}`);
            }
            if (doc.theoryRank && doc.practicalRank) {
                console.log(`   Theory Rank: ${doc.theoryRank}`);
                console.log(`   Practical Rank: ${doc.practicalRank}`);
            }
            console.log('');
        });

        return response.documents;
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        return [];
    }
}

// ================================================================================
// EXAMPLE 4: Create a new student rank entry
// ================================================================================
export async function example4_CreateRank(rankData: {
    userId: string;
    counsellingType: string;
    courseCategory: string;
    generalMeritRank?: number;
    theoryRank?: number;
    practicalRank?: number;
}) {
    console.log('\n➕ Example 4: Create New Rank Entry\n');

    try {
        const document = await databases.createDocument(
            config.databaseId,
            config.collections.studentRanks,
            ID.unique(),
            {
                ...rankData,
                createdAt: new Date().toISOString()
            }
        );

        console.log('✅ Rank created successfully!');
        console.log(`   Document ID: ${document.$id}`);
        console.log(`   User: ${rankData.userId}`);
        console.log(`   Course: ${rankData.courseCategory}`);

        return document;
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

// ================================================================================
// EXAMPLE 5: Get cutoff data for a rank
// ================================================================================
export async function example5_GetCutoffData(courseCategory: string, maxRank: number) {
    console.log(`\n🎯 Example 5: Get Cutoffs for ${courseCategory} (Rank <= ${maxRank})\n`);

    try {
        const response = await databases.listDocuments(
            config.databaseId,
            config.collections.cutoffData,
            [
                Query.equal('courseCategory', courseCategory),
                Query.lessThanEqual('cutoffRank', maxRank),
                Query.orderAsc('cutoffRank'),
                Query.limit(10)
            ]
        );

        console.log(`Found ${response.total} matching colleges:\n`);

        response.documents.forEach((doc: any, index) => {
            console.log(`${index + 1}. ${doc.collegeName || 'N/A'}`);
            console.log(`   Course: ${doc.courseName || 'N/A'}`);
            console.log(`   Cutoff Rank: ${doc.cutoffRank || 'N/A'}`);
            console.log('');
        });

        return response.documents;
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        return [];
    }
}

// ================================================================================
// EXAMPLE 6: Get all cities (unique)
// ================================================================================
export async function example6_GetAllCities() {
    console.log('\n🌆 Example 6: Get All Cities\n');

    try {
        const response = await databases.listDocuments(
            config.databaseId,
            config.collections.colleges
        );

        const cities = [...new Set(response.documents.map((doc: any) => doc.city))];
        cities.sort();

        console.log(`Total unique cities: ${cities.length}\n`);
        console.log(cities.join(', '));
        console.log('');

        return cities;
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        return [];
    }
}

// ================================================================================
// EXAMPLE 7: Count documents in each collection
// ================================================================================
export async function example7_CountAllCollections() {
    console.log('\n📊 Example 7: Count Documents in All Collections\n');

    const collections = {
        'User Profiles': config.collections.userProfiles,
        'Student Ranks': config.collections.studentRanks,
        'Colleges': config.collections.colleges,
        'College Courses': config.collections.collegeCourses,
        'User Preferences': config.collections.userPreferences,
        'Cutoff Data': config.collections.cutoffData,
        'Option Lists': config.collections.optionLists,
    };

    for (const [name, collectionId] of Object.entries(collections)) {
        try {
            const response = await databases.listDocuments(
                config.databaseId,
                collectionId,
                [Query.limit(1)]
            );
            console.log(`${name.padEnd(20)}: ${response.total} documents`);
        } catch (error: any) {
            console.log(`${name.padEnd(20)}: ERROR - ${error.message}`);
        }
    }
    console.log('');
}

// ================================================================================
// RUN EXAMPLES
// ================================================================================

async function main() {
    console.log('='.repeat(60));
    console.log('BHARAT MINDS - Collection Access Examples');
    console.log('='.repeat(60));

    // Run the examples you want to test
    // Comment/uncomment as needed

    await example7_CountAllCollections();
    // await example1_ListColleges();
    // await example2_SearchByCity('Bangalore');
    // await example3_GetStudentRanks('user123');
    // await example6_GetAllCities();

    // Example: Create a rank (uncomment to test)
    /*
    await example4_CreateRank({
        userId: 'test_user_123',
        counsellingType: 'UGCET',
        courseCategory: 'Engineering',
        generalMeritRank: 12345
    });
    */

    // Example: Get cutoff data (uncomment to test)
    /*
    await example5_GetCutoffData('Engineering', 15000);
    */
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}
