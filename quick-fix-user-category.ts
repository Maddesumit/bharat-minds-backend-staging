/**
 * Quick Fix: Update Specific User's Course Category
 * 
 * This script updates a specific user's courseCategory to Veterinary/Medical/Farm Science
 * 
 * Usage: npx ts-node quick-fix-user-category.ts <userId> <courseCategory>
 * Example: npx ts-node quick-fix-user-category.ts user123 Veterinary
 */

import { databases, config } from './src/config/appwrite.config';
import { Query } from 'node-appwrite';

const userId = process.argv[2] || 'user123';
const courseCategory = process.argv[3] || 'Veterinary';

async function updateUserCategory() {
    console.log(`\n🔧 Updating user: ${userId}`);
    console.log(`📚 Setting courseCategory to: ${courseCategory}\n`);

    try {
        // Find the user's profile
        const response = await databases.listDocuments(
            config.databaseId,
            'student_profiles_v2',
            [Query.equal('userId', userId)]
        );

        if (response.documents.length === 0) {
            console.log(`❌ No profile found for userId: ${userId}`);
            console.log('\n💡 Available options:');
            console.log('   1. Make sure the user exists');
            console.log('   2. Check the userId is correct');
            console.log('   3. Or create a new profile by using the app\n');
            return;
        }

        const profile = response.documents[0];
        console.log(`✅ Found profile: ${profile.$id}`);
        console.log(`   Current courseCategory: ${profile.courseCategory || 'NOT SET'}`);

        // Update the profile
        await databases.updateDocument(
            config.databaseId,
            'student_profiles_v2',
            profile.$id,
            {
                courseCategory: courseCategory
            }
        );

        console.log(`\n✅ Successfully updated courseCategory to: ${courseCategory}`);
        console.log('\n🎉 Done! Now try generating options again in the app.\n');

    } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}\n`);
    }
}

updateUserCategory();
