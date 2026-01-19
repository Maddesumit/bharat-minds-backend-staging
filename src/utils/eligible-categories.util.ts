/**
 * Karnataka Counselling - Eligible Categories Generator
 * 
 * Calculates all eligible category combinations based on:
 * 1. Base Category (GM, 1, 2A, 2B, 3A, 3B, SC, ST)
 * 2. Kannada Medium/Language Reservation (K)
 * 3. Rural Reservation (R)
 * 4. Hyderabad Karnataka - 371J Certificate (H)
 * 
 * Example:
 * Base: 2A, Kannada: Yes, Rural: Yes, HK: Yes
 * Result: [2A, 2AK, 2AR, 2AH, 2AKH, 2ARH]
 */

export type BaseCategory = 'GM' | '1' | '2A' | '2B' | '3A' | '3B' | 'SC' | 'ST';

export interface ReservationFlags {
    kannada: boolean;      // Kannada Medium/Language reservation
    rural: boolean;        // Rural area reservation
    hyderabadKarnataka: boolean;  // HK - 371J certificate
}

export interface EligibleCategoriesInput {
    baseCategory: BaseCategory;
    reservations: ReservationFlags;
}

/**
 * Generate all eligible category combinations
 */
export function generateEligibleCategories(input: EligibleCategoriesInput): string[] {
    const { baseCategory, reservations } = input;
    const categories: string[] = [];

    // Always include base category
    categories.push(baseCategory);

    // Generate combinations based on active reservations
    const suffixes: string[] = [];

    if (reservations.kannada) {
        suffixes.push('K');
    }

    if (reservations.rural) {
        suffixes.push('R');
    }

    if (reservations.hyderabadKarnataka) {
        suffixes.push('H');
    }

    // Generate all possible combinations
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

        // Combination of all 3 suffixes
        if (suffixes.length === 3) {
            categories.push(baseCategory + suffixes.join(''));
        }
    }

    // Remove duplicates and sort
    return [...new Set(categories)].sort();
}

/**
 * Validate if a category code matches the reservation criteria
 */
export function isEligibleCategory(
    category: string,
    input: EligibleCategoriesInput
): boolean {
    const eligibleCategories = generateEligibleCategories(input);
    return eligibleCategories.includes(category);
}

/**
 * Get all possible base categories
 */
export function getAllBaseCategories(): BaseCategory[] {
    return ['GM', '1', '2A', '2B', '3A', '3B', 'SC', 'ST'];
}

/**
 * Parse a category code to extract base and suffixes
 */
export function parseCategoryCode(categoryCode: string): {
    base: string;
    hasKannada: boolean;
    hasRural: boolean;
    hasHK: boolean;
} {
    // Extract base category (GM, 1, 2A, 2B, 3A, 3B, SC, ST)
    let base = '';
    let remaining = categoryCode;

    const baseCategories = ['GM', '2A', '2B', '3A', '3B', 'SC', 'ST', '1'];
    for (const cat of baseCategories) {
        if (categoryCode.startsWith(cat)) {
            base = cat;
            remaining = categoryCode.substring(cat.length);
            break;
        }
    }

    return {
        base,
        hasKannada: remaining.includes('K'),
        hasRural: remaining.includes('R'),
        hasHK: remaining.includes('H')
    };
}

/**
 * Examples and test cases
 */
export const EXAMPLES = {
    example1: {
        input: {
            baseCategory: '2A' as BaseCategory,
            reservations: {
                kannada: true,
                rural: true,
                hyderabadKarnataka: true
            }
        },
        expected: ['2A', '2AK', '2AR', '2AH', '2AKR', '2AKH', '2ARH', '2AKRH']
    },
    example2: {
        input: {
            baseCategory: 'GM' as BaseCategory,
            reservations: {
                kannada: false,
                rural: false,
                hyderabadKarnataka: true
            }
        },
        expected: ['GM', 'GMH']
    },
    example3: {
        input: {
            baseCategory: 'SC' as BaseCategory,
            reservations: {
                kannada: true,
                rural: false,
                hyderabadKarnataka: false
            }
        },
        expected: ['SC', 'SCK']
    },
    example4: {
        input: {
            baseCategory: '3B' as BaseCategory,
            reservations: {
                kannada: true,
                rural: true,
                hyderabadKarnataka: false
            }
        },
        expected: ['3B', '3BK', '3BR', '3BKR']
    }
};

/**
 * Get explanation of reservations
 */
export function getReservationExplanation(): string {
    return `
Karnataka Counselling Reservation System:

1. BASE CATEGORIES:
   - GM: General Merit
   - 1: Category 1
   - 2A: Category 2A
   - 2B: Category 2B
   - 3A: Category 3A
   - 3B: Category 3B
   - SC: Scheduled Caste
   - ST: Scheduled Tribe

2. RESERVATION SUFFIXES:
   - K: Kannada Medium/Language reservation
   - R: Rural area reservation
   - H: Hyderabad Karnataka (371J certificate)

3. COMBINATION RULES:
   - Base category is always eligible
   - Add 'K' if Kannada reservation applies
   - Add 'R' if Rural reservation applies
   - Add 'H' if HK 371J certificate holder
   - All combinations of above suffixes are eligible

EXAMPLES:
- Base: 2A, K: Yes, R: Yes, H: Yes → [2A, 2AK, 2AR, 2AH, 2AKR, 2AKH, 2ARH, 2AKRH]
- Base: GM, K: No,  R: No,  H: Yes → [GM, GMH]
- Base: SC, K: Yes, R: No,  H: No  → [SC, SCK]
`;
}
