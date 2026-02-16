/**
 * Test Appwrite Connection with Retry Logic
 * Run this to verify the fixes are working
 */

import './src/config/dns.config';
import { databases, config } from './src/config/appwrite.config';
import { Query } from 'node-appwrite';

async function testConnection() {
    console.log('\n' + '='.repeat(60));
    console.log('Testing Appwrite Connection');
    console.log('='.repeat(60) + '\n');

    console.log('Configuration:');
    console.log(`  Endpoint: ${config.endpoint}`);
    console.log(`  Project ID: ${config.projectId}`);
    console.log(`  Database ID: ${config.databaseId}`);
    console.log('');

    // Test 1: List collections (basic connectivity)
    console.log('Test 1: Basic Connectivity');
    try {
        const start = Date.now();
        const result = await databases.listDocuments(
            config.databaseId,
            'colleges',
            [Query.limit(1)]
        );
        const duration = Date.now() - start;
        console.log(`✅ SUCCESS - Retrieved ${result.total} colleges in ${duration}ms`);
    } catch (error: any) {
        console.log(`❌ FAILED - ${error.message}`);
        console.error('Error details:', error);
    }

    // Test 2: Query student profiles
    console.log('\nTest 2: Student Profiles Collection');
    try {
        const start = Date.now();
        const result = await databases.listDocuments(
            config.databaseId,
            'student_profiles_v2',
            [Query.limit(1)]
        );
        const duration = Date.now() - start;
        console.log(`✅ SUCCESS - Found ${result.total} profiles in ${duration}ms`);
    } catch (error: any) {
        console.log(`❌ FAILED - ${error.message}`);
        console.error('Error details:', error);
    }

    // Test 3: Query historical cutoffs
    console.log('\nTest 3: Historical Cutoffs Collection');
    try {
        const start = Date.now();
        const result = await databases.listDocuments(
            config.databaseId,
            'historical_cutoffs',
            [Query.limit(1)]
        );
        const duration = Date.now() - start;
        console.log(`✅ SUCCESS - Found ${result.total} cutoffs in ${duration}ms`);
    } catch (error: any) {
        console.log(`❌ FAILED - ${error.message}`);
        console.error('Error details:', error);
    }

    // Test 4: Query farm_agri collection
    console.log('\nTest 4: Farm Science Collection');
    try {
        const start = Date.now();
        const result = await databases.listDocuments(
            config.databaseId,
            'farm_agri',
            [Query.limit(1)]
        );
        const duration = Date.now() - start;
        console.log(`✅ SUCCESS - Found ${result.total} farm records in ${duration}ms`);
    } catch (error: any) {
        console.log(`❌ FAILED - ${error.message}`);
        console.error('Error details:', error);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test Complete');
    console.log('='.repeat(60) + '\n');
}

// Run the test
testConnection()
    .then(() => {
        console.log('All tests completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
