
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ID, Permission, Role } from 'node-appwrite';
import { databases, config, isAppwriteConfigured } from '../config/appwrite.config';

const COLLECTION_NAME = "Farm_Agri";
const COLLECTION_ID = "farm_agri";
const CSV_PATH = path.join(process.cwd(), 'data/updated_FoodSc_file(in).csv');
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryAsync<T>(
    fn: () => Promise<T>,
    operationName: string,
    maxRetries: number = MAX_RETRIES
): Promise<{ success: boolean; result?: T; error?: string }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            return { success: true, result };
        } catch (error: any) {
            console.log(`   ⚠️  ${operationName} attempt ${attempt}/${maxRetries} failed: ${error.message}`);
            if (attempt < maxRetries) {
                await sleep(RETRY_DELAY * attempt);
            } else {
                return { success: false, error: error.message };
            }
        }
    }
    return { success: false, error: 'Max retries exceeded' };
}

async function deleteExistingCollection(): Promise<void> {
    try {
        console.log(`🗑️  Deleting existing collection '${COLLECTION_ID}'...`);
        await databases.deleteCollection(config.databaseId, COLLECTION_ID);
        console.log(`✅ Collection deleted`);
        await sleep(5000);
    } catch (e: any) {
        if (e.code === 404) {
            console.log(`ℹ️  Collection doesn't exist`);
        } else {
            console.warn(`⚠️  Could not delete: ${e.message}`);
        }
    }
}

async function importFarmAgri() {
    console.log(`\n🚜 Starting ${COLLECTION_NAME} Import with Retry Logic\n`);

    if (!isAppwriteConfigured()) {
        console.error('❌ Appwrite not configured');
        return;
    }

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ CSV not found: ${CSV_PATH}`);
        return;
    }

    // Delete existing collection
    await deleteExistingCollection();

    // Read CSV
    console.log(`📂 Reading CSV...`);
    const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
    });

    const headers = Object.keys((records as any[])[0]);
    console.log(`✓ ${headers.length} columns, ${records.length} records\n`);

    // Create collection with retry
    console.log(`🔨 Creating Collection...`);
    const createResult = await retryAsync(
        () => databases.createCollection(
            config.databaseId,
            COLLECTION_ID,
            COLLECTION_NAME,
            [Permission.read(Role.any())]
        ),
        'Create collection'
    );

    if (!createResult.success) {
        console.error(`❌ Failed to create collection: ${createResult.error}`);
        return;
    }
    console.log(`✅ Collection created\n`);

    // Create attributes with retry
    console.log(`🔧 Creating ${headers.length} attributes with retry logic...\n`);
    const attributeMap: { [key: string]: { id: string; type: 'string' | 'float' } } = {};
    const failedAttributes = new Set<string>();

    for (const header of headers) {
        const attrId = sanitizeAttributeId(header);
        const samples = records.slice(0, 50).map((r: any) => r[header] || '');
        const type = detectType(samples);

        const attrResult = await retryAsync(
            () => {
                if (type === 'string') {
                    return databases.createStringAttribute(config.databaseId, COLLECTION_ID, attrId, 1000, false);
                } else {
                    return databases.createFloatAttribute(config.databaseId, COLLECTION_ID, attrId, false);
                }
            },
            `Create "${header}"`
        );

        if (attrResult.success) {
            attributeMap[header] = { id: attrId, type };
            console.log(`   ✓ ${header}`);
        } else {
            failedAttributes.add(header);
            console.log(`   ✗ ${header} - Will skip in import`);
        }

        await sleep(200);
    }

    const successfulHeaders = headers.filter(h => !failedAttributes.has(h));
    console.log(`\n✓ Successfully created: ${Object.keys(attributeMap).length}/${headers.length} attributes\n`);

    if (Object.keys(attributeMap).length === 0) {
        console.error('❌ No attributes created! Cannot import data.');
        return;
    }

    // Wait for indexing
    console.log(`⏳ Waiting 20 seconds for attribute indexing...`);
    await sleep(20000);

    // Import data with retry
    console.log(`\n🚀 Importing ${records.length} records...\n`);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const docData: any = {};

        // Build document with only successful attributes
        for (const header of successfulHeaders) {
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

        const importResult = await retryAsync(
            () => databases.createDocument(
                config.databaseId,
                COLLECTION_ID,
                ID.unique(),
                docData
            ),
            `Import row ${i + 1}`
        );

        if (importResult.success) {
            successCount++;
            if ((i + 1) % 20 === 0) {
                process.stdout.write(`\r✓ ${i + 1}/${records.length} records imported`);
            }
        } else {
            failedCount++;
            if (failedCount <= 5) { // Show first 5 errors
                console.log(`\n❌ Row ${i + 1}: ${importResult.error}`);
            }
        }

        if ((i + 1) % 5 === 0) {
            await sleep(300);
        }
    }

    // Summary
    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`✅ FARM_AGRI IMPORT COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Collection ID: ${COLLECTION_ID}`);
    console.log(`CSV File: updated_FoodSc_file(in).csv`);
    console.log(`Total Records: ${records.length}`);
    console.log(`✓ Successfully Imported: ${successCount}`);
    console.log(`✗ Failed: ${failedCount}`);
    console.log(`Attributes: ${Object.keys(attributeMap).length}/${headers.length}`);
    console.log(`${'='.repeat(60)}\n`);
}

importFarmAgri().catch(console.error);
