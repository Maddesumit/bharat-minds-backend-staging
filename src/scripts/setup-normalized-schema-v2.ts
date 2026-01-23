/**
 * Setup Normalized Schema for Career Counseling - Complete Setup
 * 
 * Creates all 7 collections optimized for production scale
 * Run: npx ts-node src/scripts/setup-normalized-schema-v2.ts
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';

// Import all collection setup functions
import { setupUsers } from './schema-collections/users';
import { setupStudentProfiles } from './schema-collections/student-profiles';
import { setupStudentPreferences } from './schema-collections/student-preferences';
import { setupHistoricalCutoffs } from './schema-collections/historical-cutoffs';
import { setupSeatMatrix } from './schema-collections/seat-matrix';
import { setupProbabilityCache } from './schema-collections/probability-cache';
import { setupAnalyticsEvents } from './schema-collections/analytics-events';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || 'main_db';

async function main() {
    console.log('🚀 Setting up Normalized Schema for Career Counseling');
    console.log('='.repeat(60));

    try {
        console.log('\n Step 1: Core User Collections');
        await setupUsers(databases, databaseId);
        await setupStudentProfiles(databases, databaseId);

        console.log('\n Step 2: Preference System (Normalized)');
        await setupStudentPreferences(databases, databaseId);

        console.log('\n Step 3: Historical Data');
        await setupHistoricalCutoffs(databases, databaseId);
        await setupSeatMatrix(databases, databaseId);

        console.log('\n Step 4: Performance Optimization');
        await setupProbabilityCache(databases, databaseId);

        console.log('\n Step 5: Analytics');
        await setupAnalyticsEvents(databases, databaseId);

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

main();
