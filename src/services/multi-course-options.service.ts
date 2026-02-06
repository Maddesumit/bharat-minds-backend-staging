/**
 * Multi-Course College Options Generator Service
 * 
 * Generates college options for Engineering, Veterinary, Medical, and Agriculture courses
 * by querying from respective Appwrite collections.
 * 
 * Collections:
 * - Engineering: historical_cutoffs (normalized)
 * - Veterinary: farming_vet_cutoffs (normalized)
 * - Medical: Farm_Agri or Farm_AgriV2 (wide format)
 * - Agriculture: farming_vet_cutoffs (normalized)
 */

import { databases, config } from '../config/appwrite.config';
import { Query } from 'node-appwrite';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateOptionsInput {
    rank: number;
    category: string;
    courseType: 'Engineering' | 'Veterinary' | 'Medical' | 'Agriculture';
    courseCodes?: string[];
    collegeCodes?: string[];
    seatType?: string;
    riskLevel?: 'safe' | 'moderate' | 'aggressive';
    branches?: string[];
    locations?: string[];
    degrees?: string[];
}

export interface CollegeOption {
    optionId: string;
    collegeCode: string;
    collegeName: string;
    courseCode: string;
    courseName: string;
    branch: string;
    category: string;
    cutoffRank: number;
    admissionProbability: number;
    riskLevel: 'safe' | 'moderate' | 'aggressive';
    year: number;
    round: number;
    location?: string;
    degree?: string;
}

export interface GenerateOptionsResult {
    success: boolean;
    courseType: string;
    totalOptions: number;
    safe: CollegeOption[];
    moderate: CollegeOption[];
    aggressive: CollegeOption[];
    summary: {
        safeCount: number;
        moderateCount: number;
        aggressiveCount: number;
    };
    error?: string;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate college options based on course type
 */
export async function generateMultiCourseOptions(
    input: GenerateOptionsInput
): Promise<GenerateOptionsResult> {
    try {
        console.log(`🎓 Generating options for ${input.courseType}...`);
        console.log(`   Rank: ${input.rank}, Category: ${input.category}`);

        // Route to appropriate generator based on course type
        switch (input.courseType) {
            case 'Engineering':
                return await generateEngineeringOptions(input);

            case 'Veterinary':
            case 'Agriculture':
                return await generateFarmingVetOptions(input);

            case 'Medical':
                return await generateMedicalOptions(input);

            default:
                return {
                    success: false,
                    courseType: input.courseType,
                    totalOptions: 0,
                    safe: [],
                    moderate: [],
                    aggressive: [],
                    summary: { safeCount: 0, moderateCount: 0, aggressiveCount: 0 },
                    error: `Unsupported course type: ${input.courseType}`
                };
        }
    } catch (error: any) {
        console.error('❌ Generate options error:', error);
        return {
            success: false,
            courseType: input.courseType,
            totalOptions: 0,
            safe: [],
            moderate: [],
            aggressive: [],
            summary: { safeCount: 0, moderateCount: 0, aggressiveCount: 0 },
            error: error.message
        };
    }
}

// ============================================================================
// ENGINEERING OPTIONS (historical_cutoffs collection)
// ============================================================================

async function generateEngineeringOptions(
    input: GenerateOptionsInput
): Promise<GenerateOptionsResult> {
    console.log('🔧 Generating Engineering options from historical_cutoffs...');

    const { rank, category } = input;

    // Calculate search range based on risk levels
    const ranges = {
        safe: { min: Math.max(1, rank - 15000), max: rank - 5000 },
        moderate: { min: Math.max(1, rank - 5000), max: rank + 2000 },
        aggressive: { min: rank + 2000, max: rank + 10000 }
    };

    const allOptions: CollegeOption[] = [];

    // Query for each risk level
    for (const [riskLevel, range] of Object.entries(ranges)) {
        try {
            const queries = [
                Query.equal('category', category),
                Query.greaterThanEqual('cutoffRank', range.min),
                Query.lessThanEqual('cutoffRank', range.max),
                Query.limit(100)
            ];

            const result = await databases.listDocuments(
                config.databaseId,
                'historical_cutoffs',
                queries
            );

            console.log(`   ${riskLevel}: Found ${result.documents.length} options`);

            result.documents.forEach((doc: any) => {
                const probability = calculateProbability(doc.cutoffRank, rank);

                allOptions.push({
                    optionId: doc.$id,
                    collegeCode: doc.collegeCode || 'UNKNOWN',
                    collegeName: doc.collegeName || 'Unknown College',
                    courseCode: doc.branchCode || 'UNKNOWN',
                    courseName: doc.branchName || 'Unknown Course',
                    branch: doc.branchName || 'Unknown',
                    category: doc.category,
                    cutoffRank: doc.cutoffRank,
                    admissionProbability: probability,
                    riskLevel: riskLevel as 'safe' | 'moderate' | 'aggressive',
                    year: doc.academicYear || 2024,
                    round: doc.round || 1
                });
            });
        } catch (error: any) {
            console.error(`   Error fetching ${riskLevel} options:`, error.message);
        }
    }

    return categorizeOptions(allOptions, 'Engineering');
}

// ============================================================================
// FARMING & VETERINARY OPTIONS (farming_vet_cutoffs collection)
// ============================================================================

async function generateFarmingVetOptions(
    input: GenerateOptionsInput
): Promise<GenerateOptionsResult> {
    console.log(`🌾 Generating ${input.courseType} options from farming_vet_cutoffs...`);

    const { rank, category, branches, locations, degrees } = input;
    const currentYear = 2024;

    // Calculate effective rank based on risk level
    const riskMultipliers = {
        safe: 0.85,
        moderate: 1.0,
        aggressive: 1.15
    };

    const allOptions: CollegeOption[] = [];

    // Query for each risk level
    for (const [riskLevel, multiplier] of Object.entries(riskMultipliers)) {
        try {
            const effectiveRank = Math.floor(rank * multiplier);

            const queries = [
                Query.equal('category', category),
                Query.equal('year', currentYear),
                Query.lessThanEqual('cutoff_rank', effectiveRank),
                Query.orderDesc('cutoff_rank'),
                Query.limit(50)
            ];

            const cutoffs = await databases.listDocuments(
                config.databaseId,
                'farming_vet_cutoffs',
                queries
            );

            console.log(`   ${riskLevel}: Found ${cutoffs.documents.length} cutoffs`);

            // Fetch course and college details for each cutoff
            for (const cutoff of cutoffs.documents) {
                try {
                    // Get course details
                    const course = await databases.getDocument(
                        config.databaseId,
                        'farming_vet_courses',
                        cutoff.course_id
                    );

                    // Apply filters if specified
                    if (branches && branches.length > 0 && !branches.includes(course.branch)) {
                        continue;
                    }
                    if (degrees && degrees.length > 0 && !degrees.includes(course.degree)) {
                        continue;
                    }

                    // Get college details
                    const college = await databases.getDocument(
                        config.databaseId,
                        'farming_vet_colleges',
                        course.college_id
                    );

                    // Apply location filter if specified
                    if (locations && locations.length > 0 && !locations.includes(college.location)) {
                        continue;
                    }

                    const probability = calculateProbability(cutoff.cutoff_rank, rank);

                    allOptions.push({
                        optionId: cutoff.$id,
                        collegeCode: college.college_id,
                        collegeName: college.college_name,
                        courseCode: course.course_code,
                        courseName: course.course_name,
                        branch: course.branch,
                        category: cutoff.category,
                        cutoffRank: cutoff.cutoff_rank,
                        admissionProbability: probability,
                        riskLevel: riskLevel as 'safe' | 'moderate' | 'aggressive',
                        year: cutoff.year,
                        round: cutoff.round,
                        location: college.location,
                        degree: course.degree
                    });
                } catch (error: any) {
                    // Skip if course/college not found
                    console.warn(`   Skipping cutoff ${cutoff.$id}: ${error.message}`);
                }
            }
        } catch (error: any) {
            console.error(`   Error fetching ${riskLevel} options:`, error.message);
        }
    }

    return categorizeOptions(allOptions, input.courseType);
}

// ============================================================================
// MEDICAL OPTIONS (Farm_Agri/Farm_AgriV2 collections - wide format)
// ============================================================================

async function generateMedicalOptions(
    input: GenerateOptionsInput
): Promise<GenerateOptionsResult> {
    console.log('🏥 Generating Medical options from Farm_Agri collections...');

    const { rank, category } = input;

    // Map category to attribute name (e.g., 'GM' -> 'attr_gm')
    const categoryAttr = sanitizeAttributeId(category);

    // Calculate search range
    const ranges = {
        safe: { min: Math.max(1, rank - 15000), max: rank - 5000 },
        moderate: { min: Math.max(1, rank - 5000), max: rank + 2000 },
        aggressive: { min: rank + 2000, max: rank + 10000 }
    };

    const allOptions: CollegeOption[] = [];

    // Try both collections
    const collectionsToTry = ['Farm_Agri', 'Farm_AgriV2'];

    for (const collectionName of collectionsToTry) {
        try {
            console.log(`   Trying ${collectionName}...`);

            for (const [riskLevel, range] of Object.entries(ranges)) {
                try {
                    const queries = [
                        Query.greaterThanEqual(categoryAttr, range.min),
                        Query.lessThanEqual(categoryAttr, range.max),
                        Query.limit(100)
                    ];

                    const result = await databases.listDocuments(
                        config.databaseId,
                        collectionName,
                        queries
                    );

                    console.log(`   ${riskLevel}: Found ${result.documents.length} options`);

                    result.documents.forEach((doc: any) => {
                        const cutoffRank = doc[categoryAttr];
                        const probability = calculateProbability(cutoffRank, rank);

                        allOptions.push({
                            optionId: doc.$id,
                            collegeCode: doc.college_id || doc.collegeCode || 'UNKNOWN',
                            collegeName: doc.college || doc.collegeName || 'Unknown College',
                            courseCode: doc.branch || 'MEDICAL',
                            courseName: doc.branch || 'Medical Course',
                            branch: doc.branch || 'Medical',
                            category: category,
                            cutoffRank: cutoffRank,
                            admissionProbability: probability,
                            riskLevel: riskLevel as 'safe' | 'moderate' | 'aggressive',
                            year: doc.year || 2024,
                            round: doc.round || 1
                        });
                    });
                } catch (error: any) {
                    console.error(`   Error fetching ${riskLevel} from ${collectionName}:`, error.message);
                }
            }

            // If we got results, break out of collection loop
            if (allOptions.length > 0) {
                console.log(`✅ Successfully fetched from ${collectionName}`);
                break;
            }
        } catch (error: any) {
            console.error(`   Failed to query ${collectionName}:`, error.message);
        }
    }

    return categorizeOptions(allOptions, 'Medical');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate admission probability based on rank difference
 */
function calculateProbability(cutoffRank: number, studentRank: number): number {
    const difference = cutoffRank - studentRank;

    if (difference >= 5000) return 95;
    if (difference >= 2000) return 85;
    if (difference >= 0) return 70;
    if (difference >= -2000) return 50;
    if (difference >= -5000) return 30;
    return 15;
}

/**
 * Sanitize attribute ID for wide-format collections
 */
function sanitizeAttributeId(header: string): string {
    let sanitized = header.trim().replace(/[^a-zA-Z0-9]/g, '_');
    if (/^[0-9]/.test(sanitized)) {
        sanitized = 'attr_' + sanitized;
    }
    if (sanitized.length > 32) {
        sanitized = sanitized.substring(0, 32);
    }
    return sanitized.toLowerCase();
}

/**
 * Categorize options by risk level and deduplicate
 */
function categorizeOptions(
    options: CollegeOption[],
    courseType: string
): GenerateOptionsResult {
    // Deduplicate by college + course combination
    const uniqueMap = new Map<string, CollegeOption>();

    options.forEach(option => {
        const key = `${option.collegeCode}-${option.courseCode}-${option.riskLevel}`;
        if (!uniqueMap.has(key) || option.admissionProbability > uniqueMap.get(key)!.admissionProbability) {
            uniqueMap.set(key, option);
        }
    });

    const dedupedOptions = Array.from(uniqueMap.values());

    // Sort by probability (descending) within each risk level
    const safe = dedupedOptions
        .filter(o => o.riskLevel === 'safe')
        .sort((a, b) => b.admissionProbability - a.admissionProbability);

    const moderate = dedupedOptions
        .filter(o => o.riskLevel === 'moderate')
        .sort((a, b) => b.admissionProbability - a.admissionProbability);

    const aggressive = dedupedOptions
        .filter(o => o.riskLevel === 'aggressive')
        .sort((a, b) => b.admissionProbability - a.admissionProbability);

    return {
        success: true,
        courseType,
        totalOptions: dedupedOptions.length,
        safe,
        moderate,
        aggressive,
        summary: {
            safeCount: safe.length,
            moderateCount: moderate.length,
            aggressiveCount: aggressive.length
        }
    };
}

/**
 * Generate options (backward compatibility wrapper)
 */
export async function generateOptions(params: {
    rank: number;
    category: string;
    courseType?: string;
    courseCodes?: string[];
    collegeCodes?: string[];
    seatType?: string;
}) {
    // Default to Engineering if not specified
    const courseType = (params.courseType || 'Engineering') as any;

    const result = await generateMultiCourseOptions({
        rank: params.rank,
        category: params.category,
        courseType,
        courseCodes: params.courseCodes,
        collegeCodes: params.collegeCodes,
        seatType: params.seatType
    });

    // Return flat list for backward compatibility
    return [
        ...result.safe,
        ...result.moderate,
        ...result.aggressive
    ];
}
