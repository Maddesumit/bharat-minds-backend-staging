/**
 * Recommendation Routes
 *
 * High-level college recommendation API that:
 * - Accepts student exam details and preferences
 * - Persists them into the normalized student profile
 * - Generates a ranked recommendation list using historical cutoffs
 
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Query } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';
import { RankInput, calculateSearchRange } from '../services/option-generator.service';

const router = Router();

/**
 * POST /api/recommendations
 *
 * Request body (matches RankInput from option-generator.service):
 * {
 *   "userId": "user123",
 *   "counsellingType": "UGCET" | "UGNEET" | "Combined",
 *   "courseCategory": "Engineering" | "Farm Science" | "Veterinary" | "Medical" | ...,
 *   "branch": string,
 *   "generalMeritRank": number,
 *   "categoryRank": number,
 *   "theoryRank": number,
 *   "practicalRank": number,
 *   "baseCategory": string,
 *   "snq": boolean,
 *   "attendedPractical": boolean,
 *   "practicalMarks": number,
 *   "specialCategories": string[],
 *   "incomeSlab": string,
 *   "preferredColleges": string[],
 *   "preferredLocations": string[],
 *   "preferredCollegeTypes": string[],
 *   "eligibleCategories": string[]
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   data?: {
 *     recommendations: RecommendationInfo[],
 *     summary: { safe: number; target: number; reach: number },
 *     listScore: number
 *   },
 *   error?: string
 * }
 */
router.post(
    '/',
    [
        body('userId').notEmpty().withMessage('userId is required'),
        body('counsellingType')
            .isIn(['UGCET', 'UGNEET', 'Combined'])
            .withMessage('Invalid counsellingType'),
        body('courseCategory')
            .notEmpty()
            .withMessage('courseCategory is required'),
        body('generalMeritRank')
            .optional()
            .isInt({ min: 1 })
            .withMessage('generalMeritRank must be a positive integer'),
        body('theoryRank')
            .optional()
            .isInt({ min: 1 })
            .withMessage('theoryRank must be a positive integer'),
        body('practicalRank')
            .optional()
            .isInt({ min: 1 })
            .withMessage('practicalRank must be a positive integer'),
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const payload = req.body as RankInput & { year?: number; round?: number };
            const rankValue =
                payload.generalMeritRank ??
                payload.theoryRank ??
                payload.practicalRank;

            if (!rankValue) {
                return res.status(400).json({
                    success: false,
                    error: 'At least one of generalMeritRank, theoryRank or practicalRank is required',
                });
            }

            // Generate recommendations from the current Appwrite data collections:
            // - r1_cutoffs
            // - r1r2_hk_cutoff (Round 2)
            // - r1r2_hk (HK variants / combined)
            // - colleges_info (for college name/type enrichment)
            const recommendationsResult = await generateRecommendationsFromCutoffCollections(
                rankValue,
                payload.baseCategory || 'GM',
                payload.eligibleCategories,
                payload.courseCategory,
                payload.counsellingType,
                payload.year,
                payload.round
            );

            if (!recommendationsResult.success) {
                return res.status(400).json(recommendationsResult);
            }

            return res.status(200).json({
                success: true,
                source: 'recommendations',
                data: recommendationsResult.data,
            });
        } catch (error: any) {
            console.error('Recommendation generation error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * Internal helper:
 * Generate recommendations using the current cutoff collections.
 */
async function generateRecommendationsFromCutoffCollections(
    studentRank: number,
    baseCategory: string,
    eligibleCategories: string[] | undefined,
    courseCategory: string,
    counsellingType: string,
    year?: number,
    round?: number
): Promise<{
    success: boolean;
    data?: {
        recommendations: any[];
        summary: { safe: number; target: number; reach: number };
        listScore: number;
    };
    error?: string;
}> {
    try {
        if (courseCategory !== 'Engineering') {
            return {
                success: false,
                error: `Unsupported courseCategory: ${courseCategory}. This API is currently wired to Engineering collections only.`,
            };
        }

        const requestedRound = round ?? 1;
        const categoryList = (eligibleCategories && eligibleCategories.length > 0)
            ? eligibleCategories
            : [baseCategory || 'GM'];

        const cutoffCollectionId = selectCutoffCollectionId({
            requestedRound,
            categoryList,
        });

        const targetYear = year ?? await getLatestYear(cutoffCollectionId);
        const { minRank, maxRank } = calculateSearchRange(studentRank);

        const collegeIndex = await buildCollegeIndex();

        const result = await databases.listDocuments(
            config.databaseId,
            cutoffCollectionId,
            [
                Query.equal('year', targetYear),
                Query.equal('round', requestedRound),
                Query.equal('category', categoryList as any),
                Query.greaterThanEqual('closingRank', minRank),
                Query.lessThanEqual('closingRank', maxRank),
                Query.limit(500),
            ]
        );

        if (result.documents.length === 0) {
            return {
                success: true,
                data: {
                    recommendations: [],
                    summary: { safe: 0, target: 0, reach: 0 },
                    listScore: 0,
                },
            };
        }

        // Map each cutoff row to a recommendation with probability & tier
        const rawOptions = result.documents.map((doc: any) => {
            const cutoffRank = doc.closingRank as number;
            const difference = cutoffRank - studentRank;
            const probability = calculateProbabilitySimple(difference);
            const tier = assignTierSimple(probability);

            const collegeCode = (doc.collegeCode ?? doc.college_code ?? doc.collegecode ?? '').toString();
            const collegeInfo = collegeIndex.get(collegeCode);

            return {
                optionId: doc.$id,
                collegeCode,
                collegeName: collegeInfo?.name || '',
                branchCode: (doc.courseId ?? doc.course_code ?? doc.coursecode ?? '').toString(),
                branchName: (doc.courseName ?? doc.course_name ?? doc.coursename ?? '').toString(),
                category: doc.category,
                cutoffRank,
                probability,
                tier,
                year: doc.year,
                round: doc.round,
                type: collegeInfo?.type || undefined,
            };
        });

        // Deduplicate by college + course, keeping the highest probability
        const uniqueMap = new Map<string, any>();
        for (const opt of rawOptions) {
            const key = `${opt.collegeCode}-${opt.branchCode}`;
            const existing = uniqueMap.get(key);
            if (!existing || opt.probability > existing.probability) {
                uniqueMap.set(key, opt);
            }
        }

        const recommendations = Array.from(uniqueMap.values());

        // Sort by probability (descending) then cutoff rank (ascending)
        recommendations.sort((a, b) => {
            if (b.probability !== a.probability) {
                return b.probability - a.probability;
            }
            return a.cutoffRank - b.cutoffRank;
        });

        const summary = {
            safe: recommendations.filter((r) => r.tier === 'SAFE').length,
            target: recommendations.filter((r) => r.tier === 'TARGET').length,
            reach: recommendations.filter((r) => r.tier === 'REACH').length,
        };

        const listScore = calculateListScoreSimple(summary);

        return {
            success: true,
            data: {
                recommendations,
                summary,
                listScore,
            },
        };
    } catch (error: any) {
        console.error('Error generating recommendations:', error);
        if (error.code === 404 || error.type === 'collection_not_found') {
            return {
                success: false,
                error: `Collection not found in Appwrite: ${error.message}`,
            };
        }
        return {
            success: false,
            error: error.message || 'Failed to generate recommendations',
        };
    }
}

async function getLatestYear(collectionId: string): Promise<number> {
    const latest = await databases.listDocuments(
        config.databaseId,
        collectionId,
        [Query.orderDesc('year'), Query.limit(1)]
    );

    const year = (latest.documents[0] as any)?.year;
    if (typeof year === 'number') return year;
    if (typeof year === 'string' && !isNaN(Number(year))) return Number(year);
    return new Date().getFullYear();
}

async function buildCollegeIndex(): Promise<Map<string, { name: string; type?: string }>> {
    const result = await databases.listDocuments(
        config.databaseId,
        config.collections.collegesInfo,
        [Query.limit(5000)]
    );

    const map = new Map<string, { name: string; type?: string }>();
    for (const doc of result.documents as any[]) {
        const code = (doc.collegeCode ?? doc.collegecode ?? doc.college_code ?? doc.code ?? doc.$id ?? '').toString();
        if (!code) continue;

        const name = (doc.collegeName ?? doc.collegename ?? doc.college_name ?? doc.name ?? '').toString();
        const type = (doc.collegeType ?? doc.Type ?? doc.type ?? '').toString() || undefined;
        map.set(code, { name, type });
    }
    return map;
}

function selectCutoffCollectionId(args: { requestedRound: number; categoryList: string[] }): string {
    const hasHKVariant = args.categoryList.some((c) => c.endsWith('H') || c.endsWith('KH') || c.endsWith('RH') || c.includes('HK'));

    // If the user's eligible categories include HK variants, prefer the combined HK collection.
    if (hasHKVariant) {
        return config.collections.r1r2Hk;
    }

    // Otherwise route by round.
    return args.requestedRound >= 2 ? config.collections.r2Cutoffs : config.collections.r1Cutoffs;
}

function calculateProbabilitySimple(difference: number): number {
    if (difference >= 5000) return 95;
    if (difference >= 2000) return 80;
    if (difference >= 0) return 60;
    if (difference >= -3000) return 40;
    return 20;
}

function assignTierSimple(probability: number): 'SAFE' | 'TARGET' | 'REACH' {
    if (probability >= 80) return 'SAFE';
    if (probability >= 40) return 'TARGET';
    return 'REACH';
}

function calculateListScoreSimple(summary: { safe: number; target: number; reach: number }): number {
    const score = summary.safe * 2 + summary.target * 5 + summary.reach * 8;
    return Math.min(100, score);
}

export default router;
