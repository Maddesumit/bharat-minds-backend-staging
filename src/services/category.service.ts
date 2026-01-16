

import { BaseCategory, ReservationFlags, CategoryVariant } from '../types/domain.types';

/**
 * Generate eligible categories using deterministic algorithm
 * 
 * @param baseCategory - Student's primary reservation category
 * @param flags - Reservation flags (Kannada, Rural, HK)
 * @returns Array of eligible category variants in stable order
 */
export function generateEligibleCategories(
    baseCategory: BaseCategory,
    flags: ReservationFlags
): CategoryVariant[] {
    const categories: Set<CategoryVariant> = new Set();
    const orderedCategories: CategoryVariant[] = [];

   
    const basePrefix = baseCategory === BaseCategory.GM
        ? 'GM'
        : baseCategory.slice(0, -1); // Remove trailing 'G'

   
    const base = baseCategory;
    if (!categories.has(base)) {
        categories.add(base);
        orderedCategories.push(base);
    }

  
    if (flags.hasKannada) {
        const kannadaVariant = baseCategory === BaseCategory.GM
            ? 'GMK'
            : `${basePrefix}K`;

        if (!categories.has(kannadaVariant)) {
            categories.add(kannadaVariant);
            orderedCategories.push(kannadaVariant);
        }
    }

   
    if (flags.hasRural) {
        const ruralVariant = baseCategory === BaseCategory.GM
            ? 'GMR'
            : `${basePrefix}R`;

        if (!categories.has(ruralVariant)) {
            categories.add(ruralVariant);
            orderedCategories.push(ruralVariant);
        }
    }

    if (flags.hasHK) {
        // Create a snapshot of current categories to iterate over
        const currentCategories = [...orderedCategories];

        for (const category of currentCategories) {
            // Append 'H' to each existing category
            const hkVariant = `${category}H`;

            if (!categories.has(hkVariant)) {
                categories.add(hkVariant);
                orderedCategories.push(hkVariant);
            }
        }
    }

   

    return orderedCategories;
}

/**
 * Validate that a category variant is in the eligible list
 * 
 * @param category - Category variant to check
 * @param eligibleCategories - List of eligible categories for the user
 * @returns true if category is eligible, false otherwise
 */
export function isCategoryEligible(
    category: CategoryVariant,
    eligibleCategories: CategoryVariant[]
): boolean {
    return eligibleCategories.includes(category);
}

/**
 * Get seat type priority order for a given counselling type
 * Used for automatic preference sorting
 * 
 * @param counsellingType - UGCET or UGNEET
 * @returns Array of seat types in priority order (Government first)
 */
export function getSeatTypePriority(counsellingType: string): string[] {
    if (counsellingType === 'UGNEET') {
        return ['G', 'P', 'Q', 'N']; // Government, Private, Management, NRI
    } else {
        return ['G', 'A', 'P']; // Government, Aided, Private
    }
}

/**
 * Test cases for category generation algorithm
 * Use these to verify correctness
 */
export const TEST_CASES = {
    case1: {
        input: {
            baseCategory: BaseCategory.CATEGORY_2A,
            flags: { hasKannada: true, hasRural: true, hasHK: true }
        },
        expected: ['2AG', '2AK', '2AR', '2AH', '2AKH', '2ARH']
    },
    case2: {
        input: {
            baseCategory: BaseCategory.CATEGORY_2A,
            flags: { hasKannada: false, hasRural: false, hasHK: false }
        },
        expected: ['2AG']
    },
    case3: {
        input: {
            baseCategory: BaseCategory.CATEGORY_2A,
            flags: { hasKannada: true, hasRural: false, hasHK: false }
        },
        expected: ['2AG', '2AK']
    },
    case4: {
        input: {
            baseCategory: BaseCategory.CATEGORY_2A,
            flags: { hasKannada: false, hasRural: false, hasHK: true }
        },
        expected: ['2AG', '2AH']
    },
    case5: {
        input: {
            baseCategory: BaseCategory.GM,
            flags: { hasKannada: true, hasRural: true, hasHK: true }
        },
        expected: ['GM', 'GMK', 'GMR', 'GMH', 'GMKH', 'GMRH']
    },
    case6: {
        input: {
            baseCategory: BaseCategory.SC,
            flags: { hasKannada: true, hasRural: false, hasHK: true }
        },
        expected: ['SCG', 'SCK', 'SCH', 'SCKH']
    },
};

/**
 * Run algorithm test cases
 * Returns true if all tests pass
 */
export function runTests(): boolean {
    let allTestsPassed = true;

    for (const [testName, testCase] of Object.entries(TEST_CASES)) {
        const result = generateEligibleCategories(
            testCase.input.baseCategory,
            testCase.input.flags
        );

        const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);

        if (!passed) {
            console.error(`❌ Test ${testName} failed:`);
            console.error(`Expected: ${testCase.expected.join(', ')}`);
            console.error(`Got: ${result.join(', ')}`);
            allTestsPassed = false;
        } else {
            console.log(`✅ Test ${testName} passed`);
        }
    }

    return allTestsPassed;
}

export default {
    generateEligibleCategories,
    isCategoryEligible,
    getSeatTypePriority,
    runTests,
    TEST_CASES,
};
