import { saveStudentRank, generateOptionList } from '../services/option-generator.service';
import '../config/dns.config';

async function verifyGeneration() {
    console.log('--- Verifying Option Generation Flow ---');
    const userId = 'gen_test_user_' + Date.now();

    try {
        // 1. Setup Profile
        console.log(`1. Saving rank for ${userId}...`);
        await saveStudentRank({
            userId,
            counsellingType: 'UGCET' as any,
            courseCategory: 'Engineering',
            generalMeritRank: 10000,
            theoryRank: 0,
            practicalRank: 0,
            baseCategory: 'GM'
        });

        // 2. Generate Options
        console.log(`2. Generating options for ${userId}...`);
        const start = Date.now();
        const result = await generateOptionList(userId) as any;
        const duration = Date.now() - start;

        console.log(`   Generation took ${duration}ms`);

        if (result.success) {
            console.log(`✅ Generation SUCCESS. Found ${result.data.recommendations.length} options.`);
            console.log('   Summary:', result.data.summary);
        } else {
            console.error('❌ Generation FAILED:', result.error);
        }

    } catch (error: any) {
        console.error('❌ Generation CRASHED:', error);
    }
}

verifyGeneration();
