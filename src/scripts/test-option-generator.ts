
import { generateOptions } from '../services/option-generator.service';

async function test() {
    console.log(' Testing Option Generator...');

    // Test Case 1: Rank 5000, GM, CS Branch
    console.log('\n--- Test Case 1: Rank 5000, GM, CS ---');
    const options1 = await generateOptions({
        rank: 5000,
        category: 'GM',
        courseCodes: ['CS'],
        seatType: 'Government'
    });

    console.log(`\nFound ${options1.length} options:`);
    options1.slice(0, 5).forEach(o => {
        console.log(`- [${o.collegeCode}] ${o.collegeName} (${o.branchCode}): Cutoff ${o.cutoffRank} -> Prob: ${o.probabilityLabel} (${o.probability}%)`);
    });

    // Test Case 2: Rank 10000, GM, Any Branch
    console.log('\n--- Test Case 2: Rank 10000, GM, Any Branch ---');
    const options2 = await generateOptions({
        rank: 10000,
        category: 'GM',
        seatType: 'Government'
    });

    console.log(`\nFound ${options2.length} options:`);
    options2.slice(0, 5).forEach(o => {
        console.log(`- [${o.collegeCode}] ${o.collegeName} (${o.branchCode}): Cutoff ${o.cutoffRank} -> Prob: ${o.probabilityLabel} (${o.probability}%)`);
    });
}

test();
