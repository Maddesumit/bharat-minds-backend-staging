/**
 * Fix Missing Course Category Script
 * 
 * This script updates all student profiles in the database to add the courseCategory field
 * if it's missing. This fixes the issue where Veterinary/Medical/Farm Science selections
 * were showing Engineering colleges.
 * 
 * Usage: npx ts-node fix-missing-course-category.ts
 */

import { databases, config } from './src/config/appwrite.config';
import { Query } from 'node-appwrite';

interface StudentProfile {
    $id: string;
    userId: string;
    courseCategory?: string;
    generalMeritRank?: number;
    theoryRank?: number;
    practicalRank?: number;
    baseCategory?: string;
}

async function fixMissingCourseCategory() {
    console.log('🔧 Starting Course Category Fix Script\n');
    console.log('='.repeat(60));

    try {
        // Fetch all student profiles
        console.log('\n📥 Fetching all student profiles...');
        const response = await databases.listDocuments(
            config.databaseId,
            'student_profiles_v2',
            [Query.limit(1000)] // Adjust if you have more than 1000 profiles
        );

        const profiles = response.documents as unknown as StudentProfile[];
        console.log(`✅ Found ${profiles.length} student profiles\n`);

        if (profiles.length === 0) {
            console.log('ℹ️  No profiles found. Nothing to fix.');
            return;
        }

        // Analyze profiles
        const missingCourseCategory = profiles.filter(p => !p.courseCategory);
        const hasCourseCategory = profiles.filter(p => p.courseCategory);

        console.log('📊 Analysis:');
        console.log(`   Profiles WITH courseCategory: ${hasCourseCategory.length}`);
        console.log(`   Profiles WITHOUT courseCategory: ${missingCourseCategory.length}\n`);

        if (missingCourseCategory.length === 0) {
            console.log('✅ All profiles already have courseCategory. Nothing to fix!');
            return;
        }

        // Show profiles that need fixing
        console.log('🔍 Profiles that need fixing:\n');
        missingCourseCategory.forEach((profile, index) => {
            console.log(`${index + 1}. User ID: ${profile.userId}`);
            console.log(`   Profile ID: ${profile.$id}`);
            console.log(`   Base Category: ${profile.baseCategory || 'Not set'}`);
            console.log(`   Ranks: GM=${profile.generalMeritRank || 'N/A'}, Theory=${profile.theoryRank || 'N/A'}, Practical=${profile.practicalRank || 'N/A'}`);
            console.log('');
        });

        // Ask for confirmation (in a real scenario, you'd use readline or similar)
        console.log('='.repeat(60));
        console.log('⚠️  IMPORTANT: This script will update profiles as follows:');
        console.log('   - If theoryRank OR practicalRank exists → Set to "Farm Science"');
        console.log('   - Otherwise → Set to "Engineering" (default)');
        console.log('');
        console.log('   You can manually change these later in Appwrite Console.');
        console.log('='.repeat(60));
        console.log('\n🚀 Proceeding with updates...\n');

        // Update profiles
        let successCount = 0;
        let errorCount = 0;

        for (const profile of missingCourseCategory) {
            try {
                // Determine courseCategory based on available ranks
                let courseCategory = 'Engineering'; // Default

                // If they have theory/practical ranks, likely Farm Science/Veterinary
                if (profile.theoryRank || profile.practicalRank) {
                    courseCategory = 'Farm Science'; // You can change this logic
                }

                console.log(`Updating ${profile.userId}...`);
                await databases.updateDocument(
                    config.databaseId,
                    'student_profiles_v2',
                    profile.$id,
                    {
                        courseCategory: courseCategory
                    }
                );

                console.log(`   ✅ Set courseCategory to "${courseCategory}"`);
                successCount++;

            } catch (error: any) {
                console.error(`   ❌ Failed: ${error.message}`);
                errorCount++;
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Update Summary:');
        console.log(`   ✅ Successfully updated: ${successCount}`);
        console.log(`   ❌ Failed: ${errorCount}`);
        console.log('='.repeat(60));

        if (successCount > 0) {
            console.log('\n✨ Success! All profiles have been updated.');
            console.log('\n📝 Next Steps:');
            console.log('   1. If any profile has the wrong courseCategory, update it manually in Appwrite Console');
            console.log('   2. Go to: https://cloud.appwrite.io/console');
            console.log('   3. Navigate to: Databases → student_profiles_v2');
            console.log('   4. Find the user and edit the courseCategory field');
            console.log('');
            console.log('   Valid values: "Engineering", "Veterinary", "Medical", "Farm Science"');
        }

    } catch (error: any) {
        console.error('\n❌ Script failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the script
console.log('\n🎯 Course Category Fix Script');
console.log('This script will add missing courseCategory fields to student profiles\n');

fixMissingCourseCategory()
    .then(() => {
        console.log('\n✅ Script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
