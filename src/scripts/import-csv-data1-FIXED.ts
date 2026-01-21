/**
 * College Courses CSV Import Script - CORRECTED for Your Schema
 * 
 * Schema Fields:
 * - collegeId (required)
 * - courseCode (required)
 * - courseName (required)
 * - courseCategory (required)
 * - seats (optional)
 * - duration (optional)
 * - fees (optional)
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ID } from 'node-appwrite';
import { databases, config, isAppwriteConfigured } from '../config/appwrite.config';

/**
 * ACTUAL CSV Column Names (from your unique_courses CSV)
 */
interface CourseRow {
    collegeId: string;              // Ignore this (internal ID from CSV)
    collegeCode: string;            // Used to find college
    courseType: string;             // Maps to: courseCategory
    branchName: string;             // Maps to: courseName
    branchCode: string;             // Maps to: courseCode
    availableSeatTypes: string;     // Ignore (not in schema)
    totalSeats: string;             // Maps to: seats
    intake: string;                 // Ignore (not in schema)
    accreditation: string;          // Ignore (not in schema)
    affiliatedTo: string;           // Ignore (not in schema)
}

function parseCSV<T>(filePath: string): T[] {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as T[];
}

async function importCourses() {
    console.log('\n📘 Starting course import...\n');

    const csvPath = path.join(process.cwd(), 'unique_courses(Sheet1).csv');

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ CSV file not found: ${csvPath}`);
        console.log('📝 Please place your CSV file in the project root with name: unique_courses(Sheet1).csv');
        return;
    }

    const rows = parseCSV<CourseRow>(csvPath);
    console.log(`📖 Found ${rows.length} courses in CSV\n`);

    // Load colleges from DB to get collegeId
    console.log('🏫 Loading colleges from database...');
    const collegesRes = await databases.listDocuments(config.databaseId, config.collections.colleges);
    const collegeMap = new Map<string, any>();

    collegesRes.documents.forEach(college => {
        collegeMap.set(college.collegeCode.trim(), college);
    });

    console.log(`✅ Loaded ${collegeMap.size} colleges from database\n`);

    let success = 0, skipped = 0, failed = 0;

    for (const [index, row] of rows.entries()) {
        try {
            // Find college by code
            const college = collegeMap.get(row.collegeCode?.trim());

            if (!college) {
                skipped++;
                console.warn(`⚠️  Row ${index + 1}: College not found for code "${row.collegeCode}"`);
                continue;
            }

            // Generate courseCode from branchCode
            const courseCode = row.branchCode?.trim() || `COURSE-${Date.now()}`;

            // Map YOUR CSV columns to the DATABASE schema fields
            const courseData = {
                collegeId: college.$id,                          // Required - from DB
                courseCode: courseCode,                          // Required - from branchCode
                courseName: row.branchName?.trim(),             // Required - from branchName
                courseCategory: row.courseType?.trim(),         // Required - from courseType
                seats: row.totalSeats ? parseInt(row.totalSeats) : null,  // Optional - from totalSeats
                duration: null,                                  // Not in your CSV
                fees: null,                                      // Not in your CSV
            };

            // Validate required fields
            if (!courseData.courseName || !courseData.courseCategory) {
                skipped++;
                console.warn(`⚠️  Row ${index + 1}: Missing required fields`);
                console.warn(`     courseName: ${courseData.courseName}`);
                console.warn(`     courseCategory: ${courseData.courseCategory}`);
                continue;
            }

            await databases.createDocument(
                config.databaseId,
                config.collections.collegeCourses,
                ID.unique(),
                courseData
            );

            success++;
            console.log(`✓ Row ${index + 1}: Imported ${courseData.courseName} at ${college.collegeName}`);

            // Small delay to avoid rate limiting
            if (index % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

        } catch (err: any) {
            failed++;
            console.error(`✗ Row ${index + 1}: ${err.message}`);
        }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('IMPORT SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Successfully imported: ${success}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(80));
}

async function main() {
    console.log('='.repeat(80));
    console.log('🚀 College Courses Import');
    console.log('='.repeat(80));

    if (!isAppwriteConfigured()) {
        console.error('❌ Appwrite not configured (.env missing or incomplete)');
        process.exit(1);
    }

    console.log('✅ Appwrite configured');
    console.log(`   Database ID: ${config.databaseId}`);
    console.log(`   Collection: ${config.collections.collegeCourses}\n`);

    await importCourses();
    console.log('\n🎉 Done!');
}

main();
