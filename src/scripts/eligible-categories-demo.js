/**
 * Karnataka Counselling - Eligible Categories Generator
 * Simple JavaScript version for easy testing
 * 
 * Usage: node src/scripts/eligible-categories-demo.js
 */

// Generate all eligible category combinations
function generateEligibleCategories(baseCategory, kannada, rural, hyderabadKarnataka) {
    const categories = [];

    // Always include base category
    categories.push(baseCategory);

    // Collect active suffixes
    const suffixes = [];
    if (kannada) suffixes.push('K');
    if (rural) suffixes.push('R');
    if (hyderabadKarnataka) suffixes.push('H');

    // Generate all combinations
    if (suffixes.length > 0) {
        // Single suffixes
        for (const suffix of suffixes) {
            categories.push(baseCategory + suffix);
        }

        // Combinations of 2 suffixes
        if (suffixes.length >= 2) {
            for (let i = 0; i < suffixes.length; i++) {
                for (let j = i + 1; j < suffixes.length; j++) {
                    categories.push(baseCategory + suffixes[i] + suffixes[j]);
                }
            }
        }

        // All 3 suffixes
        if (suffixes.length === 3) {
            categories.push(baseCategory + suffixes.join(''));
        }
    }

    return [...new Set(categories)].sort();
}

// Main demo
console.log('='.repeat(80));
console.log('KARNATAKA COUNSELLING - ELIGIBLE CATEGORIES GENERATOR');
console.log('='.repeat(80));

console.log('\n📖 RESERVATION SYSTEM EXPLANATION:');
console.log(`
1. BASE CATEGORIES:
   GM (General Merit), 1, 2A, 2B, 3A, 3B, SC, ST

2. RESERVATION SUFFIXES:
   K = Kannada Medium/Language reservation
   R = Rural area reservation
   H = Hyderabad Karnataka (371J certificate)

3. COMBINATION RULES:
   - Base category is always eligible
   - Add combinations based on active reservations
`);

console.log('='.repeat(80));
console.log('TEST EXAMPLES');
console.log('='.repeat(80));

// Example 1: Base=2A, all reservations
console.log('\n📌 Example 1: Full Reservations');
console.log('-'.repeat(80));
console.log('Base Category: 2A');
console.log('Kannada: YES, Rural: YES, HK: YES');
const result1 = generateEligibleCategories('2A', true, true, true);
console.log('\nEligible Categories:', result1);
console.log('Count:', result1.length);

// Example 2: Base=GM, only HK
console.log('\n📌 Example 2: Only HK Reservation');
console.log('-'.repeat(80));
console.log('Base Category: GM');
console.log('Kannada: NO, Rural: NO, HK: YES');
const result2 = generateEligibleCategories('GM', false, false, true);
console.log('\nEligible Categories:', result2);
console.log('Count:', result2.length);

// Example 3: Base=SC, only Kannada
console.log('\n📌 Example 3: Only Kannada Reservation');
console.log('-'.repeat(80));
console.log('Base Category: SC');
console.log('Kannada: YES, Rural: NO, HK: NO');
const result3 = generateEligibleCategories('SC', true, false, false);
console.log('\nEligible Categories:', result3);
console.log('Count:', result3.length);

// Example 4: Base=3B, Kannada + Rural
console.log('\n📌 Example 4: Kannada + Rural Reservations');
console.log('-'.repeat(80));
console.log('Base Category: 3B');
console.log('Kannada: YES, Rural: YES, HK: NO');
const result4 = generateEligibleCategories('3B', true, true, false);
console.log('\nEligible Categories:', result4);
console.log('Count:', result4.length);

// All base categories with full reservations
console.log('\n' + '='.repeat(80));
console.log('ALL BASE CATEGORIES (with full reservations)');
console.log('='.repeat(80));

const allBases = ['GM', '1', '2A', '2B', '3A', '3B', 'SC', 'ST'];

console.log('\n Results:\n');
allBases.forEach(base => {
    const categories = generateEligibleCategories(base, true, true, true);
    console.log(`${base.padEnd(4)} → ${categories.join(', ')}`);
    console.log(`      (${categories.length} categories)`);
});

// Real-world simulation
console.log('\n' + '='.repeat(80));
console.log('REAL-WORLD STUDENT PROFILES');
console.log('='.repeat(80));

const students = [
    {
        name: 'Ravi Kumar',
        base: '2A',
        kannada: true,
        rural: true,
        hk: false,
        desc: 'Category 2A from rural Kannada-medium school'
    },
    {
        name: 'Priya Sharma',
        base: 'GM',
        kannada: false,
        rural: false,
        hk: true,
        desc: 'General Merit from Hyderabad Karnataka region'
    },
    {
        name: 'Manjunath',
        base: '3B',
        kannada: true,
        rural: false,
        hk: true,
        desc: 'Category 3B Kannada-medium from HK region'
    },
    {
        name: 'Lakshmi',
        base: 'ST',
        kannada: true,
        rural: true,
        hk: true,
        desc: 'ST category with all reservations'
    }
];

console.log('');
students.forEach((student, i) => {
    console.log(`${i + 1}. ${student.name}`);
    console.log(`   ${student.desc}`);
    console.log(`   Reservations: Kannada=${student.kannada ? 'Yes' : 'No'}, Rural=${student.rural ? 'Yes' : 'No'}, HK=${student.hk ? 'Yes' : 'No'}`);

    const categories = generateEligibleCategories(student.base, student.kannada, student.rural, student.hk);
    console.log(`   Can apply under: ${categories.join(', ')}`);
    console.log(`   Total options: ${categories.length} categories`);
    console.log('');
});

console.log('='.repeat(80));
console.log(' DEMO COMPLETED!');
console.log('='.repeat(80));

console.log('\n💡 Next Steps:');
console.log('   1. Integrate this into your option generator service');
console.log('   2. Use eligible categories when querying cutoff data');
console.log('   3. Match student ranks against all eligible categories');
console.log('');

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateEligibleCategories };
}
