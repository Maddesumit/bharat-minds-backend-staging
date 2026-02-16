
import { Databases, Query, ID } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';
import { CounsellingType } from '../types/domain.types';

// ============================================================================
// DATABASE HELPERS WITH TIMEOUT & RETRY
// ============================================================================

/**
 * Wrapper for database operations with timeout and retry logic
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    timeoutMs: number = 30000
): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Create a timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
            });

            // Race between the operation and timeout
            const result = await Promise.race([
                operation(),
                timeoutPromise
            ]);

            return result;
        } catch (error: any) {
            lastError = error;
            console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);

            // Don't retry on the last attempt
            if (attempt < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, attempt - 1) * 1000;
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}


// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RankInput {
    userId: string;
    counsellingType: CounsellingType;
    courseCategory: string; // 'Engineering', 'Farm Science', 'Veterinary'
    branch?: string;
    generalMeritRank?: number;
    categoryRank?: number;
    theoryRank?: number;
    practicalRank?: number;
    baseCategory?: string; // Optional, defaults to GM if not provided
    snq?: boolean;
    attendedPractical?: boolean;
    practicalMarks?: number;
    specialCategories?: string[];
    incomeSlab?: string;
    preferredColleges?: string[];
}

export interface RecommendationInfo {
    optionId: string;
    collegeCode: string;
    collegeName: string;
    branchCode: string;
    branchName: string;
    category: string;
    cutoffRank: number;
    probability: number;
    tier: 'SAFE' | 'TARGET' | 'REACH';
    year: number;
    round: number;
}

export interface RecommendationSummary {
    reach: number;
    target: number;
    safe: number;
}

export interface GenerationResult {
    recommendations: RecommendationInfo[];
    summary: RecommendationSummary;
    listScore: number;
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Save Student Rank
 * Stores rank information in student profile
 */
export async function saveStudentRank(data: RankInput) {
    try {
        const profileId = data.userId; // Using userId as profile ID based on schema setup

        // Check if profile exists
        const profileDocs = await databases.listDocuments(
            config.databaseId,
            'student_profiles_v2',
            [Query.equal('userId', data.userId)]
        );

        let profile: any;

        // Map special categories to boolean flags
        const specialCats = data.specialCategories || [];

        const updateData: any = {
            generalMeritRank: data.generalMeritRank,
            theoryRank: data.theoryRank,
            practicalRank: data.practicalRank,
            courseCategory: data.courseCategory,
            baseCategory: data.baseCategory || 'GM',

            // Map frontend fields to DB schema
            snqEligible: data.snq,           // 'snq' -> 'snqEligible'
            // Transform 'Slab 1: <Rs 1 lakh' -> 'SLAB_1' to fit 10 char limit
            snqSlab: data.incomeSlab ? data.incomeSlab.split(':')[0].toUpperCase().replace(' ', '_') : undefined,

            // Map known special category flags
            ncc: specialCats.includes('NCC'),
            spo: specialCats.includes('SPO'),
            def: specialCats.includes('DEF') || specialCats.includes('XD') || specialCats.includes('CAP'), // Map all defence related to 'def'
            ph: specialCats.includes('PH'),

            // Note: 'attendedPractical', 'practicalMarks', 'preferredColleges' 
            // are NOT in the current DB schema and are omitted to prevent errors.

            updatedAt: new Date().toISOString()
        };

        if (profileDocs.documents.length > 0) {
            profile = profileDocs.documents[0];
            await databases.updateDocument(
                config.databaseId,
                'student_profiles_v2',
                profile.$id,
                updateData
            );
            return { success: true, action: 'updated', message: 'Rank updated successfully' };
        } else {
            // Create new profile if not exists
            const baseCategory = data.baseCategory || 'GM';
            const rankRange = calculateRankRange(data.generalMeritRank || 0);

            await databases.createDocument(
                config.databaseId,
                'student_profiles_v2',
                ID.unique(),
                {
                    userId: data.userId,
                    ...updateData,
                    courseCategory: data.courseCategory,
                    baseCategory,
                    rankRange,
                    eligibleCategories: [baseCategory],
                    createdAt: new Date().toISOString()
                }
            );
            return { success: true, action: 'created', message: 'Rank saved successfully' };
        }
    } catch (error: any) {
        console.error('Save student rank error:', error);
        return { success: false, error: error.message || 'Failed to save rank' };
    }
}

function calculateRankRange(rank: number): string {
    const start = Math.floor((rank - 1) / 5000) * 5000 + 1;
    const end = start + 4999;
    return `${start}-${end}`;
}

/**
 * Search Colleges
 */
export async function searchColleges(queryTerm: string, category: string) {
    try {
        const isFarmOrVet = ['Farm Science', 'Veterinary', 'Medical'].includes(category);
        const collectionId = isFarmOrVet ? 'farming_vet_colleges' : 'colleges';

        const searchAttribute = isFarmOrVet ? 'college_name' : 'collegeName';
        const codeAttribute = isFarmOrVet ? 'college_id' : 'collegeCode';

        // Prepare queries
        const queries = [Query.limit(20)];

        // Search by Name
        const nameQuery = [
            ...queries,
            Query.contains(searchAttribute, queryTerm)
        ];

        // Search by Code (if short enough to likely be a code)
        // Note: Appwrite OR is not simple in one query, so we run parallel
        const codeQuery = [
            ...queries,
            Query.startsWith(codeAttribute, queryTerm.toUpperCase())
        ];

        const [nameResults, codeResults] = await Promise.all([
            databases.listDocuments(config.databaseId, collectionId, nameQuery),
            queryTerm.length < 6
                ? databases.listDocuments(config.databaseId, collectionId, codeQuery)
                : Promise.resolve({ documents: [] })
        ]);

        // Combine and Deduplicate
        const combined = [...codeResults.documents, ...nameResults.documents] as any[];
        const unique = new Map<string, any>();

        combined.forEach(doc => {
            if (!unique.has(doc.$id)) {
                unique.set(doc.$id, {
                    code: doc[codeAttribute],
                    name: doc[searchAttribute],
                    city: doc.city || doc.location || doc.district || '',
                    id: doc.$id
                });
            }
        });

        return {
            success: true,
            data: Array.from(unique.values())
        };

    } catch (error: any) {
        console.error('Search colleges error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Student Ranks
 */
export async function getStudentRanks(userId: string) {
    try {
        const profileDocs = await databases.listDocuments(
            config.databaseId,
            'student_profiles_v2',
            [Query.equal('userId', userId)]
        );

        if (profileDocs.documents.length === 0) {
            return { success: false, error: 'Student profile not found' };
        }

        const profile = profileDocs.documents[0];

        return {
            success: true,
            data: {
                generalMeritRank: profile.generalMeritRank,
                theoryRank: profile.theoryRank,
                practicalRank: profile.practicalRank,
                productCategory: profile.productCategory // assuming field exists or is handled
            }
        };
    } catch (error: any) {
        console.error('Get student ranks error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generate Option List (Main Algorithm)
 */
export async function generateOptionList(userId: string) {
    try {
        // 1. Fetch Student Profile
        console.log(`Fetching profile for user: ${userId}`);
        const profileDocs = await withRetry(() =>
            databases.listDocuments(
                config.databaseId,
                'student_profiles_v2',
                [Query.equal('userId', userId)]
            )
        );

        if (profileDocs.documents.length === 0) {
            return { success: false, error: 'Profile not found' };
        }

        const profile = profileDocs.documents[0];
        const courseCategory = profile.courseCategory || '';

        console.log(`[OPTION GENERATOR] User: ${userId}, Course Category: ${courseCategory}`);

        // 2. Route to appropriate recommendation algorithm based on course category
        // Farm Science, Veterinary, and Medical use Farm_Agri/Farm_AgriV2 collections
        // Engineering and other standard courses use historical_cutoffs collection

        if (courseCategory === 'Farm Science' || courseCategory === 'Veterinary' || courseCategory === 'Medical') {
            console.log(`[ROUTING] Using Farm/Medical algorithm for ${courseCategory}`);
            return await generateFarmMedicalRecommendations(profile);
        }

        // Default to Engineering/Standard algorithm
        console.log(`[ROUTING] Using Engineering algorithm for ${courseCategory}`);
        return await generateEngineeringRecommendations(profile);

    } catch (error: any) {
        console.error('Generate option list error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Search Options for Student (Specific College Search)
 * Searches for colleges matching the query and calculates customized probabilities
 */
export async function searchStudentOptions(userId: string, queryTerm: string) {
    try {
        console.log(`Searching options for user: ${userId}, query: ${queryTerm}`);

        // 1. Fetch Student Profile
        const profileDocs = await databases.listDocuments(
            config.databaseId,
            'student_profiles_v2',
            [Query.equal('userId', userId)]
        );

        if (profileDocs.documents.length === 0) {
            return { success: false, error: 'Profile not found' };
        }

        const profile = profileDocs.documents[0];
        const courseCategory = profile.courseCategory || '';
        const isFarmOrVet = ['Farm Science', 'Veterinary', 'Medical'].includes(courseCategory);

        // 2. Perform Search based on category
        if (isFarmOrVet) {
            return await searchFarmMedicalOptions(profile, queryTerm);
        } else {
            return await searchEngineeringOptions(profile, queryTerm);
        }

    } catch (error: any) {
        console.error('Search student options error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Farming Course Recommendation Algorithm
 */
/**
 * Engineering/Standard Course Recommendation Algorithm
 * Uses normalized 'historical_cutoffs' collection
 */
export async function generateEngineeringRecommendations(studentProfile: any) {
    const rank = studentProfile.generalMeritRank;
    const categories = studentProfile.eligibleCategories || ['GM']; // Default to GM if empty

    // Step 2: Calculate Search Range
    // Step 2: Calculate Search Range
    const { minRank, maxRank } = calculateSearchRange(rank);

    console.log(`Searching cutoffs between ${minRank} and ${maxRank} for rank ${rank}`);

    // Step 3: Query Database
    // List1: Category in studentProfile.categories
    // List2: Category in GM, GMK, GMR, GMH (General Merit variants)

    // We combine these into a set of categories to query
    const targetCategories = new Set([...categories, 'GM', 'GMK', 'GMR', 'GMH']);
    const categoryList = Array.from(targetCategories);

    // Fetch cutoffs
    // Since we can't do "WHERE category IN [...]" easily combined with ranges in every DB adapter,
    // We'll fetch matching the rank range and filter by category in memory, 
    // OR fetch by category and filter by rank (likely fewer categories than ranks).
    // Given the rank range is specific (15k width), fetching by rank is probably efficient if indexed.

    const documents: any[] = [];

    // Pagination handling (fetch up to a reasonable limit, e.g., 500)
    const limit = 500;

    console.log('Fetching cutoff data from database...');
    const result = await withRetry(() =>
        databases.listDocuments(
            config.databaseId,
            'historical_cutoffs',
            [
                Query.greaterThanEqual('cutoffRank', minRank),
                Query.lessThanEqual('cutoffRank', maxRank),
                Query.limit(limit)
            ]
        )
    );

    // Filter in memory for categories
    const relevantCutoffs = result.documents.filter((doc: any) =>
        categoryList.includes(doc.category)
    );

    // Step 4: Calculate Probability
    const allColleges: RecommendationInfo[] = relevantCutoffs.map((doc: any) => {
        const difference = doc.cutoffRank - rank;
        const probability = calculateProbability(difference);
        const tier = assignTier(probability);

        return {
            optionId: doc.$id,
            collegeCode: doc.collegeCode || 'Unknown',
            collegeName: doc.collegeName || 'Unknown College',
            branchCode: doc.branchCode || 'Unknown',
            branchName: doc.branchName || 'Unknown Branch',
            category: doc.category,
            cutoffRank: doc.cutoffRank,
            probability,
            tier,
            year: doc.academicYear,
            round: doc.round
        };
    });

    // Deduplication handles logic (keeping best or all? The pseudocode says UNION(List1, List2) // Deduplicate)
    // We effectively queried the union by filtering. 
    // If multiple rounds exist, we might want to keep the latest or specific one?
    // For now, we return all individual cutoff matches as separate options (as they differ by year/round).
    // Or do we group by college+branch? The pseudocode iterates "college IN allColleges". implies unique college options.
    // I will group by College+Branch and pick the *best* probability entry (most likely Round 1 or 2).

    const uniqueOptionsMap = new Map<string, RecommendationInfo>();

    allColleges.forEach(opt => {
        const key = `${opt.collegeCode}-${opt.branchCode}`;
        if (!uniqueOptionsMap.has(key)) {
            uniqueOptionsMap.set(key, opt);
        } else {
            // If we have duplicate (e.g. from diff categories or rounds), pick best probability
            const existing = uniqueOptionsMap.get(key)!;
            if (opt.probability > existing.probability) {
                uniqueOptionsMap.set(key, opt);
            }
        }
    });

    const dedupedList = Array.from(uniqueOptionsMap.values());

    // Step 5: Sort by Probability (Asc) then Cutoff (Desc)
    // Wait, probability ASC (Low to High)? Usually we want High probability first?
    // Pseudocode: "SORT allColleges BY probability ASC, cutoffRank DESC"
    // "Safe" options have High probability (95%).
    // If I sort ASC, I see REACH (Low Prob) first.
    // That seems counter-intuitive for "Recommendations", but maybe the user wants to see "Ambitious" options first?
    // I will follow the pseudocode EXACTLY: Probability ASC.

    dedupedList.sort((a, b) => {
        if (a.probability !== b.probability) {
            return a.probability - b.probability; // ASC
        }
        return b.cutoffRank - a.cutoffRank; // DESC
    });

    // Step 6: Generate Summary
    const summary: RecommendationSummary = {
        reach: dedupedList.filter(o => o.tier === 'REACH').length,
        target: dedupedList.filter(o => o.tier === 'TARGET').length,
        safe: dedupedList.filter(o => o.tier === 'SAFE').length
    };

    // Step 7: Calculate List Score
    const listScore = calculateListScore(summary);

    // Step 8: Return Output
    return {
        success: true,
        data: {
            recommendations: dedupedList,
            summary,
            listScore
        }
    };
}

function calculateProbability(difference: number): number {
    if (difference >= 5000) return 95;
    if (difference >= 2000) return 80;
    if (difference >= 0) return 60;
    if (difference >= -3000) return 40;
    return 20;
}

function assignTier(probability: number): 'SAFE' | 'TARGET' | 'REACH' {
    if (probability >= 80) return 'SAFE';
    if (probability >= 40) return 'TARGET';
    return 'REACH';
}

/**
 * Farm Science / Veterinary / Medical Recommendation Algorithm
 * Uses 'Farm_Agri' or 'Farm_AgriV2' collections (Wide format with category columns)
 * These collections contain data for Farm Science, Veterinary, and Medical courses
 */
async function generateFarmMedicalRecommendations(studentProfile: any) {
    const courseCategory = studentProfile.courseCategory || 'Farm Science';
    const rank = studentProfile.practicalRank || studentProfile.generalMeritRank; // Farm/Vet/Medical often use Practical/Special Rank
    const baseCategory = studentProfile.baseCategory || 'GM';

    // Map baseCategory to attribute name (e.g. '2AH' -> 'attr_2ah')
    const categoryAttr = sanitizeAttributeId(baseCategory);

    // Search Range
    // Search Range
    const { minRank, maxRank } = calculateSearchRange(rank);

    console.log(`[${courseCategory.toUpperCase()}] Searching '${categoryAttr}' between ${minRank}-${maxRank} for rank ${rank}`);

    // Pagination
    const limit = 500;

    // Try both Farm_Agri and Farm_AgriV2 collections
    const collectionsToTry = ['farm_agri', 'farm_agri_v2'];

    for (const collectionName of collectionsToTry) {
        try {
            console.log(`Attempting to fetch from ${collectionName} collection...`);
            const result = await withRetry(() =>
                databases.listDocuments(
                    config.databaseId,
                    collectionName,
                    [
                        // Query where the specific category column is within range
                        Query.greaterThanEqual(categoryAttr, minRank),
                        Query.lessThanEqual(categoryAttr, maxRank),
                        Query.limit(limit)
                    ]
                )
            );

            console.log(`✅ Successfully fetched ${result.documents.length} documents from ${collectionName}`);

            const recommendations: RecommendationInfo[] = result.documents.map((doc: any) => {
                const cutoff = doc[categoryAttr];
                const difference = cutoff - rank;
                const probability = calculateProbability(difference);
                const tier = assignTier(probability);

                return {
                    optionId: doc.$id,
                    collegeCode: doc.college_id || doc.collegeCode || 'UNKNOWN',
                    collegeName: doc.college || doc.collegeName || 'Unknown College',
                    branchCode: doc.branch || doc.branchCode || 'UNK',
                    branchName: doc.branch || doc.branchName || courseCategory,
                    category: baseCategory,
                    cutoffRank: cutoff,
                    probability,
                    tier,
                    year: doc.year || 2024, // Use year from document if available
                    round: doc.round || 1
                };
            });

            // Deduplicate & Sort
            const uniqueOptionsMap = new Map<string, RecommendationInfo>();
            recommendations.forEach(opt => {
                const key = `${opt.collegeCode}-${opt.branchCode}`;
                if (!uniqueOptionsMap.has(key) || opt.probability > uniqueOptionsMap.get(key)!.probability) {
                    uniqueOptionsMap.set(key, opt);
                }
            });

            const dedupedList = Array.from(uniqueOptionsMap.values());

            // Sort by probability (ASC) then cutoff (DESC)
            dedupedList.sort((a, b) => {
                if (a.probability !== b.probability) return a.probability - b.probability;
                return b.cutoffRank - a.cutoffRank;
            });

            const summary: RecommendationSummary = {
                reach: dedupedList.filter(o => o.tier === 'REACH').length,
                target: dedupedList.filter(o => o.tier === 'TARGET').length,
                safe: dedupedList.filter(o => o.tier === 'SAFE').length
            };

            const listScore = calculateListScore(summary);

            return {
                success: true,
                data: {
                    recommendations: dedupedList,
                    summary,
                    listScore
                }
            };

        } catch (error: any) {
            console.error(`Failed to fetch from ${collectionName}:`, error.message);

            // If this is the last collection to try, return error
            if (collectionName === collectionsToTry[collectionsToTry.length - 1]) {
                console.error(`All collection attempts failed for ${courseCategory}`);
                return {
                    success: false,
                    error: `Failed to generate ${courseCategory} options. Collections tried: ${collectionsToTry.join(', ')}. Error: ${error.message}`
                };
            }

            // Otherwise, continue to next collection
            console.log(`Trying next collection...`);
        }
    }

    // Fallback (should not reach here)
    return { success: false, error: `No data found for ${courseCategory}` };
}

function sanitizeAttributeId(header: string): string {
    let code = header.toUpperCase().trim();

    // 1. Handle 'H' suffix (e.g., '3ARH' -> '3AR')
    if (code.endsWith('H')) {
        code = code.slice(0, -1);
    }

    // 2. Handle known missing categories by mapping to General equivalent
    // Based on database schema analysis
    const FALLBACK_MAP: Record<string, string> = {
        'GMK': 'GM',   // GMK missing in DB
        'STK': 'STG',  // STK missing in DB
        'STR': 'STG',  // STR missing in DB
        '2AK': '2AG',  // 2AK missing in DB
        '2AG': '2AG'   // 2AG exists in V2 but maybe not V1? (V1 has 2AR, 2BG...)
    };

    if (FALLBACK_MAP[code]) {
        return sanitizeAttributeId(FALLBACK_MAP[code]); // Recursively sanitize the fallback
    }

    // 3. Handle Numeric Categories (1, 2A, 2B, 3A, 3B)
    if (/^[0-9]/.test(code)) {
        // If it doesn't end in R or K, it's General (G)
        if (!code.endsWith('R') && !code.endsWith('K')) {
            code += 'G';
        }
        return 'attr_' + code.toLowerCase();
    }

    // 4. Handle Text Categories (GM, SC, ST, C1)

    // GM Handling
    if (code === 'GM') return 'gm';
    if (code === 'GMR') return 'gmr';

    // SC/ST Handling
    if (code.startsWith('SC') || code.startsWith('ST')) {
        // SC -> SCG, ST -> STG
        if (!code.endsWith('R') && !code.endsWith('K')) {
            code += 'G';
        }
        return code.toLowerCase();
    }

    // Fallback
    return code.toLowerCase();
}

function calculateListScore(summary: RecommendationSummary, preferences?: any): number {
    // Basic scoring logic: Weighted sum of options found
    // Cap at 100 or something reasonable
    const score = (summary.safe * 2) + (summary.target * 5) + (summary.reach * 8);
    // Higher score = more options across spectrum? 
    // Or maybe list quality?
    return Math.min(100, score);
}


/**
 * Search Engineering Options
 */
async function searchEngineeringOptions(studentProfile: any, queryTerm: string) {
    const rank = studentProfile.generalMeritRank;
    const categories = studentProfile.eligibleCategories || ['GM'];
    
    // We search across ALL ranks, but filter by name/code
    const targetCategories = new Set([...categories, 'GM', 'GMK', 'GMR', 'GMH']);
    const categoryList = Array.from(targetCategories);

    // Queries
    const queries = [Query.limit(50)]; 

    // Try finding by name
    const nameResult = await databases.listDocuments(
         config.databaseId,
         'historical_cutoffs',
         [
             ...queries,
             Query.contains('collegeName', queryTerm)
         ]
    );

    // Try finding by code
    const codeResult = await databases.listDocuments(
        config.databaseId,
        'historical_cutoffs',
        [
            ...queries,
            Query.search('collegeCode', queryTerm) 
        ]
    );

    const allDocs = [...nameResult.documents, ...codeResult.documents];
    
    // Filter by Category
    const validDocs = allDocs.filter((doc: any) => categoryList.includes(doc.category));

    // Process results
    const uniqueOptionsMap = new Map<string, RecommendationInfo>();

    validDocs.forEach((doc: any) => {
         const difference = doc.cutoffRank - rank;
         const probability = calculateProbability(difference);
         const tier = assignTier(probability);

         const opt: RecommendationInfo = {
             optionId: doc.$id,
             collegeCode: doc.collegeCode || 'Unknown',
             collegeName: doc.collegeName || 'Unknown College',
             branchCode: doc.branchCode || 'Unknown',
             branchName: doc.branchName || 'Unknown Branch',
             category: doc.category,
             cutoffRank: doc.cutoffRank,
             probability,
             tier,
             year: doc.academicYear,
             round: doc.round
         };

         const key = `${opt.collegeCode}-${opt.branchCode}`;
         // Keep best probability
         if (!uniqueOptionsMap.has(key) || opt.probability > uniqueOptionsMap.get(key)!.probability) {
             uniqueOptionsMap.set(key, opt);
         }
    });

    const recommendations = Array.from(uniqueOptionsMap.values());
    
    recommendations.sort((a, b) => {
         if (a.probability !== b.probability) return a.probability - b.probability;
         return b.cutoffRank - a.cutoffRank;
    });

    return {
        success: true,
        data: {
             recommendations,
             summary: calculateSummary(recommendations),
             listScore: 0 
        }
    };
}

/**
 * Search Farm/Medical Options
 */
async function searchFarmMedicalOptions(studentProfile: any, queryTerm: string) {
    const courseCategory = studentProfile.courseCategory || 'Farm Science';
    const rank = studentProfile.practicalRank || studentProfile.generalMeritRank;
    const baseCategory = studentProfile.baseCategory || 'GM';
    const categoryAttr = sanitizeAttributeId(baseCategory);

    const collectionsToTry = ['farm_agri', 'farm_agri_v2'];
    const uniqueOptionsMap = new Map<string, RecommendationInfo>();

    for (const collectionName of collectionsToTry) {
        try {
            // Search by Name
            const nameResult = await databases.listDocuments(
                config.databaseId,
                collectionName,
                [Query.contains('college', queryTerm), Query.limit(50)]
            );

             // Search by Code (farm_agri uses 'college_id')
            let codeResult: any = { documents: [] };
            if (queryTerm.length < 10) {
                 codeResult = await databases.listDocuments(
                    config.databaseId,
                    collectionName,
                    [Query.search('college_id', queryTerm), Query.limit(50)]
                );
            }

            const allDocs = [...nameResult.documents, ...codeResult.documents];

            allDocs.forEach((doc: any) => {
                const cutoff = doc[categoryAttr];
                if (!cutoff) return; // Skip if no cutoff for this category

                const difference = cutoff - rank;
                const probability = calculateProbability(difference);
                const tier = assignTier(probability);

                const opt: RecommendationInfo = {
                    optionId: doc.$id,
                    collegeCode: doc.college_id || doc.collegeCode || 'UNKNOWN',
                    collegeName: doc.college || doc.collegeName || 'Unknown College',
                    branchCode: doc.branch || doc.branchCode || 'UNK',
                    branchName: doc.branch || doc.branchName || courseCategory,
                    category: baseCategory,
                    cutoffRank: cutoff,
                    probability,
                    tier,
                    year: doc.year || 2024,
                    round: doc.round || 1
                };

                const key = `${opt.collegeCode}-${opt.branchCode}`;
                if (!uniqueOptionsMap.has(key) || opt.probability > uniqueOptionsMap.get(key)!.probability) {
                    uniqueOptionsMap.set(key, opt);
                }
            });
        } catch (e) {
            console.error(`Error searching ${collectionName}:`, e);
        }
    }

    const recommendations = Array.from(uniqueOptionsMap.values());
    recommendations.sort((a, b) => {
         if (a.probability !== b.probability) return a.probability - b.probability;
         return b.cutoffRank - a.cutoffRank;
    });

    return {
        success: true,
        data: {
             recommendations,
             summary: calculateSummary(recommendations),
             listScore: 0
        }
    };
}

function calculateSummary(list: RecommendationInfo[]): RecommendationSummary {
    return {
        reach: list.filter(o => o.tier === 'REACH').length,
        target: list.filter(o => o.tier === 'TARGET').length,
        safe: list.filter(o => o.tier === 'SAFE').length
    };
}

// ============================================================================

// HELPER LOOKUPS
// ============================================================================

export function getCourseCategoriesForCounselling(type: CounsellingType) {
    // Mock data
    if (type === 'UGCET') return ['Engineering', 'Farm Science', 'Veterinary', 'Pharmacy'];
    if (type === 'UGNEET') return ['Medical', 'Dental', 'Ayush'];
    return [];
}

export function getEngineeringBranches() {
    return [
        { code: 'CS', name: 'Computer Science' },
        { code: 'IS', name: 'Information Science' },
        { code: 'EC', name: 'Electronics' },
        { code: 'ME', name: 'Mechanical' },
        // ... more
    ];
}

export function getFarmScienceCategories() {
    return [
        'Agriculture',
        'Horticulture',
        'Sericulture',
        'Forestry',
        'Food Technology'
    ];
}

export function requiresDualRanks(category: string) {
    const dualRankCategories = ['Farm Science', 'Veterinary'];
    return dualRankCategories.includes(category);
}

/**
 * Calculate search range for college queries
 * Lower bound: -10,000 (min 1)
 * Upper bound: +5,000
 * 
 * @param rank Student's rank
 * @returns {minRank, maxRank}
 */
export function calculateSearchRange(rank: number): { minRank: number; maxRank: number } {
    const minRank = Math.max(1, rank - 10000);
    const maxRank = rank + 5000;
    return { minRank, maxRank };
}
