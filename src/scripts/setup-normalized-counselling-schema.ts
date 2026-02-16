/**
 * Normalized Counselling Database Schema Setup
 * 
 * This script creates a properly normalized database schema for farming and veterinary
 * course counselling that avoids timeout issues by:
 * 
 * 1. Normalizing denormalized wide tables into proper relational collections
 * 2. Creating strategic indexes on frequently queried fields
 * 3. Avoiding OR queries by using separate indexed lookups
 * 4. Supporting efficient range queries on cutoff ranks
 * 
 * Collections:
 * - colleges: Basic college information
 * - courses: Courses offered by colleges
 * - cutoffs: Normalized cutoff data (one document per category/round/year)
 * - students: Student profiles with rank and preferences
 */

import { Client, Databases, ID, IndexType } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'main_db';

// Collection IDs - Farming & Veterinary Counselling
const COLLECTIONS = {
    colleges: 'farming_vet_colleges',
    courses: 'farming_vet_courses',
    cutoffs: 'farming_vet_cutoffs',
    students: 'farming_vet_students',
};

/**
 * Creates the colleges collection
 * Stores basic college information
 */
async function createCollegesCollection() {
    console.log('\n📚 Creating colleges collection...');

    try {
        const collection = await databases.createCollection(
            DATABASE_ID,
            COLLECTIONS.colleges,
            'Colleges',
            undefined, // permissions (use default)
            false, // documentSecurity
            true // enabled
        );

        console.log('✓ Collection created');

        // Attributes
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.colleges, 'college_id', 50, true);
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.colleges, 'college_name', 500, true);
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.colleges, 'location', 200, false);
        await databases.createEnumAttribute(DATABASE_ID, COLLECTIONS.colleges, 'type', ['Agriculture', 'Veterinary', 'Food Science', 'Horticulture', 'Forestry', 'Other'], true);
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.colleges, 'state', 100, false);
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.colleges, 'district', 100, false);

        console.log('✓ Attributes created');

        // Wait for attributes to be available
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Indexes
        // Key index on college_id for fast lookups
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.colleges,
            'idx_college_id',
            IndexType.Key,
            ['college_id'],
            ['ASC']
        );

        // Key index on type for filtering by college type
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.colleges,
            'idx_type',
            IndexType.Key,
            ['type'],
            ['ASC']
        );

        console.log('✓ Indexes created');
        console.log('✅ Colleges collection ready\n');

    } catch (error: any) {
        if (error.code === 409) {
            console.log('⚠️  Collection already exists, skipping...\n');
        } else {
            throw error;
        }
    }
}

/**
 * Creates the courses collection
 * Stores courses offered by colleges with proper foreign key relationships
 */
async function createCoursesCollection() {
    console.log('\n📖 Creating courses collection...');

    try {
        await databases.createCollection(
            DATABASE_ID,
            COLLECTIONS.courses,
            'Courses',
            undefined,
            false,
            true
        );

        console.log('✓ Collection created');

        // Attributes
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.courses, 'course_id', 50, true);
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.courses, 'college_id', 50, true); // Foreign key
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.courses, 'course_name', 300, true);
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.courses, 'course_code', 50, true);
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.courses, 'branch', 200, true);
        await databases.createEnumAttribute(DATABASE_ID, COLLECTIONS.courses, 'degree', ['B.Sc', 'B.Tech', 'B.V.Sc', 'M.Sc', 'M.Tech', 'Ph.D', 'Other'], true);
        await databases.createEnumAttribute(DATABASE_ID, COLLECTIONS.courses, 'course_type', ['Theory', 'Practical', 'Both'], false, 'Theory');
        await databases.createIntegerAttribute(DATABASE_ID, COLLECTIONS.courses, 'total_seats', false, 0, 10000);
        await databases.createIntegerAttribute(DATABASE_ID, COLLECTIONS.courses, 'duration_years', false, 1, 10);

        console.log('✓ Attributes created');

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Indexes
        // Key index on course_id for fast lookups
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.courses,
            'idx_course_id',
            IndexType.Key,
            ['course_id'],
            ['ASC']
        );

        // Key index on college_id for joining with colleges
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.courses,
            'idx_college_id',
            IndexType.Key,
            ['college_id'],
            ['ASC']
        );

        // Key index on branch for filtering by branch
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.courses,
            'idx_branch',
            IndexType.Key,
            ['branch'],
            ['ASC']
        );

        // Composite index for college + degree filtering
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.courses,
            'idx_college_degree',
            IndexType.Key,
            ['college_id', 'degree'],
            ['ASC', 'ASC']
        );

        console.log('✓ Indexes created');
        console.log('✅ Courses collection ready\n');

    } catch (error: any) {
        if (error.code === 409) {
            console.log('⚠️  Collection already exists, skipping...\n');
        } else {
            throw error;
        }
    }
}

/**
 * Creates the cutoffs collection
 * CRITICAL: This is the normalized version of the wide denormalized table
 * Each category cutoff becomes a separate document with proper indexes
 * 
 * Instead of: course_id, cat_gm, cat_scg, cat_obc, ...
 * We have: course_id, category, cutoff_rank (one row per category)
 * 
 * This enables:
 * - Fast indexed lookups by category (no OR queries needed)
 * - Range queries on cutoff_rank with proper index support
 * - Efficient filtering by year and round
 */
async function createCutoffsCollection() {
    console.log('\n🎯 Creating cutoffs collection (NORMALIZED)...');

    try {
        await databases.createCollection(
            DATABASE_ID,
            COLLECTIONS.cutoffs,
            'Cutoffs',
            undefined,
            false,
            true
        );

        console.log('✓ Collection created');

        // Attributes
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.cutoffs, 'course_id', 50, true); // Foreign key
        await databases.createEnumAttribute(
            DATABASE_ID,
            COLLECTIONS.cutoffs,
            'category',
            ['1G', '1K', '1R', '2AG', '2AK', '2AR', '2BG', '2BK', '2BR', '3AG', '3AK', '3AR', '3BG', '3BK', '3BR', 'GM', 'GMK', 'GMR', 'SCG', 'SCK', 'SCR', 'STG', 'STK', 'STR'],
            true
        );
        await databases.createIntegerAttribute(DATABASE_ID, COLLECTIONS.cutoffs, 'round', true, 1, 10);
        await databases.createIntegerAttribute(DATABASE_ID, COLLECTIONS.cutoffs, 'year', true, 2020, 2030);
        await databases.createFloatAttribute(DATABASE_ID, COLLECTIONS.cutoffs, 'cutoff_rank', true, 0, 200000);
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.cutoffs, 'college_id', 50, false); // Denormalized for faster queries

        console.log('✓ Attributes created');

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Indexes - CRITICAL for performance

        // 1. Key index on category - enables fast filtering by student category
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.cutoffs,
            'idx_category',
            IndexType.Key,
            ['category'],
            ['ASC']
        );

        // 2. Key index on year - enables filtering by admission year
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.cutoffs,
            'idx_year',
            IndexType.Key,
            ['year'],
            ['ASC']
        );

        // 3. Composite index on category + year - enables efficient category + year filtering
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.cutoffs,
            'idx_category_year',
            IndexType.Key,
            ['category', 'year'],
            ['ASC', 'ASC']
        );

        // 4. Composite index on category + year + cutoff_rank - enables range queries
        // This is the MOST IMPORTANT index for counselling queries
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.cutoffs,
            'idx_category_year_rank',
            IndexType.Key,
            ['category', 'year', 'cutoff_rank'],
            ['ASC', 'ASC', 'ASC']
        );

        // 5. Key index on course_id for joining with courses
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.cutoffs,
            'idx_course_id',
            IndexType.Key,
            ['course_id'],
            ['ASC']
        );

        // 6. Key index on round for filtering by counselling round
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.cutoffs,
            'idx_round',
            IndexType.Key,
            ['round'],
            ['ASC']
        );

        console.log('✓ Indexes created');
        console.log('✅ Cutoffs collection ready (normalized schema prevents timeouts)\n');

    } catch (error: any) {
        if (error.code === 409) {
            console.log('⚠️  Collection already exists, skipping...\n');
        } else {
            throw error;
        }
    }
}

/**
 * Creates the students collection
 * Stores student profiles with rank and preferences
 */
async function createStudentsCollection() {
    console.log('\n👨‍🎓 Creating students collection...');

    try {
        await databases.createCollection(
            DATABASE_ID,
            COLLECTIONS.students,
            'Students',
            undefined,
            false,
            true
        );

        console.log('✓ Collection created');

        // Attributes
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.students, 'student_id', 50, true);
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.students, 'user_id', 50, false); // Link to auth user
        await databases.createIntegerAttribute(DATABASE_ID, COLLECTIONS.students, 'rank', true, 1, 200000);
        await databases.createEnumAttribute(
            DATABASE_ID,
            COLLECTIONS.students,
            'category',
            ['1G', '1K', '1R', '2AG', '2AK', '2AR', '2BG', '2BK', '2BR', '3AG', '3AK', '3AR', '3BG', '3BK', '3BR', 'GM', 'GMK', 'GMR', 'SCG', 'SCK', 'SCR', 'STG', 'STK', 'STR'],
            true
        );
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.students, 'preferences', 5000, false); // JSON array of preferred branches
        await databases.createEnumAttribute(DATABASE_ID, COLLECTIONS.students, 'risk_level', ['safe', 'moderate', 'aggressive'], false);
        await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.students, 'preferred_locations', 1000, false); // JSON array
        await databases.createIntegerAttribute(DATABASE_ID, COLLECTIONS.students, 'year', true, 2020, 2030);

        console.log('✓ Attributes created');

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Indexes
        // Key index on student_id
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.students,
            'idx_student_id',
            IndexType.Key,
            ['student_id'],
            ['ASC']
        );

        // Key index on user_id for linking with auth
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.students,
            'idx_user_id',
            IndexType.Key,
            ['user_id'],
            ['ASC']
        );

        // Composite index on category + rank for efficient student lookups
        await databases.createIndex(
            DATABASE_ID,
            COLLECTIONS.students,
            'idx_category_rank',
            IndexType.Key,
            ['category', 'rank'],
            ['ASC', 'ASC']
        );

        console.log('✓ Indexes created');
        console.log('✅ Students collection ready\n');

    } catch (error: any) {
        if (error.code === 409) {
            console.log('⚠️  Collection already exists, skipping...\n');
        } else {
            throw error;
        }
    }
}

/**
 * Main setup function
 */
async function main() {
    console.log('='.repeat(80));
    console.log('🚀 Normalized Counselling Database Schema Setup');
    console.log('='.repeat(80));
    console.log('\nThis schema is designed to avoid timeout issues by:');
    console.log('  ✓ Normalizing wide denormalized tables');
    console.log('  ✓ Creating strategic indexes on frequently queried fields');
    console.log('  ✓ Supporting efficient range queries without OR conditions');
    console.log('  ✓ Enabling fast category-based filtering\n');

    try {
        await createCollegesCollection();
        await createCoursesCollection();
        await createCutoffsCollection();
        await createStudentsCollection();

        console.log('='.repeat(80));
        console.log('✅ Database schema setup complete!');
        console.log('='.repeat(80));
        console.log('\nCollection IDs:');
        console.log(`  - Colleges: ${COLLECTIONS.colleges}`);
        console.log(`  - Courses: ${COLLECTIONS.courses}`);
        console.log(`  - Cutoffs: ${COLLECTIONS.cutoffs}`);
        console.log(`  - Students: ${COLLECTIONS.students}`);
        console.log('\nNext steps:');
        console.log('  1. Run the CSV import script to populate data');
        console.log('  2. Use the query service for counselling operations');
        console.log('');

    } catch (error) {
        console.error('\n❌ Setup failed:', error);
        process.exit(1);
    }
}

main();
