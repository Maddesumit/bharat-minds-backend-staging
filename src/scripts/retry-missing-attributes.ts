
import { databases, config, isAppwriteConfigured } from '../config/appwrite.config';

const COLLECTION_ID = "farm_agri";
const ATTRIBUTES_TO_RETRY = [
    { header: '2BG', attrId: 'attr_2bg', type: 'float' },
    { header: '3AK', attrId: 'attr_3ak', type: 'float' },
    { header: '3BG', attrId: 'attr_3bg', type: 'float' },
    { header: 'STK', attrId: 'stk', type: 'float' },
];

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryAttributeCreation() {
    console.log(`\n🔧 Retrying 4 Missing Attributes for Farm_Agri\n`);

    if (!isAppwriteConfigured()) {
        console.error('❌ Appwrite not configured');
        return;
    }

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < ATTRIBUTES_TO_RETRY.length; i++) {
        const { header, attrId, type } = ATTRIBUTES_TO_RETRY[i];
        console.log(`[${i + 1}/4] Creating "${header}" -> "${attrId}" (${type})`);

        let created = false;
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                if (type === 'float') {
                    await databases.createFloatAttribute(config.databaseId, COLLECTION_ID, attrId, false);
                }
                console.log(`    ✅ Created on attempt ${attempt}\n`);
                successCount++;
                created = true;
                break;
            } catch (error: any) {
                if (error.code === 409) {
                    // Already exists
                    console.log(`    ✅ Already exists\n`);
                    successCount++;
                    created = true;
                    break;
                } else {
                    console.log(`    ⚠️  Attempt ${attempt}/5 failed: ${error.message}`);
                    if (attempt < 5) {
                        const waitTime = 2000 * attempt;
                        console.log(`    ⏳ Waiting ${waitTime}ms before retry...\n`);
                        await sleep(waitTime);
                    }
                }
            }
        }

        if (!created) {
            console.log(`    ❌ Failed after 5 attempts\n`);
            failedCount++;
        }

        // Pause between attributes
        if (i < ATTRIBUTES_TO_RETRY.length - 1) {
            await sleep(1000);
        }
    }

    // Summary
    console.log(`${'='.repeat(50)}`);
    console.log(`✅ RETRY COMPLETE`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Collection: ${COLLECTION_ID}`);
    console.log(`✓ Successfully Created/Found: ${successCount}/4`);
    console.log(`✗ Failed: ${failedCount}/4`);
    console.log(`${'='.repeat(50)}\n`);

    if (successCount === 4) {
        console.log(`🎉 All remaining attributes successfully created!`);
    } else if (successCount > 0) {
        console.log(`⚠️  ${successCount} attributes created, but ${failedCount} still failing.`);
        console.log(`Note: The collection is still functional with ${31 - failedCount} total attributes.`);
    }
}

retryAttributeCreation().catch(console.error);
