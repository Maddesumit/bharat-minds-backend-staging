
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { ID, Query } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';

const CSV_FILE_PATH = path.join(__dirname, '../../data/CutOff of R1 - CutOff of R1.csv');
const COLLECTION_ID = 'historical_cutoffs';
const BATCH_SIZE = 20;

async function loadCollegeMap() {
    console.log('🔄 Loading college names from database...');
    const map = new Map<string, string>();
    try {
        // Fetch all colleges
        const list = await databases.listDocuments(
            config.databaseId,
            config.collections.colleges,
            [Query.limit(5000)]
        );

        list.documents.forEach((doc: any) => {
            if (doc.collegeCode && doc.collegeName) {
                // Normalize keys just in case
                map.set(doc.collegeCode.trim(), doc.collegeName.trim());
            }
        });
        console.log(`✅ Loaded names for ${map.size} colleges.`);
    } catch (e: any) {
        console.warn('⚠️ Could not load college master list:', e.message);
    }
    return map;
}

async function importCutoffs() {
    console.log(`📂 Reading CSV from: ${CSV_FILE_PATH}`);

    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error('CSV file not found!');
        process.exit(1);
    }

    // 1. Load College Names
    const collegeMap = await loadCollegeMap();

    const fileStream = fs.createReadStream(CSV_FILE_PATH);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let headers: string[] = [];
    let lineCount = 0;
    let batch: any[] = [];
    let totalImported = 0;

    console.log('🚀 Starting import...');

    for await (const line of rl) {
        lineCount++;
        if (lineCount === 1) {
            headers = line.split(',').map(h => h.trim());
            continue;
        }

        const values = line.split(',');

        // collegeId,collegeCode,courseId,category,seatType,round,year,closingRank,courseName
        const collegeId = values[0]?.trim();
        const collegeCode = values[1]?.trim();
        const branchCode = values[2]?.trim();
        const category = values[3]?.trim();
        const seatType = values[4]?.trim();
        const round = parseInt(values[5]?.trim() || '0');
        const academicYear = parseInt(values[6]?.trim() || '0');
        const cutoffRank = parseInt(values[7]?.trim() || '0');
        const branchName = values.slice(8).join(',').trim();

        if (!collegeId || !branchCode || !cutoffRank) {
            continue;
        }

        if (!category) {
            continue;
        }

        // LOOKUP NAME
        let realCollegeName = collegeCode;
        if (collegeMap.has(collegeCode)) {
            realCollegeName = collegeMap.get(collegeCode) || collegeCode;
        }

        const doc = {
            collegeId,
            collegeCode,
            collegeName: realCollegeName, // ✅ Using mapped name
            branchId: `${collegeCode}-${branchCode}`,
            branchCode,
            branchName,
            seatType,
            category,
            cutoffRank,
            totalSeats: 0,
            seatsAllocated: 0,
            academicYear,
            round,
            counsellingType: 'KEA',
            source: 'Imported CSV',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        batch.push(doc);

        if (batch.length >= BATCH_SIZE) {
            await processBatch(batch);
            totalImported += batch.length;
            process.stdout.write(`\r✅ Imported: ${totalImported} records...`);
            batch = [];
        }
    }

    if (batch.length > 0) {
        await processBatch(batch);
        totalImported += batch.length;
    }

    console.log(`\n🎉 Import Complete! Total records: ${totalImported}`);
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
                // Ignore duplicates or create errors silently to keep log clean
                // console.error(`\n❌ Error inserting doc: ${err.message}`);
                return null;
            })
        );
        await Promise.all(promises);
    } catch (error) {
        console.error('Batch error:', error);
    }
}

importCutoffs().catch(console.error);
