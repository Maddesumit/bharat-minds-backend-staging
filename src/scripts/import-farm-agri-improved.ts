
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ID, Permission, Role } from 'node-appwrite';
import { databases, config, isAppwriteConfigured } from '../config/appwrite.config';

const COLLECTION_NAME = "Farm_Agri";
const COLLECTION_ID = "farm_agri";
const CSV_PATH = path.join(process.cwd(), 'data/updated_FoodSc_file(in).csv');
const BATCH_SIZE = 10;

// Sanitize header to valid Appwrite attribute ID
function sanitizeAttributeId(header: string): string {
    let sanitized = header.trim().replace(/[^a-zA-Z0-9]/g, '_');
    if (/^[0-9]/.test(sanitized)) {
        sanitized = 'attr_' + sanitized;
    }
    if (sanitized.length > 32) {
        sanitized = sanitized.substring(0, 32);
    }
    if (!sanitized) sanitized = 'attr_unknown';
    return sanitized.toLowerCase();
}

// Detect attribute type from values
function detectType(values: string[]): 'string' | 'float' {
    for (const val of values) {
        if (!val || val.trim() === '') continue;
        const num = Number(val);
        if (isNaN(num)) {
            return 'string';
        }
    }
    return 'float';
}

// Sleep utility
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function deleteExistingCollection(): Promise<void> {
    try {
        console.log(`🗑️  Attempting to delete existing collection '${COLLECTION_ID}'...`);
        await databases.deleteCollection(config.databaseId, COLLECTION_ID);
        console.log(`✅ Collection deleted successfully`);
        await sleep(3000); // Wait for deletion to complete
    } catch (e: any) {
        if (e.code === 404) {
            console.log(`ℹ️  Collection doesn't exist, skipping deletion`);
        } else {
            console.warn(`⚠️  Could not delete collection: ${e.message}`);
        }
    }
}

async function importFarmAgri() {
    console.log(`\n🚜 Starting ${COLLECTION_NAME} Import...\n`);

    if (!isAppwriteConfigured()) {
        console.error('❌ Appwrite configuration missing');
        return;
    }

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ File not found: ${CSV_PATH}`);
        return;
    }

    // **Step 0: Delete existing collection**
    await deleteExistingCollection();

    // **Step 1: Read CSV**
    console.log(`\n📂 Reading CSV file: ${CSV_PATH}`);
    const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
    });

    if (records.length === 0) {
        console.error('❌ No records found in CSV');
        return;
    }

    const headers = Object.keys((records as any[])[0]);
    console.log(`📋 Found ${headers.length} columns`);
    console.log(`📄 Found ${records.length} data records`);
    console.log(`Columns: ${headers.join(', ')}`);

    // **Step 2: Create Collection**
    console.log(`\n🔨 Creating Collection '${COLLECTION_NAME}'...`);
    try {
        await databases.createCollection(
            config.databaseId,
            COLLECTION_ID,
            COLLECTION_NAME,
            [Permission.read(Role.any())]
        );
        console.log(`✅ Collection '${COLLECTION_ID}' created`);
    } catch (error: any) {
        console.error(`❌ Error creating collection: ${error.message}`);
        return;
    }

    // **Step 3: Create Attributes**
    console.log(`\n🔧 Creating ${headers.length} attributes...`);
    const attributeMap: { [key: string]: { id: string; type: 'string' | 'float' } } = {};

    for (const header of headers) {
        const attrId = sanitizeAttributeId(header);
        const samples = records.slice(0, 50).map((r: any) => r[header] || '');
        const type = detectType(samples);
        attributeMap[header] = { id: attrId, type };

        try {
            if (type === 'string') {
                await databases.createStringAttribute(config.databaseId, COLLECTION_ID, attrId, 1000, false);
            } else {
                await databases.createFloatAttribute(config.databaseId, COLLECTION_ID, attrId, false);
            }
            console.log(`   ✓ "${header}" -> "${attrId}" (${type})`);
        } catch (e: any) {
            if (e.code === 409) {
                console.log(`   ⚠️  "${header}" already exists`);
            } else {
                console.error(`   ❌ Failed to create "${header}": ${e.message}`);
            }
        }
        await sleep(300); // Prevent rate limiting
    }

    // **Step 4: Wait for attributes to be indexed**
    console.log(`\n⏳ Waiting for attributes to be indexed (15 seconds)...`);
    await sleep(15000);

    // **Step 5: Import Data in Batches**
    console.log(`\n🚀 Importing ${records.length} records...\n`);
    let successCount = 0;
    let failedCount = 0;
    let lastError = '';

    for (let i = 0; i < records.length; i++) {
        try {
            const row = records[i];
            const docData: any = {};

            // Build document payload
            for (const header of headers) {
                const { id, type } = attributeMap[header];
                const value = (row as any)[header];

                if (!value || value.trim() === '') {
                    docData[id] = null;
                } else {
                    if (type === 'float') {
                        const num = parseFloat(value);
                        docData[id] = isNaN(num) ? null : num;
                    } else {
                        docData[id] = String(value);
                    }
                }
            }

            // Create document
            await databases.createDocument(
                config.databaseId,
                COLLECTION_ID,
                ID.unique(),
                docData
            );

            successCount++;

            // Progress indicator
            if ((i + 1) % 10 === 0) {
                process.stdout.write(`\r✓ Imported ${i + 1}/${records.length}`);
            }

            // Rate limiting
            if ((i + 1) % BATCH_SIZE === 0) {
                await sleep(500);
            }
        } catch (error: any) {
            failedCount++;
            lastError = error.message;
            console.error(`\n❌ Row ${i + 1} failed: ${error.message}`);
        }
    }

    // **Summary**
    console.log(`\n\n${'='.repeat(50)}`);
    console.log(`✅ IMPORT COMPLETE`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Collection: ${COLLECTION_ID}`);
    console.log(`Total Records: ${records.length}`);
    console.log(`✓ Successfully Imported: ${successCount}`);
    console.log(`✗ Failed: ${failedCount}`);
    console.log(`Attributes Created: ${Object.keys(attributeMap).length}`);
    if (lastError) {
        console.log(`Last Error: ${lastError}`);
    }
    console.log(`${'='.repeat(50)}\n`);

    if (failedCount > 0) {
        process.exit(1);
    }
}

importFarmAgri().catch(console.error);
