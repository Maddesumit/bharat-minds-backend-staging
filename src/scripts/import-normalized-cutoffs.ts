/**
 * Normalized CSV Import Script for Farming & Veterinary Counselling
 * 
 * This script imports denormalized wide CSV data and normalizes it into proper collections:
 * - Extracts college information
 * - Extracts course information
 * - Normalizes cutoff data (each category column becomes a separate document)
 * 
 * Key features to avoid timeouts:
 * - Batching: Process data in batches to avoid memory issues
 * - Rate limiting: Add delays to respect Appwrite rate limits
 * - Numeric validation: Ensure cutoff ranks are valid numbers
 * - Deduplication: Avoid creating duplicate records
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Client, Databases, ID, Query } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'main_db';

const COLLECTIONS = {
    colleges: 'farming_vet_colleges',
    courses: 'farming_vet_courses',
    cutoffs: 'farming_vet_cutoffs',
};

// CSV column structure
interface CutoffCSVRow {
    'college id': string;
    'College': string;
    'Branch': string;
    'Type': string;
    'Round': string;
    'Course Name': string;
    'Course Code': string;
    // Category columns
    '1G': string;
    '1K': string;
    '1R': string;
    '2AG': string;
    '2AK': string;
    '2AR': string;
    '2BG': string;
    '2BK': string;
    '2BR': string;
    '3AG': string;
    '3AK': string;
    '3AR': string;
    '3BG': string;
    '3BK': string;
    '3BR': string;
    'GM': string;
    'GMK': string;
    'GMR': string;
    'SCG': string;
    'SCK': string;
    'SCR': string;
    'STG': string;
    'STK': string;
    'STR': string;
}

// Category columns to normalize
const CATEGORY_COLUMNS = [
    '1G', '1K', '1R', '2AG', '2AK', '2AR', '2BG', '2BK', '2BR',
    '3AG', '3AK', '3AR', '3BG', '3BK', '3BR', 'GM', 'GMK', 'GMR',
    'SCG', 'SCK', 'SCR', 'STG', 'STK', 'STR'
];

// Batch configuration
const BATCH_SIZE = 25; // Process 25 records at a time
const BATCH_DELAY_MS = 500; // Wait 500ms between batches

/**
 * Parse CSV file
 */
function parseCSV<T>(filePath: string): T[] {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as T[];
}

/**
 * Extract college type from branch or course name
 */
function extractCollegeType(collegeName: string, branch: string): string {
    const text = (collegeName + ' ' + branch).toLowerCase();

    if (text.includes('veterinary') || text.includes('vet')) return 'Veterinary';
    if (text.includes('food') || text.includes('fisheries')) return 'Food Science';
    if (text.includes('horticulture')) return 'Horticulture';
    if (text.includes('forestry')) return 'Forestry';
    if (text.includes('agriculture') || text.includes('agri')) return 'Agriculture';

    return 'Other';
}

/**
 * Extract degree from course name
 */
function extractDegree(courseName: string): string {
    const name = courseName.toLowerCase();

    if (name.includes('b.tech')) return 'B.Tech';
    if (name.includes('b.sc')) return 'B.Sc';
    if (name.includes('b.v.sc')) return 'B.V.Sc';
    if (name.includes('m.tech')) return 'M.Tech';
    if (name.includes('m.sc')) return 'M.Sc';
    if (name.includes('ph.d')) return 'Ph.D';

    return 'Other';
}

/**
 * Extract location from college name
 */
function extractLocation(collegeName: string): string {
    // Extract text after last comma (usually location)
    const parts = collegeName.split(',');
    if (parts.length > 1) {
        return parts[parts.length - 1].trim();
    }
    return '';
}

/**
 * Validate and parse cutoff rank
 * Returns null if invalid (0, empty, or non-numeric)
 */
function parseRank(value: string): number | null {
    if (!value || value.trim() === '' || value === '0') {
        return null;
    }

    const rank = parseFloat(value);

    if (isNaN(rank) || rank <= 0) {
        return null;
    }

    return rank;
}

/**
 * Import colleges from CSV
 */
async function importColleges(rows: CutoffCSVRow[]): Promise<Map<string, string>> {
    console.log('\n🏫 Importing colleges...');

    const collegeMap = new Map<string, string>(); // college_id -> document_id
    const uniqueColleges = new Map<string, any>();

    // Extract unique colleges
    for (const row of rows) {
        const collegeId = row['college id'].trim();
        const collegeName = row['College'].trim();

        if (!uniqueColleges.has(collegeId)) {
            uniqueColleges.set(collegeId, {
                college_id: collegeId,
                college_name: collegeName,
                location: extractLocation(collegeName),
                type: extractCollegeType(collegeName, row['Branch']),
            });
        }
    }

    console.log(`  Found ${uniqueColleges.size} unique colleges`);

    // Import in batches
    const colleges = Array.from(uniqueColleges.values());
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < colleges.length; i += BATCH_SIZE) {
        const batch = colleges.slice(i, i + BATCH_SIZE);

        for (const college of batch) {
            try {
                // Check if already exists
                const existing = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.colleges,
                    [Query.equal('college_id', college.college_id)]
                );

                if (existing.documents.length > 0) {
                    collegeMap.set(college.college_id, existing.documents[0].$id);
                    skipped++;
                } else {
                    const doc = await databases.createDocument(
                        DATABASE_ID,
                        COLLECTIONS.colleges,
                        ID.unique(),
                        college
                    );
                    collegeMap.set(college.college_id, doc.$id);
                    imported++;
                }
            } catch (error: any) {
                console.error(`  ✗ Failed to import college ${college.college_id}: ${error.message}`);
            }
        }

        // Rate limiting
        if (i + BATCH_SIZE < colleges.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
    }

    console.log(`  ✓ Imported: ${imported}, Skipped: ${skipped}`);
    return collegeMap;
}

/**
 * Import courses from CSV
 */
async function importCourses(rows: CutoffCSVRow[], collegeMap: Map<string, string>): Promise<Map<string, string>> {
    console.log('\n📚 Importing courses...');

    const courseMap = new Map<string, string>(); // course_id -> document_id
    const uniqueCourses = new Map<string, any>();

    // Extract unique courses
    for (const row of rows) {
        const collegeId = row['college id'].trim();
        const courseCode = row['Course Code'].trim();
        const courseId = `${collegeId}_${courseCode}`;

        if (!uniqueCourses.has(courseId) && collegeMap.has(collegeId)) {
            uniqueCourses.set(courseId, {
                course_id: courseId,
                college_id: collegeMap.get(collegeId),
                course_name: row['Course Name'].trim(),
                course_code: courseCode,
                branch: row['Branch'].trim(),
                degree: extractDegree(row['Course Name']),
                // Note: course_type is omitted as it's optional and may not be ready yet
            });
        }
    }

    console.log(`  Found ${uniqueCourses.size} unique courses`);

    // Import in batches
    const courses = Array.from(uniqueCourses.values());
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < courses.length; i += BATCH_SIZE) {
        const batch = courses.slice(i, i + BATCH_SIZE);

        for (const course of batch) {
            try {
                // Check if already exists
                const existing = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.courses,
                    [Query.equal('course_id', course.course_id)]
                );

                if (existing.documents.length > 0) {
                    courseMap.set(course.course_id, existing.documents[0].$id);
                    skipped++;
                } else {
                    const doc = await databases.createDocument(
                        DATABASE_ID,
                        COLLECTIONS.courses,
                        ID.unique(),
                        course
                    );
                    courseMap.set(course.course_id, doc.$id);
                    imported++;
                }
            } catch (error: any) {
                console.error(`  ✗ Failed to import course ${course.course_id}: ${error.message}`);
            }
        }

        // Rate limiting
        if (i + BATCH_SIZE < courses.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
    }

    console.log(`  ✓ Imported: ${imported}, Skipped: ${skipped}`);
    return courseMap;
}

/**
 * Import cutoffs from CSV (NORMALIZED)
 * 
 * This is the critical part: instead of storing all categories in one wide row,
 * we create a separate document for each category with a non-zero cutoff.
 * 
 * This enables:
 * - Fast indexed lookups by category
 * - Efficient range queries on cutoff_rank
 * - No OR queries needed
 */
async function importCutoffs(rows: CutoffCSVRow[], collegeMap: Map<string, string>, year: number) {
    console.log('\n🎯 Importing cutoffs (normalized)...');
    console.log(`  Year: ${year}`);

    const cutoffDocuments: any[] = [];

    // Normalize: convert each category column into a separate document
    for (const row of rows) {
        const collegeId = row['college id'].trim();
        const courseCode = row['Course Code'].trim();
        const courseId = `${collegeId}_${courseCode}`;
        const round = parseInt(row['Round']) || 1;

        if (!collegeMap.has(collegeId)) {
            continue;
        }

        // For each category column, create a separate cutoff document
        for (const category of CATEGORY_COLUMNS) {
            const rankValue = row[category as keyof CutoffCSVRow];
            const cutoffRank = parseRank(rankValue);

            // Only create document if cutoff is valid
            if (cutoffRank !== null) {
                cutoffDocuments.push({
                    course_id: courseId,
                    college_id: collegeMap.get(collegeId),
                    category: category,
                    round: round,
                    year: year,
                    cutoff_rank: cutoffRank,
                });
            }
        }
    }

    console.log(`  Generated ${cutoffDocuments.length} normalized cutoff documents`);

    // Import in batches
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < cutoffDocuments.length; i += BATCH_SIZE) {
        const batch = cutoffDocuments.slice(i, i + BATCH_SIZE);

        for (const cutoff of batch) {
            try {
                await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.cutoffs,
                    ID.unique(),
                    cutoff
                );
                imported++;

                if (imported % 100 === 0) {
                    console.log(`  Progress: ${imported}/${cutoffDocuments.length}`);
                }
            } catch (error: any) {
                failed++;
                if (failed <= 5) {
                    console.error(`  ✗ Failed to import cutoff: ${error.message}`);
                }
            }
        }

        // Rate limiting
        if (i + BATCH_SIZE < cutoffDocuments.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
    }

    console.log(`  ✓ Imported: ${imported}, Failed: ${failed}`);
}

/**
 * Main import function
 */
async function main() {
    console.log('='.repeat(80));
    console.log('🚀 Normalized Cutoff Data Import');
    console.log('='.repeat(80));

    // Get CSV file path from command line or use default
    const csvFile = process.argv[2] || 'data/updated_FoodSc_file(in).csv';
    const csvPath = path.join(process.cwd(), csvFile);

    if (!fs.existsSync(csvPath)) {
        console.error(`\n❌ CSV file not found: ${csvPath}`);
        console.log('\nUsage: ts-node import-normalized-cutoffs.ts [csv-file-path] [year]');
        console.log('Example: ts-node import-normalized-cutoffs.ts data/updated_FoodSc_file(in).csv 2024');
        process.exit(1);
    }

    // Get year from command line or use default
    const year = parseInt(process.argv[3]) || 2024;

    console.log(`\n📄 CSV File: ${csvPath}`);
    console.log(`📅 Year: ${year}\n`);

    try {
        // Parse CSV
        console.log('📖 Parsing CSV...');
        const rows = parseCSV<CutoffCSVRow>(csvPath);
        console.log(`  Found ${rows.length} rows\n`);

        // Import colleges
        const collegeMap = await importColleges(rows);

        // Import courses
        const courseMap = await importCourses(rows, collegeMap);

        // Import cutoffs (normalized)
        await importCutoffs(rows, collegeMap, year);

        console.log('\n' + '='.repeat(80));
        console.log('✅ Import complete!');
        console.log('='.repeat(80));
        console.log('\nNext steps:');
        console.log('  1. Verify data using Appwrite console');
        console.log('  2. Use the query service for counselling operations');
        console.log('  3. Import additional years if needed');
        console.log('');

    } catch (error) {
        console.error('\n❌ Import failed:', error);
        process.exit(1);
    }
}

main();
