/**
 * Test Veterinary College Generation
 * 
 * This script tests if the backend correctly generates Veterinary college options
 */

const API_BASE = 'http://localhost:5000/api';

async function testVeterinaryGeneration() {
    console.log('🧪 Testing Veterinary College Generation\n');

    const userId = 'test-vet-user-' + Date.now();

    try {
        // Step 1: Save Veterinary rank
        console.log('Step 1: Saving Veterinary rank...');
        const saveResponse = await fetch(`${API_BASE}/options/ranks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                counsellingType: 'UGCET',
                courseCategory: 'Veterinary',
                theoryRank: 5000,
                practicalRank: 4800,
                baseCategory: 'GM'
            })
        });

        const saveResult = await saveResponse.json();
        console.log('✅ Rank saved:', saveResult.success ? 'SUCCESS' : 'FAILED');

        if (!saveResult.success) {
            console.error('❌ Error:', saveResult.error);
            return;
        }

        // Step 2: Generate options
        console.log('\nStep 2: Generating Veterinary college options...');
        const generateResponse = await fetch(`${API_BASE}/options/generate/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const generateResult = await generateResponse.json();

        if (!generateResult.success) {
            console.error('❌ Generation failed:', generateResult.error);
            return;
        }

        const options = generateResult.data.recommendations;
        console.log(`\n✅ Generated ${options.length} Veterinary college options\n`);

        // Display first 10 options
        console.log('📋 Top 10 Veterinary College Options:\n');
        options.slice(0, 10).forEach((opt, index) => {
            console.log(`${index + 1}. ${opt.collegeName}`);
            console.log(`   Branch: ${opt.branchName}`);
            console.log(`   College Code: ${opt.collegeCode}`);
            console.log(`   Cutoff: ${opt.cutoffRank} | Probability: ${(opt.probability * 100).toFixed(1)}% | Tier: ${opt.tier}`);
            console.log('');
        });

        // Check if colleges are Veterinary-related
        const vetKeywords = ['veterinary', 'vet', 'animal', 'farm', 'agriculture'];
        const vetColleges = options.filter(opt =>
            vetKeywords.some(keyword =>
                opt.collegeName.toLowerCase().includes(keyword) ||
                opt.branchName.toLowerCase().includes(keyword)
            )
        );

        console.log(`\n📊 Analysis:`);
        console.log(`   Total options: ${options.length}`);
        console.log(`   Veterinary/Farm-related: ${vetColleges.length}`);
        console.log(`   Percentage: ${((vetColleges.length / options.length) * 100).toFixed(1)}%`);

        if (vetColleges.length === 0) {
            console.log('\n⚠️  WARNING: No Veterinary-specific colleges found!');
            console.log('   This suggests the data might be from Engineering colleges.');
        } else {
            console.log('\n✅ SUCCESS: Veterinary colleges are being returned!');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testVeterinaryGeneration();
