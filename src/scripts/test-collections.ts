/**
 * Test Script: Verify Appwrite Collections Access
 * 
 * This script tests connectivity to all configured Appwrite collections
 * and displays document counts and sample data.
 * 
 * Usage: npx ts-node src/scripts/test-collections.ts
 */

import { databases, config, validateConnection } from '../config/appwrite.config';
import { Query } from 'node-appwrite';

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

interface CollectionInfo {
    name: string;
    id: string;
    description: string;
}

const collections: CollectionInfo[] = [
    {
        name: 'User Profiles',
        id: config.collections.userProfiles,
        description: 'Student profiles and eligibility data'
    },
    {
        name: 'Student Ranks',
        id: config.collections.studentRanks,
        description: 'Entrance exam ranks (UGCET/UGNEET)'
    },
    {
        name: 'Colleges',
        id: config.collections.colleges,
        description: 'College master data'
    },
    {
        name: 'College Courses',
        id: config.collections.collegeCourses,
        description: 'Course offerings by college'
    },
    {
        name: 'User Preferences',
        id: config.collections.userPreferences,
        description: 'Student college/course preferences'
    },
    {
        name: 'Cutoff Data',
        id: config.collections.cutoffData,
        description: 'Previous year cutoff ranks'
    },
    {
        name: 'Students (Legacy)',
        id: config.collections.students,
        description: 'Legacy student data'
    },
    {
        name: 'Option Lists',
        id: config.collections.optionLists,
        description: 'Generated option entry lists'
    }
];

/**
 * Test individual collection access
 */
async function testCollection(collection: CollectionInfo): Promise<{
    success: boolean;
    count: number;
    sample?: any;
    error?: string;
}> {
    try {
        // Get document count
        const response = await databases.listDocuments(
            config.databaseId,
            collection.id,
            [Query.limit(1)]
        );

        return {
            success: true,
            count: response.total,
            sample: response.documents[0] || null
        };
    } catch (error: any) {
        return {
            success: false,
            count: 0,
            error: error.message || 'Unknown error'
        };
    }
}

/**
 * Display collection test results
 */
function displayResults(collection: CollectionInfo, result: any) {
    const statusIcon = result.success ? '✅' : '❌';
    const statusColor = result.success ? colors.green : colors.red;

    console.log(`\n${statusColor}${statusIcon} ${collection.name}${colors.reset}`);
    console.log(`   ${colors.cyan}Collection ID:${colors.reset} ${collection.id}`);
    console.log(`   ${colors.cyan}Description:${colors.reset} ${collection.description}`);

    if (result.success) {
        console.log(`   ${colors.cyan}Document Count:${colors.reset} ${result.count}`);

        if (result.sample) {
            console.log(`   ${colors.cyan}Sample Document ID:${colors.reset} ${result.sample.$id}`);

            // Show a few fields from sample document
            const keys = Object.keys(result.sample).filter(k => !k.startsWith('$')).slice(0, 3);
            if (keys.length > 0) {
                console.log(`   ${colors.cyan}Sample Fields:${colors.reset}`);
                keys.forEach(key => {
                    let value = result.sample[key];
                    if (typeof value === 'string' && value.length > 50) {
                        value = value.substring(0, 50) + '...';
                    }
                    console.log(`      - ${key}: ${value}`);
                });
            }
        } else if (result.count === 0) {
            console.log(`   ${colors.yellow}⚠️  Collection is empty${colors.reset}`);
        }
    } else {
        console.log(`   ${colors.red}Error:${colors.reset} ${result.error}`);
    }
}

/**
 * Display summary statistics
 */
function displaySummary(results: any[]) {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDocs = results.reduce((sum, r) => sum + r.count, 0);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`${colors.bold}${colors.blue}SUMMARY${colors.reset}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`${colors.green}✅ Successful:${colors.reset} ${successful}/${collections.length}`);

    if (failed > 0) {
        console.log(`${colors.red}❌ Failed:${colors.reset} ${failed}/${collections.length}`);
    }

    console.log(`${colors.cyan}📊 Total Documents:${colors.reset} ${totalDocs}`);
    console.log(`${'='.repeat(60)}\n`);
}

/**
 * Main test function
 */
async function main() {
    console.log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}BHARAT MINDS - Appwrite Collections Test${colors.reset}`);
    console.log(`${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

    // Validate Appwrite connection
    console.log(`${colors.cyan}🔌 Validating Appwrite connection...${colors.reset}`);
    const isConnected = await validateConnection();

    if (!isConnected) {
        console.log(`\n${colors.red}❌ Failed to connect to Appwrite${colors.reset}`);
        console.log(`${colors.yellow}Please check your .env configuration:${colors.reset}`);
        console.log(`   - APPWRITE_ENDPOINT=${config.endpoint}`);
        console.log(`   - APPWRITE_PROJECT_ID=${config.projectId}`);
        console.log(`   - APPWRITE_DATABASE_ID=${config.databaseId}`);
        process.exit(1);
    }

    console.log(`${colors.green}✅ Connection validated${colors.reset}\n`);

    // Test each collection
    console.log(`${colors.cyan}Testing collections...${colors.reset}`);
    const results = [];

    for (const collection of collections) {
        const result = await testCollection(collection);
        results.push(result);
        displayResults(collection, result);
    }

    // Display summary
    displaySummary(results);

    // Exit with appropriate code
    const allSuccessful = results.every(r => r.success);
    if (allSuccessful) {
        console.log(`${colors.green}${colors.bold}✅ All collections are accessible!${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`${colors.red}${colors.bold}❌ Some collections failed. Check errors above.${colors.reset}\n`);
        process.exit(1);
    }
}

// Run the test
main().catch(error => {
    console.error(`\n${colors.red}${colors.bold}Fatal Error:${colors.reset}`, error);
    process.exit(1);
});
