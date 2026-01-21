/**
 * CSV Column Inspector
 * Shows what columns are actually in your CSV file
 * 
 * Usage: npx ts-node src/scripts/inspect-csv-columns.ts
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

function inspectCSV(filePath: string, filename: string) {
    console.log('\n' + '='.repeat(80));
    console.log(`📋 Inspecting: ${filename}`);
    console.log('='.repeat(80));

    if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${filePath}\n`);
        return;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rows = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    if (rows.length === 0) {
        console.log('❌ No data found in CSV\n');
        return;
    }

    // Get column names from first row
    const columns = Object.keys(rows[0]);

    console.log(`\n✅ Found ${rows.length} rows`);
    console.log(`✅ Found ${columns.length} columns:\n`);

    columns.forEach((col, index) => {
        console.log(`   ${index + 1}. "${col}"`);
    });

    console.log(`\n📊 First 3 rows of data:\n`);

    for (let i = 0; i < Math.min(3, rows.length); i++) {
        console.log(`Row ${i + 1}:`);
        columns.forEach(col => {
            let value = rows[i][col];
            if (typeof value === 'string' && value.length > 50) {
                value = value.substring(0, 50) + '...';
            }
            console.log(`   ${col}: ${value || '(empty)'}`);
        });
        console.log('');
    }
}

// Main
console.log('='.repeat(80));
console.log('CSV COLUMN INSPECTOR');
console.log('='.repeat(80));

const collegesPath = path.join(process.cwd(), 'unique_colleges(Sheet1).csv');
const coursesPath = path.join(process.cwd(), 'unique_courses(Sheet1).csv');

inspectCSV(collegesPath, 'unique_colleges(Sheet1).csv');
inspectCSV(coursesPath, 'unique_courses(Sheet1).csv');

console.log('='.repeat(80));
console.log('💡 Now you know what columns to map!');
console.log('='.repeat(80));
console.log('\nNext steps:');
console.log('  1. Note the column names above');
console.log('  2. Update the import script interface to match these names');
console.log('  3. Or rename your CSV columns to match the expected names\n');
