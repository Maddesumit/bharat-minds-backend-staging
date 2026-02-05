
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { ID, Permission, Role } from 'node-appwrite';
import { databases, config, isAppwriteConfigured } from '../config/appwrite.config';

// Collection Name
const COLLECTION_NAME = "Farm_Agri";
const COLLECTION_ID = "farm_agri"; // URL-friendly ID

// Sanitize Header for Appwrite Attribute ID
function sanitizeAttributeId(header: string): string {
    // 1. Replace non-alphanumeric chars with underscore
    let sanitized = header.trim().replace(/[^a-zA-Z0-9]/g, '_');
    // 2. Ensure starts with letter (if starts with number, prefix with 'attr_')
    if (/^[0-9]/.test(sanitized)) {
        sanitized = 'attr_' + sanitized;
    }
    // 3. Max 32 chars
    if (sanitized.length > 32) {
        sanitized = sanitized.substring(0, 32);
    }
    // 4. Handle empty or result being just underscores?
    if (!sanitized) sanitized = 'attr_unknown';

    // Lowercase strictly? Appwrite IDs are case insensitive usually but conventions matter.
    return sanitized.toLowerCase();
}

// Detect Attribute Type based on data samples
function detectType(values: string[]): 'string' | 'integer' | 'double' {
    let isInt = true;
    let isDouble = true;
    let hasValue = false;

    for (const val of values) {
        if (!val || val.trim() === '') continue;
        hasValue = true;
        const num = Number(val);
        if (isNaN(num)) {
            return 'string';
        }
        if (!Number.isInteger(num)) {
            isInt = false;
        }
    }
    if (!hasValue) return 'string'; // Default to string if empty
    // Always use double for numbers to avoid precision loss on cutoffs (e.g. 0 vs 0.5)
    return 'double';
}

async function importFarmAgri() {
    console.log(`\n🚜 Starting ${COLLECTION_NAME} Import...\n`);

    if (!isAppwriteConfigured()) {
        console.error('❌ Appwrite configuration missing');
        return;
    }

    const csvFiles = [
        'data/updated_FoodSc_file(in).csv',
        'data/updated_FoodSc_HK_file(in).csv'
    ];

    for (const fileName of csvFiles) {
        const csvPath = path.join(process.cwd(), fileName);
        console.log(`\n📂 Processing ${fileName}...`);

        if (!fs.existsSync(csvPath)) {
            console.error(`❌ File not found: ${csvPath}`);
            continue;
        }

        // Read CSV
        const fileContent = fs.readFileSync(csvPath, 'utf-8');
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
        console.log(`📋 Found ${headers.length} columns:`, headers.join(', '));
        console.log(`📄 Found ${records.length} records`);

        // 1. Create Collection
        console.log(`\n🔨 Creating Collection '${COLLECTION_NAME}'...`);
        try {
            // Check if exists
            try {
                await databases.getCollection(config.databaseId, COLLECTION_ID);
                console.log(`⚠️ Collection ${COLLECTION_ID} already exists. Skipping creation.`);
            } catch (e) {
                await databases.createCollection(
                    config.databaseId,
                    COLLECTION_ID,
                    COLLECTION_NAME,
                    [Permission.read(Role.any())]
                );
                console.log(`✅ Collection Created: ${COLLECTION_ID}`);
            }
        } catch (error: any) {
            console.error(`❌ Error creating collection: ${error.message}`);
            return;
        }

        // 2. Create Attributes
        console.log(`\n🔧 Defining Attributes...`);
        const attributeMap: { [key: string]: string } = {}; // Header -> AttributeID

        const typeMap: { [key: string]: 'string' | 'integer' | 'double' } = {};

        for (const header of headers) {
            const attrKey = sanitizeAttributeId(header);
            attributeMap[header] = attrKey;

            // Sample values to detect type
            const samples = records.slice(0, 100).map((r: any) => r[header]);
            const type = detectType(samples);
            typeMap[header] = type;


            console.log(`   Field: "${header}" -> ID: "${attrKey}" (${type})`);

            try {
                if (type === 'string') {
                    await databases.createStringAttribute(config.databaseId, COLLECTION_ID, attrKey, 1000, false); // 1000 chars for safety
                } else if (type === 'integer') {
                    await databases.createIntegerAttribute(config.databaseId, COLLECTION_ID, attrKey, false);
                } else if (type === 'double') {
                    await databases.createFloatAttribute(config.databaseId, COLLECTION_ID, attrKey, false);
                }
            } catch (e: any) {
                if (e.code === 409) {
                    // Already exists
                    // console.log(`      (Attribute exists)`);
                } else {
                    console.error(`      ❌ Failed to create attribute: ${e.message}`);
                }
            }
            // Small delay to prevent network saturation
            await new Promise(r => setTimeout(r, 200));
        }

        // Wait for attributes to be ready (Appwrite is async)
        console.log(`\n⏳ Waiting for attributes to index (5s)...`);
        await new Promise(r => setTimeout(r, 5000));

        // 3. Import Data
        console.log(`\n🚀 Importing Records...`);
        let success = 0;
        let failed = 0;

        // Process ALL records
        // const debugRecords = records.slice(0, 1);

        for (const [i, row] of records.entries()) {
            try {
                const data: any = {};
                for (const header of headers) {
                    const attrKey = attributeMap[header];
                    const type = typeMap[header];
                    const val = (row as any)[header];

                    if (val === '' || val === null || val === undefined) {
                        data[attrKey] = null;
                    } else {
                        if (type === 'integer') {
                            const num = parseInt(val, 10);
                            data[attrKey] = isNaN(num) ? null : num;
                        } else if (type === 'double') {
                            const num = parseFloat(val);
                            data[attrKey] = isNaN(num) ? null : num;
                        } else {
                            data[attrKey] = String(val);
                        }
                    }
                }

                // Remove empty keys or nulls if required? Appwrite handles optional.

                // Correction: We must cast to Number if attribute is numeric.
                // I will improve the script to remember types.

                // console.log("Debug payload:", JSON.stringify(data, null, 2));

                await databases.createDocument(
                    config.databaseId,
                    COLLECTION_ID,
                    ID.unique(),
                    data
                );
                success++;
                if (success % 50 === 0) process.stdout.write('.');

                // Delay
                await new Promise(r => setTimeout(r, 100));

            } catch (error: any) {
                failed++;
                console.error(`\n❌ Row ${i + 1} Failed: ${error.message}`);
            }
        }

        console.log(`\n\n✅ Import Complete!`);
        console.log(`   Success: ${success}`);
        console.log(`   Failed:  ${failed}`);
    }

    importFarmAgri();
