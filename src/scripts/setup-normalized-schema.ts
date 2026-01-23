/**
 * Setup Normalized Schema for Career Counseling
 * 
 * This script creates all collections for the scalable architecture
 * Run: npx ts-node src/scripts/setup-normalized-schema.ts
 */

import { Client, Databases, ID, IndexType } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'main_db';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function createCollectionSafe(
    collectionId: string,
    collectionName: string,
    permissions: string[] = []
) {
    try {
        console.log(`\n📦 Creating collection: ${collectionName}...`);

        const collection = await databases.createCollection(
            databaseId,
            collectionId,
            collectionName,
            permissions
        );

        console.log(` Created: ${collectionName}`);
        return collection;
    } catch (error: any) {
        if (error.code === 409) {
            console.log(`⚠️  Collection already exists: ${collectionName}`);
            return null;
        }
        console.error(` Error creating ${collectionName}:`, error.message);
        throw error;
    }
}

async function createAttributeSafe(
    collectionId: string,
    attributeKey: string,
    type: 'string' | 'integer' | 'boolean' | 'datetime' | 'email',
    size: number | undefined,
    required: boolean,
    defaultValue?: any,
    array: boolean = false
) {
    try {
        let attribute;

        // Appwrite doesn't allow default values on required attributes  
        const useDefault = required ? undefined : defaultValue;

        switch (type) {
            case 'string':
            case 'email':
                attribute = await databases.createStringAttribute(
                    databaseId,
                    collectionId,
                    attributeKey,
                    size || 255,
                    required,
                    useDefault,
                    array
                );
                break;

            case 'integer':
                attribute = await databases.createIntegerAttribute(
                    databaseId,
                    collectionId,
                    attributeKey,
                    required,
                    undefined,
                    undefined,
                    useDefault,
                    array
                );
                break;

            case 'boolean':
                attribute = await databases.createBooleanAttribute(
                    databaseId,
                    collectionId,
                    attributeKey,
                    required,
                    useDefault,
                    array
                );
                break;

            case 'datetime':
                attribute = await databases.createDatetimeAttribute(
                    databaseId,
                    collectionId,
                    attributeKey,
                    required,
                    useDefault,
                    array
                );
                break;
        }

        console.log(`  ✓ ${attributeKey} (${type}${array ? '[]' : ''})`);
        return attribute;
    } catch (error: any) {
        if (error.code === 409) {
            console.log(`  ⚠️  Attribute exists: ${attributeKey}`);
            return null;
        }
        console.error(`   Error creating ${attributeKey}:`, error.message);
        throw error;
    }
}

async function createIndexSafe(
    collectionId: string,
    key: string,
    type: IndexType,
    attributes: string[],
    orders: string[] = []
) {
    try {
        const index = await databases.createIndex(
            databaseId,
            collectionId,
            key,
            type,
            attributes,
            orders.length > 0 ? orders : undefined
        );

        console.log(`  🔍 Index: ${key} on [${attributes.join(', ')}]`);
        return index;
    } catch (error: any) {
        if (error.code === 409) {
            console.log(`  ⚠️  Index exists: ${key}`);
            return null;
        }
        console.error(`   Error creating index ${key}:`, error.message);
        throw error;
    }
}

// ============================================================================
// COLLECTION SETUP FUNCTIONS
// ============================================================================

async function setupUsers() {
    const collectionId = 'users';

    await createCollectionSafe(collectionId, 'Users');

    // Wait for collection to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Attributes
    await createAttributeSafe(collectionId, 'userId', 'string', 50, true);
    await createAttributeSafe(collectionId, 'email', 'email', 255, true);
    await createAttributeSafe(collectionId, 'phone', 'string', 15, false);
    await createAttributeSafe(collectionId, 'name', 'string', 255, true);
    await createAttributeSafe(collectionId, 'counsellingType', 'string', 20, true);
    await createAttributeSafe(collectionId, 'academicYear', 'integer', undefined, true);
    await createAttributeSafe(collectionId, 'isActive', 'boolean', undefined, true, true);
    await createAttributeSafe(collectionId, 'isVerified', 'boolean', undefined, true, false);
    await createAttributeSafe(collectionId, 'createdAt', 'string', 50, true);
    await createAttributeSafe(collectionId, 'updatedAt', 'string', 50, true);
    await createAttributeSafe(collectionId, 'lastLoginAt', 'string', 50, false);

    // Wait before creating indexes
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Indexes
    await createIndexSafe(collectionId, 'userId_unique', IndexType.Unique, ['userId']);
    await createIndexSafe(collectionId, 'email_unique', IndexType.Unique, ['email']);
    await createIndexSafe(collectionId, 'counsellingType_idx', IndexType.Key, ['counsellingType']);
    await createIndexSafe(collectionId, 'academicYear_idx', IndexType.Key, ['academicYear']);
}

async function setupStudentProfiles() {
    const collectionId = 'student_profiles_v2';

    await createCollectionSafe(collectionId, 'Student Profiles V2');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Attributes
    await createAttributeSafe(collectionId, 'userId', 'string', 50, true);
    await createAttributeSafe(collectionId, 'generalMeritRank', 'integer', undefined, true);
    await createAttributeSafe(collectionId, 'theoryRank', 'integer', undefined, false);
    await createAttributeSafe(collectionId, 'practicalRank', 'integer', undefined, false);

    await createAttributeSafe(collectionId, 'baseCategory', 'string', 10, true);
    await createAttributeSafe(collectionId, 'reservationKannada', 'boolean', undefined, false, false);
    await createAttributeSafe(collectionId, 'reservationRural', 'boolean', undefined, false, false);
    await createAttributeSafe(collectionId, 'reservationHK', 'boolean', undefined, false, false);

    await createAttributeSafe(collectionId, 'ncc', 'boolean', undefined, false, false);
    await createAttributeSafe(collectionId, 'spo', 'boolean', undefined, false, false);
    await createAttributeSafe(collectionId, 'def', 'boolean', undefined, false, false);
    await createAttributeSafe(collectionId, 'ph', 'boolean', undefined, false, false);

    await createAttributeSafe(collectionId, 'snqEligible', 'boolean', undefined, false, false);
    await createAttributeSafe(collectionId, 'snqSlab', 'string', 10, false);

    await createAttributeSafe(collectionId, 'eligibleCategories', 'string', 50, false, undefined, true);
    await createAttributeSafe(collectionId, 'rankRange', 'string', 20, true);

    await createAttributeSafe(collectionId, 'createdAt', 'string', 50, true);
    await createAttributeSafe(collectionId, 'updatedAt', 'string', 50, true);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Indexes
    await createIndexSafe(collectionId, 'userId_unique', IndexType.Unique, ['userId']);
    await createIndexSafe(collectionId, 'rank_idx', IndexType.Key, ['generalMeritRank']);
    await createIndexSafe(collectionId, 'category_idx', IndexType.Key, ['baseCategory']);
    await createIndexSafe(collectionId, 'rankRange_idx', IndexType.Key, ['rankRange']);
}

async function setupStudentPreferences() {
    const collectionId = 'student_preferences_v2';

    await createCollectionSafe(collectionId, 'Student Preferences V2 (Normalized)');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Attributes - Identity
    await createAttributeSafe(collectionId, 'userId', 'string', 50, true);
    await createAttributeSafe(collectionId, 'preferenceRank', 'integer', undefined, true);

    // College & Course
    await createAttributeSafe(collectionId, 'collegeId', 'string', 50, true);
    await createAttributeSafe(collectionId, 'collegeCode', 'string', 20, true);
    await createAttributeSafe(collectionId, 'collegeName', 'string', 255, true);

    await createAttributeSafe(collectionId, 'branchId', 'string', 50, true);
    await createAttributeSafe(collectionId, 'branchCode', 'string', 20, true);
    await createAttributeSafe(collectionId, 'branchName', 'string', 255, true);

    // Filters
    await createAttributeSafe(collectionId, 'seatType', 'string', 5, true);
    await createAttributeSafe(collectionId, 'category', 'string', 20, true);
    await createAttributeSafe(collectionId, 'location', 'string', 100, true);

    // Eligibility & Probability
    await createAttributeSafe(collectionId, 'isEligible', 'boolean', undefined, true, true);
    await createAttributeSafe(collectionId, 'eligibilityScore', 'integer', undefined, false, 0);
    await createAttributeSafe(collectionId, 'probabilityScore', 'integer', undefined, false, 0);
    await createAttributeSafe(collectionId, 'probabilityCategory', 'string', 20, false);

    // Metadata
    await createAttributeSafe(collectionId, 'counsellingType', 'string', 20, true);
    await createAttributeSafe(collectionId, 'academicYear', 'integer', undefined, true);
    await createAttributeSafe(collectionId, 'isLocked', 'boolean', undefined, true, false);

    await createAttributeSafe(collectionId, 'createdAt', 'string', 50, true);
    await createAttributeSafe(collectionId, 'updatedAt', 'string', 50, true);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Indexes - CRITICAL for performance
    await createIndexSafe(collectionId, 'userId_rank', IndexType.Key, ['userId', 'preferenceRank']);
    await createIndexSafe(collectionId, 'userId_counselling', IndexType.Key, ['userId', 'counsellingType']);
    await createIndexSafe(collectionId, 'college_branch_seat', IndexType.Key, ['collegeCode', 'branchCode', 'seatType']);
    await createIndexSafe(collectionId, 'category_idx', IndexType.Key, ['category']);
    await createIndexSafe(collectionId, 'location_idx', IndexType.Key, ['location']);
    await createIndexSafe(collectionId, 'probability_idx', IndexType.Key, ['probabilityScore']);
    await createIndexSafe(collectionId, 'eligible_idx', IndexType.Key, ['isEligible']);
    await createIndexSafe(collectionId, 'year_idx', IndexType.Key, ['academicYear']);
}

async function setupHistoricalCutoffs() {
    const collectionId = 'historical_cutoffs';

    await createCollectionSafe(collectionId, 'Historical Cutoffs');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Attributes
    await createAttributeSafe(collectionId, 'academicYear', 'integer', undefined, true);
    await createAttributeSafe(collectionId, 'round', 'integer', undefined, true);
    await createAttributeSafe(collectionId, 'counsellingType', 'string', 20, true);

    await createAttributeSafe(collectionId, 'collegeId', 'string', 50, true);
    await createAttributeSafe(collectionId, 'collegeCode', 'string', 20, true);
    await createAttributeSafe(collectionId, 'collegeName', 'string', 255, true);

    await createAttributeSafe(collectionId, 'branchId', 'string', 50, true);
    await createAttributeSafe(collectionId, 'branchCode', 'string', 20, true);
    await createAttributeSafe(collectionId, 'branchName', 'string', 255, true);

    await createAttributeSafe(collectionId, 'seatType', 'string', 5, true);
    await createAttributeSafe(collectionId, 'category', 'string', 20, true);

    await createAttributeSafe(collectionId, 'cutoffRank', 'integer', undefined, true);
    await createAttributeSafe(collectionId, 'totalSeats', 'integer', undefined, true);
    await createAttributeSafe(collectionId, 'seatsAllocated', 'integer', undefined, true);

    await createAttributeSafe(collectionId, 'openingRank', 'integer', undefined, false);
    await createAttributeSafe(collectionId, 'closingRank', 'integer', undefined, false);
    await createAttributeSafe(collectionId, 'avgRank', 'integer', undefined, false);

    await createAttributeSafe(collectionId, 'source', 'string', 100, false);
    await createAttributeSafe(collectionId, 'verified', 'boolean', undefined, true, false);

    await createAttributeSafe(collectionId, 'createdAt', 'string', 50, true);
    await createAttributeSafe(collectionId, 'updatedAt', 'string', 50, true);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Indexes
    await createIndexSafe(collectionId, 'year_college_branch', IndexType.Key, ['academicYear', 'collegeCode', 'branchCode']);
    await createIndexSafe(collectionId, 'counselling_year', IndexType.Key, ['counsellingType', 'academicYear']);
    await createIndexSafe(collectionId, 'college_seat_cat', IndexType.Key, ['collegeCode', 'seatType', 'category']);
    await createIndexSafe(collectionId, 'cutoff_idx', IndexType.Key, ['cutoffRank']);
}

async function setupSeatMatrix() {
    const collectionId = 'seat_matrix';

    await createCollectionSafe(collectionId, 'Seat Matrix (Current Year)');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Attributes
    await createAttributeSafe(collectionId, 'academicYear', 'integer', undefined, true);
    await createAttributeSafe(collectionId, 'counsellingType', 'string', 20, true);

    await createAttributeSafe(collectionId, 'collegeId', 'string', 50, true);
    await createAttributeSafe(collectionId, 'collegeCode', 'string', 20, true);
    await createAttributeSafe(collectionId, 'branchId', 'string', 50, true);
    await createAttributeSafe(collectionId, 'branchCode', 'string', 20, true);

    await createAttributeSafe(collectionId, 'seatType', 'string', 5, true);
    await createAttributeSafe(collectionId, 'category', 'string', 20, true);

    await createAttributeSafe(collectionId, 'totalSeats', 'integer', undefined, true);
    await createAttributeSafe(collectionId, 'reservedSeats', 'integer', undefined, true);
    await createAttributeSafe(collectionId, 'availableSeats', 'integer', undefined, true);
    await createAttributeSafe(collectionId, 'allocatedSeats', 'integer', undefined, true, 0);

    await createAttributeSafe(collectionId, 'snqSeats', 'integer', undefined, false, 0);
    await createAttributeSafe(collectionId, 'nccSeats', 'integer', undefined, false, 0);
    await createAttributeSafe(collectionId, 'spoSeats', 'integer', undefined, false, 0);

    await createAttributeSafe(collectionId, 'isActive', 'boolean', undefined, true, true);
    await createAttributeSafe(collectionId, 'lastUpdated', 'string', 50, true);

    await createAttributeSafe(collectionId, 'createdAt', 'string', 50, true);
    await createAttributeSafe(collectionId, 'updatedAt', 'string', 50, true);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Indexes
    await createIndexSafe(collectionId, 'year_college_branch', IndexType.Key, ['academicYear', 'collegeCode', 'branchCode']);
    await createIndexSafe(collectionId, 'seat_category', IndexType.Key, ['seatType', 'category']);
    await createIndexSafe(collectionId, 'available_idx', IndexType.Key, ['availableSeats']);
}

async function setupProbabilityCache() {
    const collectionId = 'probability_cache';

    await createCollectionSafe(collectionId, 'Probability Cache');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Attributes
    await createAttributeSafe(collectionId, 'userId', 'string', 50, true);
    await createAttributeSafe(collectionId, 'preferenceId', 'string', 50, true);

    await createAttributeSafe(collectionId, 'probabilityScore', 'integer', undefined, true);
    await createAttributeSafe(collectionId, 'probabilityCategory', 'string', 20, true);

    await createAttributeSafe(collectionId, 'rankDifference', 'integer', undefined, false);
    await createAttributeSafe(collectionId, 'competitionIndex', 'integer', undefined, false);
    await createAttributeSafe(collectionId, 'categoryAdvantage', 'integer', undefined, false);
    await createAttributeSafe(collectionId, 'trendFactor', 'integer', undefined, false);

    await createAttributeSafe(collectionId, 'reason', 'string', 500, false);
    await createAttributeSafe(collectionId, 'recommendations', 'string', 1000, false);

    await createAttributeSafe(collectionId, 'calculatedAt', 'string', 50, true);
    await createAttributeSafe(collectionId, 'expiresAt', 'string', 50, true);
    await createAttributeSafe(collectionId, 'version', 'integer', undefined, true, 1);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Indexes
    await createIndexSafe(collectionId, 'user_pref', IndexType.Unique, ['userId', 'preferenceId']);
    await createIndexSafe(collectionId, 'expires_idx', IndexType.Key, ['expiresAt']);
}

async function setupAnalyticsEvents() {
    const collectionId = 'analytics_events';

    await createCollectionSafe(collectionId, 'Analytics Events');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Attributes
    await createAttributeSafe(collectionId, 'userId', 'string', 50, true);
    await createAttributeSafe(collectionId, 'eventType', 'string', 100, true);

    await createAttributeSafe(collectionId, 'collegeCode', 'string', 20, false);
    await createAttributeSafe(collectionId, 'branchCode', 'string', 20, false);
    await createAttributeSafe(collectionId, 'seatType', 'string', 5, false);

    await createAttributeSafe(collectionId, 'sessionId', 'string', 100, false);
    await createAttributeSafe(collectionId, 'timestamp', 'string', 50, true);
    await createAttributeSafe(collectionId, 'metadata', 'string', 5000, false);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Indexes
    await createIndexSafe(collectionId, 'user_time', IndexType.Key, ['userId', 'timestamp']);
    await createIndexSafe(collectionId, 'event_idx', IndexType.Key, ['eventType']);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log('🚀 Setting up Normalized Schema for Career Counseling');
    console.log('='.repeat(60));

    try {
        console.log('\n Step 1: Core User Collections');
        await setupUsers();
        await setupStudentProfiles();

        console.log('\n Step 2: Preference System (Normalized)');
        await setupStudentPreferences();

        console.log('\n Step 3: Historical Data');
        await setupHistoricalCutoffs();
        await setupSeatMatrix();

        console.log('\n Step 4: Performance Optimization');
        await setupProbabilityCache();

        console.log('\n Step 5: Analytics');
        await setupAnalyticsEvents();

        console.log('\n' + '='.repeat(60));
        console.log(' Normalized schema setup complete!');
        console.log('\n Collections Created:');
        console.log('  1. users - Student authentication');
        console.log('  2. student_profiles_v2 - Extended profiles');
        console.log('  3. student_preferences_v2 - Individual preferences (NORMALIZED)');
        console.log('  4. historical_cutoffs - Previous year data');
        console.log('  5. seat_matrix - Current year seats');
        console.log('  6. probability_cache - Pre-calculated probabilities');
        console.log('  7. analytics_events - User behavior tracking');
        console.log('\n Ready for production scale!');


    } catch (error) {
        console.error('\n Setup failed:', error);
        process.exit(1);
    }
}

// Run the setup
main();
