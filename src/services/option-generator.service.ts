
import { Databases, Query, ID } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';
import { CounsellingType } from '../types/domain.types';

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

        const updateData: any = {
            generalMeritRank: data.generalMeritRank,
            theoryRank: data.theoryRank,
            practicalRank: data.practicalRank,
            // You might want to store courseCategory specific ranks if schema allowed
            // optimizing for now by updating the main rank fields
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
            // Create new profile if not exists (should usually exist after auth)
            // This is a fallback
            const baseCategory = data.baseCategory || 'GM';
            const rankRange = calculateRankRange(data.generalMeritRank || 0);

            await databases.createDocument(
                config.databaseId,
                'student_profiles_v2',
                ID.unique(),
                {
                    userId: data.userId,
                    ...updateData,
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
        const profileDocs = await databases.listDocuments(
            config.databaseId,
            'student_profiles_v2',
            [Query.equal('userId', userId)]
        );

        if (profileDocs.documents.length === 0) {
            return { success: false, error: 'Profile not found' };
        }

        const profile = profileDocs.documents[0];
        const rank = profile.generalMeritRank || 0;

        // 2. Determine Farming vs Standard
        // For this implementation, we apply the requested farming algorithm
        // effectively for all requests as requested by the prompt "generate option entry generator algorithm for farming courses"
        // In a real app, we might switch based on a flag.

        if (profile.courseCategory === 'Farm Science') {
            return await generateFarmRecommendations(profile);
        }

        return await generateEngineeringRecommendations(profile);

    } catch (error: any) {
        console.error('Generate option list error:', error);
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
    const minRank = Math.max(1, rank - 10000);
    const maxRank = rank + 5000;

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
    const result = await databases.listDocuments(
        config.databaseId,
        'historical_cutoffs',
        [
            Query.greaterThanEqual('cutoffRank', minRank),
            Query.lessThanEqual('cutoffRank', maxRank),
            Query.limit(limit)
        ]
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
 * Farm Science Recommendation Algorithm
 * Uses 'farm_agri' collection (Wide format with category columns)
 */
async function generateFarmRecommendations(studentProfile: any) {
    const rank = studentProfile.practicalRank || studentProfile.generalMeritRank; // Farm often uses Practical/Special Rank
    const baseCategory = studentProfile.baseCategory || 'GM';

    // Map baseCategory to attribute name (e.g. '2AH' -> 'attr_2ah')
    // Assuming the user selected a specific category variant like '2AH' in the UI.
    // If they just selected '2A', we might need to default to '2AG' or similar, 
    // but the UI now provides exact codes.
    const categoryAttr = sanitizeAttributeId(baseCategory);

    // Search Range
    const minRank = Math.max(1, rank - 10000);
    const maxRank = rank + 5000;

    console.log(`[FARM] Searching '${categoryAttr}' between ${minRank}-${maxRank} for rank ${rank}`);

    // Pagination
    const limit = 500;

    try {
        const result = await databases.listDocuments(
            config.databaseId,
            'farm_agri',
            [
                // Query where the specific category column is within range
                Query.greaterThanEqual(categoryAttr, minRank),
                Query.lessThanEqual(categoryAttr, maxRank),
                Query.limit(limit)
            ]
        );

        const recommendations: RecommendationInfo[] = result.documents.map((doc: any) => {
            const cutoff = doc[categoryAttr];
            const difference = cutoff - rank;
            const probability = calculateProbability(difference);
            const tier = assignTier(probability);

            return {
                optionId: doc.$id,
                collegeCode: doc.college_id || 'UNKNOWN',
                collegeName: doc.college || 'Unknown College',
                branchCode: doc.branch || 'UNK',
                branchName: doc.branch || 'Farm Science',
                category: baseCategory,
                cutoffRank: cutoff,
                probability,
                tier,
                year: 2024, // Assuming latest
                round: 1
            };
        });

        // Deduplicate & Sort (Logic similar to standard)
        // Group by College+Branch, take best probability
        const uniqueOptionsMap = new Map<string, RecommendationInfo>();
        recommendations.forEach(opt => {
            const key = `${opt.collegeCode}-${opt.branchCode}`;
            if (!uniqueOptionsMap.has(key) || opt.probability > uniqueOptionsMap.get(key)!.probability) {
                uniqueOptionsMap.set(key, opt);
            }
        });

        const dedupedList = Array.from(uniqueOptionsMap.values());

        // Sort: Probability ASC (Reach -> Safe? No, user wants Best first? 
        // Code follows: Probability Low (20) to High (95)? 
        // Existing code sorted Probability ASC. I will keep consistency.
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
        console.error('Farm generation error:', error);
        // Fallback or empty return
        return { success: false, error: 'Failed to generate farm options: ' + error.message };
    }
}

function sanitizeAttributeId(header: string): string {
    // Matches logic in import_farm_agri.ts
    let sanitized = header.trim().replace(/[^a-zA-Z0-9]/g, '_');
    if (/^[0-9]/.test(sanitized)) {
        sanitized = 'attr_' + sanitized;
    }
    if (sanitized.length > 32) sanitized = sanitized.substring(0, 32);
    return sanitized.toLowerCase();
}

function calculateListScore(summary: RecommendationSummary, preferences?: any): number {
    // Basic scoring logic: Weighted sum of options found
    // Cap at 100 or something reasonable
    const score = (summary.safe * 2) + (summary.target * 5) + (summary.reach * 8);
    // Higher score = more options across spectrum? 
    // Or maybe list quality?
    return Math.min(100, score);
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
