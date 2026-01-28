
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { ID } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';

const CSV_FILE_PATH = path.join(__dirname, '../../data/CutOff of R1 - CutOff of R1.csv');
const COLLECTION_ID = 'historical_cutoffs';
const BATCH_SIZE = 20;

async function importCutoffs() {
    console.log(`📂 Reading CSV from: ${CSV_FILE_PATH}`);

    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error('CSV file not found!');
        process.exit(1);
    }

    const fileStream = fs.createReadStream(CSV_FILE_PATH);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let headers: string[] = [];
    let lineCount = 0;
    let batch: any[] = [];
    let totalImported = 0;

    console.log(' Starting import...');

    for await (const line of rl) {
        lineCount++;
        if (lineCount === 1) {
            headers = line.split(',').map(h => h.trim());
            continue;
        }

        // Simple CSV parse (handling potential commas in course name if quoted? usually no quotes in this simple csv)
        // Assuming no commas in fields for now based on view_file
        const values = line.split(',');

        // collegeId,collegeCode,courseId,category,seatType,round,year,closingRank,courseName
        // Map to Schema:
        // collegeId, collegeCode, branchCode, category, seatType, round, academicYear, cutoffRank, branchName

        const collegeId = values[0]?.trim();
        const collegeCode = values[1]?.trim();
        const branchCode = values[2]?.trim();
        const category = values[3]?.trim();
        const seatType = values[4]?.trim();
        const round = parseInt(values[5]?.trim() || '0');
        const academicYear = parseInt(values[6]?.trim() || '0');
        const cutoffRank = parseInt(values[7]?.trim() || '0');
        const branchName = values.slice(8).join(',').trim(); // Join rest in case of commas

        if (!collegeId || !branchCode || !cutoffRank) {
            // console.warn(` Skipping line ${lineCount}: Missing required fields`);
            continue;
        }

        // Skip empty category for now if it seems invalid, unless we map it. 
        // Based on file, valid categories are GM, SCG, etc.
        // If category is empty, it might be header or malformed.
        if (!category) {
            // console.warn(` Skipping line ${lineCount}: Empty category`);
            continue;
        }

        const doc = {
            collegeId,
            collegeCode,
            collegeName: collegeCode, // We don't have name in CSV, using Code
            branchId: `${collegeCode}-${branchCode}`,
            branchCode,
            branchName,
            seatType,
            category,
            cutoffRank,
            totalSeats: 0, // Unknown
            seatsAllocated: 0, // Unknown
            academicYear,
            round,
            counsellingType: 'KEA', // Assumed
            source: 'Imported CSV',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        batch.push(doc);

        if (batch.length >= BATCH_SIZE) {
            await processBatch(batch);
            totalImported += batch.length;
            process.stdout.write(`\r Imported: ${totalImported} records...`);
            batch = [];
        }
    }

    if (batch.length > 0) {
        await processBatch(batch);
        totalImported += batch.length;
    }

    console.log(`\n Import Complete! Total records: ${totalImported}`);
}

async function processBatch(batch: any[]) {
    try {
        const promises = batch.map(doc =>
            databases.createDocument(
                config.databaseId,
                COLLECTION_ID,
                ID.unique(),
                doc
            ).catch(err => {
                console.error(`\n Error inserting doc: ${err.message}`);
                return null;
            })
        );
        await Promise.all(promises);
    } catch (error) {
        console.error('Batch error:', error);
    }
}

importCutoffs().catch(console.error);
