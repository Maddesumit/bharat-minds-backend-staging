/**
 * API Route Testing Script
 * Tests all available routes in the Bharat Minds backend
 * 
 * Usage: node test-api.js
 * 
 * Prerequisites: Server must be running (npm run dev)
 */

const BASE_URL = 'http://localhost:3001';

// Helper function to make requests
async function testEndpoint(method, endpoint, body = null) {
    const url = `${BASE_URL}${endpoint}`;

    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        console.log(`\n${method} ${endpoint}`);
        console.log('-'.repeat(80));

        const response = await fetch(url, options);
        const data = await response.json();

        if (response.ok) {
            console.log(`✅ Status: ${response.status} ${response.statusText}`);
            console.log('Response:', JSON.stringify(data, null, 2));
        } else {
            console.log(`❌ Status: ${response.status} ${response.statusText}`);
            console.log('Error:', JSON.stringify(data, null, 2));
        }

        return { success: response.ok, data };

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Main test function
async function runTests() {
    console.log('='.repeat(80));
    console.log('BHARAT MINDS API - Route Testing');
    console.log('='.repeat(80));
    console.log(`Testing API at: ${BASE_URL}`);
    console.log('Ensure server is running with: npm run dev\n');

    let passCount = 0;
    let failCount = 0;

    // Test 1: Health Check
    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: Health Check');
    console.log('='.repeat(80));
    const health = await testEndpoint('GET', '/health');
    health.success ? passCount++ : failCount++;

    // Test 2: Get all colleges
    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: Get All Colleges');
    console.log('='.repeat(80));
    const colleges = await testEndpoint('GET', '/api/colleges');
    colleges.success ? passCount++ : failCount++;

    // Test 3: Get course categories
    console.log('\n' + '='.repeat(80));
    console.log('TEST 3: Get Course Categories for UGCET');
    console.log('='.repeat(80));
    const categories = await testEndpoint('GET', '/api/options/course-categories/UGCET');
    categories.success ? passCount++ : failCount++;

    // Test 4: Get engineering branches
    console.log('\n' + '='.repeat(80));
    console.log('TEST 4: Get Engineering Branches');
    console.log('='.repeat(80));
    const branches = await testEndpoint('GET', '/api/options/engineering-branches');
    branches.success ? passCount++ : failCount++;

    // Test 5: Get farm science categories
    console.log('\n' + '='.repeat(80));
    console.log('TEST 5: Get Farm Science Categories');
    console.log('='.repeat(80));
    const farmCategories = await testEndpoint('GET', '/api/options/farm-science-categories');
    farmCategories.success ? passCount++ : failCount++;

    // Test 6: Check if dual ranks required
    console.log('\n' + '='.repeat(80));
    console.log('TEST 6: Check Dual Ranks Requirement (Engineering)');
    console.log('='.repeat(80));
    const dualRanks1 = await testEndpoint('GET', '/api/options/requires-dual-ranks/Engineering');
    dualRanks1.success ? passCount++ : failCount++;

    console.log('\n' + '='.repeat(80));
    console.log('TEST 7: Check Dual Ranks Requirement (Farm Science)');
    console.log('='.repeat(80));
    const dualRanks2 = await testEndpoint('GET', '/api/options/requires-dual-ranks/Farm Science');
    dualRanks2.success ? passCount++ : failCount++;

    // Test 8: Create a rank entry
    console.log('\n' + '='.repeat(80));
    console.log('TEST 8: Save Student Rank (Engineering)');
    console.log('='.repeat(80));
    const saveRank = await testEndpoint('POST', '/api/options/ranks', {
        userId: 'test_user_' + Date.now(),
        counsellingType: 'UGCET',
        courseCategory: 'Engineering',
        generalMeritRank: 12345
    });
    saveRank.success ? passCount++ : failCount++;

    // Test 9: Get saved ranks
    if (saveRank.success && saveRank.data.userId) {
        console.log('\n' + '='.repeat(80));
        console.log('TEST 9: Get Student Ranks');
        console.log('='.repeat(80));
        const getRanks = await testEndpoint('GET', `/api/options/ranks/${saveRank.data.userId}`);
        getRanks.success ? passCount++ : failCount++;
    }

    // Test 10: Save rank with edge case (Farm Science)
    console.log('\n' + '='.repeat(80));
    console.log('TEST 10: Save Student Rank (Farm Science - Edge Case)');
    console.log('='.repeat(80));
    const saveFarmRank = await testEndpoint('POST', '/api/options/ranks', {
        userId: 'farm_test_' + Date.now(),
        counsellingType: 'UGCET',
        courseCategory: 'Farm Science',
        theoryRank: 5000,
        practicalRank: 4800
    });
    saveFarmRank.success ? passCount++ : failCount++;

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`Total: ${passCount + failCount}`);
    console.log('='.repeat(80));

    if (failCount === 0) {
        console.log('\n🎉 All tests passed! Your API is working perfectly!');
    } else {
        console.log('\n⚠️  Some tests failed. Check the output above for details.');
    }
}

// Run tests
console.log('Starting API tests in 2 seconds...');
setTimeout(runTests, 2000);
