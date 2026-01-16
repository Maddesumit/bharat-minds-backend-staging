/**
 * BHARAT MINDS - Appwrite Database Setup Script
 * 
 * This script programmatically creates all collections, attributes, and indexes
 * in Appwrite based on the schema definitions.
 * 
 * Usage: npx ts-node src/scripts/setup-database.ts
 */

import { Client, Databases } from 'node-appwrite';

// Index type literals for Appwrite SDK
type AppwriteIndexType = 'key' | 'unique' | 'fulltext';
import dotenv from 'dotenv';
import { AppwriteSchemas } from '../schemas/appwrite.schemas';

dotenv.config();

// Initialize Appwrite Client
const client = new Client();

client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'main_db';

// Helper to add delay between API calls (Appwrite rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// COLLECTION CREATION
// ============================================================================

async function createCollection(collectionId: string, collectionName: string): Promise<boolean> {
    try {
        await databases.createCollection(
            DATABASE_ID,
            collectionId,
            collectionName,
            [
                // Default permissions - can be customized per collection
                'read("any")',
                'create("users")',
                'update("users")',
                'delete("users")'
            ]
        );
        console.log(`✅ Created collection: ${collectionName} (${collectionId})`);
        return true;
    } catch (error: any) {
        if (error.code === 409) {
            console.log(`⏭️  Collection already exists: ${collectionName} (${collectionId})`);
            return true;
        }
        console.error(`❌ Failed to create collection ${collectionName}:`, error.message);
        return false;
    }
}

// ============================================================================
// ATTRIBUTE CREATION
// ============================================================================

async function createAttribute(
    collectionId: string,
    attribute: {
        key: string;
        type: string;
        size?: number;
        required?: boolean;
        default?: any;
        array?: boolean;
    }
): Promise<boolean> {
    try {
        const { key, type, size, required = false, default: defaultValue, array = false } = attribute;

        switch (type) {
            case 'string':
                await databases.createStringAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    size || 255,
                    required,
                    defaultValue,
                    array
                );
                break;

            case 'email':
                await databases.createEmailAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    required,
                    defaultValue,
                    array
                );
                break;

            case 'url':
                await databases.createUrlAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    required,
                    defaultValue,
                    array
                );
                break;

            case 'integer':
                await databases.createIntegerAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    required,
                    undefined, // min
                    undefined, // max
                    defaultValue,
                    array
                );
                break;

            case 'boolean':
                await databases.createBooleanAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    required,
                    defaultValue,
                    array
                );
                break;

            case 'datetime':
                await databases.createDatetimeAttribute(
                    DATABASE_ID,
                    collectionId,
                    key,
                    required,
                    defaultValue,
                    array
                );
                break;

            default:
                console.warn(`⚠️  Unknown attribute type: ${type} for ${key}`);
                return false;
        }

        console.log(`   ✅ Created attribute: ${key} (${type})`);
        return true;
    } catch (error: any) {
        if (error.code === 409) {
            console.log(`   ⏭️  Attribute already exists: ${attribute.key}`);
            return true;
        }
        console.error(`   ❌ Failed to create attribute ${attribute.key}:`, error.message);
        return false;
    }
}

// ============================================================================
// INDEX CREATION
// ============================================================================

async function createIndex(
    collectionId: string,
    index: {
        key: string;
        type: string;
        attributes: string[];
    }
): Promise<boolean> {
    try {
        const indexType = index.type as AppwriteIndexType;

        await databases.createIndex(
            DATABASE_ID,
            collectionId,
            index.key,
            indexType,
            index.attributes
        );

        console.log(`   ✅ Created index: ${index.key} (${index.type})`);
        return true;
    } catch (error: any) {
        if (error.code === 409) {
            console.log(`   ⏭️  Index already exists: ${index.key}`);
            return true;
        }
        console.error(`   ❌ Failed to create index ${index.key}:`, error.message);
        return false;
    }
}

// ============================================================================
// SETUP SINGLE COLLECTION
// ============================================================================

async function setupCollection(schema: {
    collectionId: string;
    collectionName: string;
    attributes: any[];
    indexes: any[];
}): Promise<boolean> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Setting up: ${schema.collectionName}`);
    console.log('='.repeat(60));

    // Step 1: Create collection
    const collectionCreated = await createCollection(schema.collectionId, schema.collectionName);
    if (!collectionCreated) return false;

    await delay(500); // Small delay after collection creation

    // Step 2: Create attributes
    console.log(`\n📝 Creating ${schema.attributes.length} attributes...`);
    for (const attr of schema.attributes) {
        await createAttribute(schema.collectionId, attr);
        await delay(300); // Delay between attribute creations
    }

    // Step 3: Wait for attributes to be available (they process async)
    console.log(`\n⏳ Waiting for attributes to be ready...`);
    await delay(3000);

    // Step 4: Create indexes
    console.log(`\n📊 Creating ${schema.indexes.length} indexes...`);
    for (const idx of schema.indexes) {
        await createIndex(schema.collectionId, idx);
        await delay(500); // Delay between index creations
    }

    console.log(`\n✅ Completed setup for: ${schema.collectionName}`);
    return true;
}

// ============================================================================
// MAIN SETUP FUNCTION
// ============================================================================

async function setupDatabase() {
    console.log('\n' + '='.repeat(60));
    console.log('BHARAT MINDS - Appwrite Database Setup');
    console.log('='.repeat(60));
    console.log(`\nEndpoint: ${process.env.APPWRITE_ENDPOINT}`);
    console.log(`Project ID: ${process.env.APPWRITE_PROJECT_ID}`);
    console.log(`Database ID: ${DATABASE_ID}`);
    console.log('');

    // Validate configuration
    if (!process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY) {
        console.error('❌ Missing required environment variables!');
        console.error('   Please set APPWRITE_PROJECT_ID and APPWRITE_API_KEY in .env');
        process.exit(1);
    }

    const schemas = [
        AppwriteSchemas.userProfiles,
        AppwriteSchemas.studentRanks,
        AppwriteSchemas.colleges,
        AppwriteSchemas.collegeCourses,
        AppwriteSchemas.userPreferences,
        AppwriteSchemas.cutoffData,
    ];

    let successCount = 0;
    let failCount = 0;

    for (const schema of schemas) {
        try {
            const success = await setupCollection(schema);
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            console.error(`❌ Failed to setup ${schema.collectionName}:`, error);
            failCount++;
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SETUP COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n✅ Successfully setup: ${successCount} collections`);
    if (failCount > 0) {
        console.log(`❌ Failed: ${failCount} collections`);
    }
    console.log('\nYour Appwrite database is ready to use!');
    console.log('');
}

// Run the setup
setupDatabase()
    .then(() => {
        console.log('Setup script finished.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
