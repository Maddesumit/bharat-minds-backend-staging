/**
 * Add courseCategory Attribute to student_profiles_v2 Collection
 * 
 * This script adds the missing 'courseCategory' attribute to the Appwrite database
 * 
 * Usage: npx ts-node add-course-category-attribute.ts
 */

import { databases, config } from './src/config/appwrite.config';

async function addCourseCategoryAttribute() {
    console.log('\n🔧 Adding courseCategory attribute to student_profiles_v2 collection\n');
    console.log('='.repeat(60));

    try {
        // Add the courseCategory attribute
        console.log('\n📝 Creating attribute: courseCategory');
        console.log('   Type: String');
        console.log('   Size: 50');
        console.log('   Required: No');
        console.log('   Default: null\n');

        await databases.createStringAttribute(
            config.databaseId,
            'student_profiles_v2',
            'courseCategory',
            50,           // size
            false,        // required
            undefined,    // default value
            false         // array
        );

        console.log('✅ Attribute created successfully!');
        console.log('\n⏳ Note: Appwrite may take a few seconds to process this change.');
        console.log('   Wait about 10-15 seconds before using the app.\n');

        console.log('='.repeat(60));
        console.log('\n✨ Success! The courseCategory attribute has been added.');
        console.log('\n📝 Next Steps:');
        console.log('   1. Wait 10-15 seconds for Appwrite to process');
        console.log('   2. Go to your app at http://localhost:3000');
        console.log('   3. Select "Veterinary" and generate options');
        console.log('   4. You should now see Veterinary colleges!\n');

    } catch (error: any) {
        if (error.code === 409) {
            console.log('ℹ️  Attribute already exists! No action needed.');
            console.log('\n✅ You can proceed to use the app.\n');
        } else {
            console.error('\n❌ Error:', error.message);
            console.error('\n💡 You may need to add the attribute manually:');
            console.error('   1. Go to https://cloud.appwrite.io/console');
            console.error('   2. Navigate to Databases → student_profiles_v2 → Attributes');
            console.error('   3. Click "+ Create Attribute"');
            console.error('   4. Select "String"');
            console.error('   5. Set Key: courseCategory, Size: 50, Required: No');
            console.error('   6. Click "Create"\n');
        }
    }
}

// Run the script
addCourseCategoryAttribute()
    .then(() => {
        console.log('✅ Script completed!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
