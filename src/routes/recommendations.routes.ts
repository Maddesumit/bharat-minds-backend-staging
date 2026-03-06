/**
 * Recommendation Routes
 *
 * High-level college recommendation API that:
 * - Accepts student exam details and preferences
 * - Persists them into the normalized student profile
 * - Generates a ranked recommendation list using historical cutoffs
 *
 * This is a thin wrapper around the existing option generator service,
 * so it reuses the same RankInput structure and generation logic used
 * by the /api/options endpoints.
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ID, Query } from 'node-appwrite';
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

            const payload = req.body as RankInput & { year?: number };

            // Persist a simple snapshot of the student's rank into the new schema
            // using the student_ranks collection.
            const now = new Date().toISOString();
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

            try {
                await databases.createDocument(
                    config.databaseId,
                    'student_ranks',
                    ID.unique(),
                    {
                        userId: payload.userId,
                        counsellingType: payload.counsellingType,
                        courseCategory: payload.courseCategory,
                        branch: payload.branch || '',
                        generalMeritRank: payload.generalMeritRank || null,
                        categoryRank: payload.categoryRank || null,
                        theoryRank: payload.theoryRank || null,
                        practicalRank: payload.practicalRank || null,
                        createdAt: now,
                        updatedAt: now,
                    }
                );
            } catch (err: any) {
                // If the collection doesn't exist yet, return a clear message
                if (err.code === 404 || err.type === 'collection_not_found') {
                    return res.status(500).json({
                        success: false,
                        error: "Collection 'student_ranks' could not be found. Please create it in Appwrite using the provided schema scripts.",
                    });
                }
                console.error('Error saving student_ranks document:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to save student rank',
                });
            }

            // Generate recommendations from the new cutoff_data schema
            const recommendationsResult = await generateRecommendationsFromCutoffData(
                rankValue,
                payload.baseCategory || payload.courseCategory || 'GM',
                payload.courseCategory,
                payload.counsellingType,
                payload.year
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
 * GET /api/recommendations/:userId
 *
 * Convenience endpoint to fetch (or regenerate) recommendations
 * for an existing student profile.
 */
router.get('/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required',
            });
        }

        // Look up the most recent rank snapshot for this user
        const ranks = await databases.listDocuments(
            config.databaseId,
            'student_ranks',
            [
                Query.equal('userId', userId),
                Query.orderDesc('createdAt'),
                Query.limit(1),
            ]
        );

        if (ranks.documents.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No rank data found for this user',
            });
        }

        const latest = ranks.documents[0] as any;
        const rankValue =
            latest.generalMeritRank ??
            latest.theoryRank ??
            latest.practicalRank;

        if (!rankValue) {
            return res.status(400).json({
                success: false,
                error: 'Latest rank record does not contain a usable rank value',
            });
        }

        const recommendationsResult = await generateRecommendationsFromCutoffData(
            rankValue,
            latest.baseCategory || latest.category || 'GM',
            latest.courseCategory,
            latest.counsellingType,
            latest.year
        );

        if (!recommendationsResult.success) {
            return res.status(400).json(recommendationsResult);
        }

        return res.status(200).json({
            success: true,
            data: recommendationsResult.data,
        });
    } catch (error: any) {
        console.error('Get recommendations error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * Internal helper:
 * Generate recommendations using the lightweight cutoff_data schema
 * defined in appwrite.schemas.ts / recreate-collections-simple.ts.
 *
 * Collections used:
 * - cutoff_data: { collegeCode, collegeName, courseCode, courseName, courseCategory, category, counsellingType, cutoffRank, year }
 *
 * This intentionally does NOT depend on the older student_profiles_v2 /
 * historical_cutoffs schema to make the route compatible with the updated database.
 */
async function generateRecommendationsFromCutoffData(
    studentRank: number,
    category: string,
    courseCategory: string,
    counsellingType: string,
    year?: number
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
        const targetYear = year || new Date().getFullYear();
        const { minRank, maxRank } = calculateSearchRange(studentRank);

        const cutoffCollectionId = config.collections.cutoffData || 'cutoff_data';

        const result = await databases.listDocuments(
            config.databaseId,
            cutoffCollectionId,
            [
                Query.equal('courseCategory', courseCategory),
                Query.equal('category', category),
                Query.equal('counsellingType', counsellingType),
                Query.equal('year', targetYear),
                Query.greaterThanEqual('cutoffRank', minRank),
                Query.lessThanEqual('cutoffRank', maxRank),
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
            const cutoffRank = doc.cutoffRank as number;
            const difference = cutoffRank - studentRank;
            const probability = calculateProbabilitySimple(difference);
            const tier = assignTierSimple(probability);

            return {
                optionId: doc.$id,
                collegeCode: doc.collegeCode,
                collegeName: doc.collegeName,
                courseCode: doc.courseCode,
                courseName: doc.courseName,
                courseCategory: doc.courseCategory,
                category: doc.category,
                counsellingType: doc.counsellingType,
                cutoffRank,
                probability,
                tier,
                year: doc.year,
            };
        });

        // Deduplicate by college + course, keeping the highest probability
        const uniqueMap = new Map<string, any>();
        for (const opt of rawOptions) {
            const key = `${opt.collegeCode}-${opt.courseCode}`;
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
        console.error('Error generating recommendations from cutoff_data:', error);
        if (error.code === 404 || error.type === 'collection_not_found') {
            return {
                success: false,
                error: "Collection 'cutoff_data' could not be found. Please create it in Appwrite using the provided schema scripts.",
            };
        }
        return {
            success: false,
            error: error.message || 'Failed to generate recommendations',
        };
    }
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

