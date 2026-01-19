/**
 * Test Script for Eligible Categories Generator
 * 
 * Usage: npx ts-node src/scripts/test-eligible-categories.ts
 */

import {
    generateEligibleCategories,
    parseCategoryCode,
    getAllBaseCategories,
    getReservationExplanation,
    EXAMPLES,
    type EligibleCategoriesInput
} from '../utils/eligible-categories.util';

console.log('='.repeat(80));
console.log('KARNATAKA COUNSELLING - ELIGIBLE CATEGORIES GENERATOR');
console.log('='.repeat(80));

// Print explanation
console.log(getReservationExplanation());

console.log('\n' + '='.repeat(80));
console.log('RUNNING TEST EXAMPLES');
console.log('='.repeat(80));

// Example 1: Full reservations
console.log('\n📌 Example 1: Base=2A, Kannada=YES, Rural=YES, HK=YES');
console.log('-'.repeat(80));
const result1 = generateEligibleCategories(EXAMPLES.example1.input);
console.log('Input:', JSON.stringify(EXAMPLES.example1.input, null, 2));
console.log('\nEligible Categories:', result1);
console.log('✅ Expected:', EXAMPLES.example1.expected);
console.log('Match:', JSON.stringify(result1.sort()) === JSON.stringify(EXAMPLES.example1.expected.sort()) ? '✅' : '❌');

// Example 2: Only HK reservation
console.log('\n📌 Example 2: Base=GM, Kannada=NO, Rural=NO, HK=YES');
console.log('-'.repeat(80));
const result2 = generateEligibleCategories(EXAMPLES.example2.input);
console.log('Input:', JSON.stringify(EXAMPLES.example2.input, null, 2));
console.log('\nEligible Categories:', result2);
console.log('✅ Expected:', EXAMPLES.example2.expected);
console.log('Match:', JSON.stringify(result2.sort()) === JSON.stringify(EXAMPLES.example2.expected.sort()) ? '✅' : '❌');

// Example 3: Only Kannada reservation
console.log('\n📌 Example 3: Base=SC, Kannada=YES, Rural=NO, HK=NO');
console.log('-'.repeat(80));
const result3 = generateEligibleCategories(EXAMPLES.example3.input);
console.log('Input:', JSON.stringify(EXAMPLES.example3.input, null, 2));
console.log('\nEligible Categories:', result3);
console.log('✅ Expected:', EXAMPLES.example3.expected);
console.log('Match:', JSON.stringify(result3.sort()) === JSON.stringify(EXAMPLES.example3.expected.sort()) ? '✅' : '❌');

// Example 4: Kannada + Rural
console.log('\n📌 Example 4: Base=3B, Kannada=YES, Rural=YES, HK=NO');
console.log('-'.repeat(80));
const result4 = generateEligibleCategories(EXAMPLES.example4.input);
console.log('Input:', JSON.stringify(EXAMPLES.example4.input, null, 2));
console.log('\nEligible Categories:', result4);
console.log('✅ Expected:', EXAMPLES.example4.expected);
console.log('Match:', JSON.stringify(result4.sort()) === JSON.stringify(EXAMPLES.example4.expected.sort()) ? '✅' : '❌');

// Additional test: All base categories
console.log('\n' + '='.repeat(80));
console.log('ALL BASE CATEGORIES WITH ALL RESERVATIONS');
console.log('='.repeat(80));

const allBases = getAllBaseCategories();
console.log('\n📊 Generating for all base categories with full reservations:\n');

allBases.forEach(base => {
    const input: EligibleCategoriesInput = {
        baseCategory: base,
        reservations: {
            kannada: true,
            rural: true,
            hyderabadKarnataka: true
        }
    };

    const categories = generateEligibleCategories(input);
    console.log(`${base.padEnd(4)} → ${categories.join(', ')}`);
    console.log(`      (${categories.length} eligible categories)`);
});

// Parse category codes
console.log('\n' + '='.repeat(80));
console.log('PARSING CATEGORY CODES');
console.log('='.repeat(80));

const testCodes = ['2A', '2AK', '2AR', '2AH', '2AKR', '2AKH', '2ARH', '2AKRH', 'GM', 'GMH', 'SCKR'];

console.log('\n📋 Parsing category codes:\n');
testCodes.forEach(code => {
    const parsed = parseCategoryCode(code);
    console.log(`${code.padEnd(10)} → Base: ${parsed.base}, K: ${parsed.hasKannada}, R: ${parsed.hasRural}, H: ${parsed.hasHK}`);
});

// Real-world simulation
console.log('\n' + '='.repeat(80));
console.log('REAL-WORLD SIMULATION');
console.log('='.repeat(80));

console.log('\n🎓 Student Profile Simulation:\n');

const studentProfiles = [
    {
        name: 'Ravi Kumar',
        baseCategory: '2A' as const,
        kannada: true,
        rural: true,
        hk: false,
        description: 'Category 2A student from rural area studying in Kannada medium'
    },
    {
        name: 'Priya Sharma',
        baseCategory: 'GM' as const,
        kannada: false,
        rural: false,
        hk: true,
        description: 'General Merit student from Hyderabad Karnataka region'
    },
    {
        name: 'Manjunath',
        baseCategory: '3B' as const,
        kannada: true,
        rural: false,
        hk: true,
        description: 'Category 3B student in Kannada medium from HK region'
    }
];

studentProfiles.forEach((student, index) => {
    console.log(`${index + 1}. ${student.name}`);
    console.log(`   ${student.description}`);

    const input: EligibleCategoriesInput = {
        baseCategory: student.baseCategory,
        reservations: {
            kannada: student.kannada,
            rural: student.rural,
            hyderabadKarnataka: student.hk
        }
    };

    const categories = generateEligibleCategories(input);
    console.log(`   Eligible to apply under: ${categories.join(', ')}`);
    console.log(`   Total options: ${categories.length} categories`);
    console.log('');
});

console.log('='.repeat(80));
console.log('✅ ALL TESTS COMPLETED!');
console.log('='.repeat(80));
console.log('\n💡 This utility can be integrated into your option generator service.\n');
