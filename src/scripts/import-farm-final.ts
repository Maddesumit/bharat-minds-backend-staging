
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ID, Permission, Role } from 'node-appwrite';
import { databases, config, isAppwriteConfigured } from '../config/appwrite.config';

const COLLECTION_NAME = "Farm_Agri";
const COLLECTION_ID = "farm_agri";
const CSV_PATH = path.join(process.cwd(), 'data/updated_FoodSc_file(in).csv');

function sanitizeAttributeId(header: string): string {
    let sanitized = header.trim().replace(/[^a-zA-Z0-9]/g, '_');
    if (/^[0-9]/.test(sanitized)) {
        sanitized = 'attr_' + sanitized;
    }
    if (sanitized.length > 32) {
        sanitized = sanitized.substring(0, 32);
    }
    return sanitized.toLowerCase();
}

function detectType(values: string[]): 'string' | 'float' {
    for (const val of values) {
        if (!val || val.trim() === '') continue;
        const num = Number(val);
        if (isNaN(num)) return 'string';
    }
    return 'float';
}

async function sleep(ms: number) {
    console.log(`   ⏳ Waiting ${ms}ms...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function deleteExistingCollection() {
    try {
        console.log(`🗑️  Deleting existing collection...`);
        await databases.deleteCollection(config.databaseId, COLLECTION_ID);
        console.log(`✅ Deleted\n`);
        await sleep(5000);
    } catch (e: any) {
        if (e.code === 404) {
            console.log(`ℹ️  Collection doesn't exist\n`);
        }
    }
}

async function importFarmAgri() {
    console.log(`\n🚜 FARM_AGRI IMPORT - Maximum Robustness Mode\n`);

    if (!isAppwriteConfigured()) {
        console.error('❌ Appwrite not configured');
        return;
    }

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ CSV not found`);
        return;
    }

    // Step 1: Delete
    await deleteExistingCollection();

    // Step 2: Read CSV
    console.log(`📂 Reading CSV...`);
    const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
    });

    const headers = Object.keys((records as any[])[0]);
    console.log(`✓ Found ${headers.length} columns, ${records.length} records\n`);

    // Step 3: Create Collection
    console.log(`🔨 Creating collection...`);
    try {
        await databases.createCollection(
            config.databaseId,
            COLLECTION_ID,
            COLLECTION_NAME,
            [Permission.read(Role.any())]
        );
        console.log(`✅ Collection created\n`);
    } catch (error: any) {
        console.error(`❌ Failed: ${error.message}`);
        return;
    }

    // Long wait for collection to settle
    await sleep(10000);

    // Step 4: Create Attributes ONE AT A TIME with generous waits
    console.log(`🔧 Creating attributes (with generous waits)...\n`);
    const attributeMap: { [header: string]: string } = {};
    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        const attrId = sanitizeAttributeId(header);
        const samples = records.slice(0, 50).map((r: any) => r[header] || '');
        const type = detectType(samples);

        console.log(`[${i + 1}/${headers.length}] "${header}" -> "${attrId}" (${type})`);

        try {
            if (type === 'string') {
                await databases.createStringAttribute(config.databaseId, COLLECTION_ID, attrId, 1000, false);
            } else {
                await databases.createFloatAttribute(config.databaseId, COLLECTION_ID, attrId, false);
            }
            attributeMap[header] = attrId;
            createdCount++;
            console.log(`     ✅ Created\n`);
        } catch (error: any) {
            if (error.code === 409) {
                console.log(`     ⚠️  Already exists\n`);
                attributeMap[header] = attrId;
                createdCount++;
            } else {
                console.log(`     ❌ ${error.message}\n`);
                skippedCount++;
            }
        }

        // Generous wait between each attribute (avoid overwhelming the server)
        if (i < headers.length - 1) {
            await sleep(3000); // 3 seconds between attributes
        }
    }

    console.log(`\nAttribute Creation Summary:`);
    console.log(`  ✓ Created/Found: ${createdCount}`);
    console.log(`  ✗ Skipped: ${skippedCount}\n`);

    if (createdCount === 0) {
        console.error('❌ No attributes created! Cannot proceed.');
        return;
    }

    // VERY long wait for all attributes to be indexed
    console.log(`⏳ CRITICAL WAIT: Giving Appwrite 30 seconds to index all attributes...`);
    await sleep(30000);

    // Step 5: Import Data
    console.log(`\n🚀 Importing ${records.length} records...\n`);
    let successCount = 0;
    let failedCount = 0;
    const failureReasons: { [key: string]: number } = {};

    for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const docData: any = {};

        // Include only headers that were successfully created
        for (const header of headers) {
            if (attributeMap[header]) {
                const attrId = attributeMap[header];
                const value = (row as any)[header];

                if (!value || String(value).trim() === '') {
                    docData[attrId] = null;
                } else {
                    // Determine if it should be a number
                    const samples = records.slice(0, 50).map((r: any) => r[header] || '');
                    const type = detectType(samples);

                    if (type === 'float') {
                        const num = parseFloat(value);
                        docData[attrId] = isNaN(num) ? null : num;
                    } else {
                        docData[attrId] = String(value);
                    }
                }
            }
        }

        try {
            await databases.createDocument(
                config.databaseId,
                COLLECTION_ID,
                ID.unique(),
                docData
            );
            successCount++;

            // Progress
            if ((i + 1) % 10 === 0) {
                process.stdout.write(`\r  ✓ ${i + 1}/${records.length}`);
            }
        } catch (error: any) {
            failedCount++;
            const reason = error.message.substring(0, 50);
            failureReasons[reason] = (failureReasons[reason] || 0) + 1;

            if (failedCount <= 3) {
                console.log(`\n  ❌ Row ${i + 1}: ${error.message}`);
            }
        }

        // Avoid rate limiting
        if ((i + 1) % 5 === 0) {
            await sleep(500);
        }
    }

    // Summary
    console.log(`\n\n${'='.repeat(70)}`);
    console.log(`✅ FARM_AGRI IMPORT COMPLETE`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Collection: ${COLLECTION_ID} (Farm_Agri)`);
    console.log(`Data Source: updated_FoodSc_file(in).csv`);
    console.log(`\nResults:`);
    console.log(`  Total Records: ${records.length}`);
    console.log(`  ✓ Imported: ${successCount}`);
    console.log(`  ✗ Failed: ${failedCount}`);
    console.log(`  Attributes: ${Object.keys(attributeMap).length}/${headers.length}`);
    if (Object.keys(failureReasons).length > 0) {
        console.log(`\nFailure Breakdown:`);
        Object.entries(failureReasons).forEach(([reason, count]) => {
            console.log(`  - ${reason}: ${count}`);
        });
    }
    console.log(`${'='.repeat(70)}\n`);

    if (successCount > 0) {
        console.log(`🎉 Farm_Agri collection successfully populated!`);
    }
}

importFarmAgri().catch(console.error);
