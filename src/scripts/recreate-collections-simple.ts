/**
 * Recreate Appwrite Collections - Simple Standalone Script
 * 
 * This script recreates all collections that were deleted.
 * No external dependencies - all schemas defined inline.
 * 
 * Usage: npx ts-node src/scripts/recreate-collections-simple.ts
 */

import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'main_db';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

console.log('='.repeat(80));
console.log('RECREATE APPWRITE COLLECTIONS');
console.log('='.repeat(80));
console.log('\nConfiguration:');
console.log(`  Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
console.log(`  Project ID: ${process.env.APPWRITE_PROJECT_ID}`);
console.log(`  Database ID: ${DATABASE_ID}`);
console.log('');

async function recreateCollections() {
    const collections = [
        {
            id: 'colleges',
            name: 'Colleges',
            attributes: [
                { key: 'collegeCode', type: 'string', size: 50, required: true },
                { key: 'collegeName', type: 'string', size: 255, required: true },
                { key: 'city', type: 'string', size: 100, required: true },
                { key: 'district', type: 'string', size: 100 },
                { key: 'collegeType', type: 'string', size: 50, required: true },
                { key: 'counsellingTypes', type: 'string', size: 500 },
                { key: 'address', type: 'string', size: 500 },
                { key: 'website', type: 'string', size: 255 },
            ],
            indexes: [
                { key: 'city_idx', type: 'key', attributes: ['city'] },
                { key: 'type_idx', type: 'key', attributes: ['collegeType'] },
                { key: 'code_idx', type: 'unique', attributes: ['collegeCode'] },
            ]
        },
        {
            id: 'student_ranks',
            name: 'Student Ranks',
            attributes: [
                { key: 'userId', type: 'string', size: 50, required: true },
                { key: 'counsellingType', type: 'string', size: 20, required: true },
                { key: 'courseCategory', type: 'string', size: 50, required: true },
                { key: 'branch', type: 'string', size: 100 },
                { key: 'generalMeritRank', type: 'integer' },
                { key: 'categoryRank', type: 'integer' },
                { key: 'theoryRank', type: 'integer' },
                { key: 'practicalRank', type: 'integer' },
                { key: 'createdAt', type: 'string', size: 50, required: true },
                { key: 'updatedAt', type: 'string', size: 50 },
            ],
            indexes: [
                { key: 'userId_idx', type: 'key', attributes: ['userId'] },
                { key: 'category_idx', type: 'key', attributes: ['courseCategory'] },
            ]
        },
        {
            id: 'user_profiles',
            name: 'User Profiles',
            attributes: [
                { key: 'userId', type: 'string', size: 50, required: true },
                { key: 'firstName', type: 'string', size: 100, required: true },
                { key: 'lastName', type: 'string', size: 100, required: true },
                { key: 'email', type: 'email', required: true },
                { key: 'phone', type: 'string', size: 20 },
                { key: 'dateOfBirth', type: 'string', size: 20 },
                { key: 'category', type: 'string', size: 20 },
                { key: 'createdAt', type: 'string', size: 50, required: true },
            ],
            indexes: [
                { key: 'userId_idx', type: 'unique', attributes: ['userId'] },
                { key: 'email_idx', type: 'key', attributes: ['email'] },
            ]
        },
        {
            id: 'college_courses',
            name: 'College Courses',
            attributes: [
                { key: 'collegeId', type: 'string', size: 50, required: true },
                { key: 'courseCode', type: 'string', size: 50, required: true },
                { key: 'courseName', type: 'string', size: 255, required: true },
                { key: 'courseCategory', type: 'string', size: 50, required: true },
                { key: 'seats', type: 'integer' },
                { key: 'duration', type: 'integer' },
                { key: 'fees', type: 'integer' },
            ],
            indexes: [
                { key: 'college_idx', type: 'key', attributes: ['collegeId'] },
                { key: 'category_idx', type: 'key', attributes: ['courseCategory'] },
            ]
        },
        {
            id: 'user_preferences',
            name: 'User Preferences',
            attributes: [
                { key: 'userId', type: 'string', size: 50, required: true },
                { key: 'preferences', type: 'string', size: 10000 },
                { key: 'createdAt', type: 'string', size: 50 },
                { key: 'updatedAt', type: 'string', size: 50 },
            ],
            indexes: [
                { key: 'userId_idx', type: 'key', attributes: ['userId'] },
            ]
        },
        {
            id: 'cutoff_data',
            name: 'Cutoff Data',
            attributes: [
                { key: 'collegeCode', type: 'string', size: 50, required: true },
                { key: 'collegeName', type: 'string', size: 255, required: true },
                { key: 'courseCode', type: 'string', size: 50, required: true },
                { key: 'courseName', type: 'string', size: 255, required: true },
                { key: 'courseCategory', type: 'string', size: 50, required: true },
                { key: 'category', type: 'string', size: 10, required: true }, // GM, 2A, 2AK, etc.
                { key: 'counsellingType', type: 'string', size: 20, required: true },
                { key: 'cutoffRank', type: 'integer', required: true },
                { key: 'year', type: 'integer', required: true },
            ],
            indexes: [
                { key: 'category_idx', type: 'key', attributes: ['courseCategory'] },
                { key: 'rank_idx', type: 'key', attributes: ['cutoffRank'] },
                { key: 'year_idx', type: 'key', attributes: ['year'] },
                { key: 'cat_idx', type: 'key', attributes: ['category'] },
            ]
        },
    ];

    for (const coll of collections) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Creating: ${coll.name}`);
        console.log('='.repeat(60));

        // Create collection
        try {
            await databases.createCollection(
                DATABASE_ID,
                coll.id,
                coll.name,
                ['read("any")', 'create("users")', 'update("users")', 'delete("users")']
            );
            console.log(` Collection created: ${coll.id}`);
        } catch (error: any) {
            if (error.code === 409) {
                console.log(`⏭️  Collection already exists: ${coll.id}`);
            } else {
                console.error(` Error creating collection: ${error.message}`);
                continue;
            }
        }

        await delay(1000);

        // Create attributes
        console.log(`\nCreating ${coll.attributes.length} attributes...`);
        for (const attr of coll.attributes) {
            try {
                if (attr.type === 'string') {
                    await databases.createStringAttribute(
                        DATABASE_ID,
                        coll.id,
                        attr.key,
                        attr.size || 255,
                        attr.required || false
                    );
                } else if (attr.type === 'email') {
                    await databases.createEmailAttribute(
                        DATABASE_ID,
                        coll.id,
                        attr.key,
                        attr.required || false
                    );
                } else if (attr.type === 'integer') {
                    await databases.createIntegerAttribute(
                        DATABASE_ID,
                        coll.id,
                        attr.key,
                        attr.required || false
                    );
                }
                console.log(`    ${attr.key}`);
                await delay(300);
            } catch (error: any) {
                if (error.code === 409) {
                    console.log(`   ⏭️  ${attr.key} (exists)`);
                } else {
                    console.log(`    ${attr.key}: ${error.message}`);
                }
            }
        }

        // Wait for attributes to be ready
        console.log('\n⏳ Waiting for attributes...');
        await delay(5000);

        // Create indexes
        console.log(`\nCreating ${coll.indexes.length} indexes...`);
        for (const idx of coll.indexes) {
            try {
                await databases.createIndex(
                    DATABASE_ID,
                    coll.id,
                    idx.key,
                    idx.type as any,
                    idx.attributes
                );
                console.log(`    ${idx.key}`);
                await delay(500);
            } catch (error: any) {
                if (error.code === 409) {
                    console.log(`   ⏭️  ${idx.key} (exists)`);
                } else {
                    console.log(`    ${idx.key}: ${error.message}`);
                }
            }
        }

        console.log(`\n Completed: ${coll.name}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(' ALL COLLECTIONS RECREATED!');
    console.log('='.repeat(80));
    console.log('\n💡 Next steps:');
    console.log('   1. Verify collections in Appwrite Console');
    console.log('   2. Test with: node src/scripts/db-methods-guide.js');
    console.log('   3. Start adding data to your collections');
    console.log('');
}

recreateCollections()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('\n Fatal error:', error.message);
        process.exit(1);
    });
