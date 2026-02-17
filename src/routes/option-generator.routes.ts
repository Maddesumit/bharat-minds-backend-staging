/**
 * Option Generator Routes
 * 
 * Endpoints for BHARAT MINDS OPTION ENTRY GENERATOR
 * Handles rank entry and option list generation
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
    saveStudentRank,
    getStudentRanks,
    generateOptionList,
    getCourseCategoriesForCounselling,
    requiresDualRanks,
    getEngineeringBranches,
    getFarmScienceCategories,
    searchColleges,
    searchStudentOptions
} from '../services/option-generator.service';

const router = Router();

// ==================== HELPER ENDPOINTS ====================

/**
 * GET /api/options/colleges/search
 * Search colleges by name or code
 */
router.get('/colleges/search',
    [
        query('q').notEmpty().withMessage('Search query is required'),
        query('category').optional()
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const queryTerm = req.query.q as string;
        const category = (req.query.category as string) || 'Engineering';

        const result = await searchColleges(queryTerm, category);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json(result);
    }
);

/**
 * GET /api/options/search-recommendations
 * Search specifically for recommendations (with cutoffs) by college name/code
 */
router.get('/search-recommendations',
    [
        query('userId').notEmpty().withMessage('User ID is required'),
        query('q').notEmpty().withMessage('Search query is required')
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const userId = req.query.userId as string;
        const queryTerm = req.query.q as string;

        const result = await searchStudentOptions(userId, queryTerm);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json(result);
    }
);

/**
 * GET /api/options/course-categories/:counsellingType
 * Get available course categories for a counselling type
 */
router.get('/course-categories/:counsellingType', (req: Request, res: Response) => {
    const { counsellingType } = req.params;

    if (!['UGCET', 'UGNEET', 'Combined'].includes(counsellingType)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid counselling type. Must be UGCET, UGNEET, or Combined'
        });
    }

    const categories = getCourseCategoriesForCounselling(counsellingType as any);

    res.json({
        success: true,
        data: categories
    });
});

/**
 * GET /api/options/engineering-branches
 * Get available engineering branches
 */
router.get('/engineering-branches', (req: Request, res: Response) => {
    const branches = getEngineeringBranches();

    res.json({
        success: true,
        data: branches
    });
});

/**
 * GET /api/options/farm-science-categories
 * Get Farm Science sub-categories
 */
router.get('/farm-science-categories', (req: Request, res: Response) => {
    const categories = getFarmScienceCategories();

    res.json({
        success: true,
        data: categories
    });
});

/**
 * GET /api/options/requires-dual-ranks/:courseCategory
 * Check if a course requires Theory + Practical ranks
 */
router.get('/requires-dual-ranks/:courseCategory', (req: Request, res: Response) => {
    const { courseCategory } = req.params;
    const isDual = requiresDualRanks(courseCategory as any);

    res.json({
        success: true,
        requiresDualRanks: isDual,
        message: isDual
            ? 'This course requires both Theory and Practical ranks'
            : 'This course requires General Merit Rank only'
    });
});

// ==================== RANK ENTRY ENDPOINTS ====================

/**
 * POST /api/options/ranks
 * Save student rank (handles both standard and edge cases)
 * 
 * Body (Standard Course - Engineering, etc.):
 * {
 *   "userId": "user123",
 *   "counsellingType": "UGCET",
 *   "courseCategory": "Engineering",
 *   "branch": "Computer Science",
 *   "generalMeritRank": 12345,
 *   "categoryRank": 6789,
 *   "preferredColleges": ["E001", "E002"]
 * }
 */
router.post('/ranks',
    [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('counsellingType')
            .isIn(['UGCET', 'UGNEET', 'Combined'])
            .withMessage('Invalid counselling type'),
        body('courseCategory')
            .notEmpty()
            .withMessage('Course category is required'),
        body('preferredColleges').optional().isArray(),
        body('preferredLocations').optional().isArray(),
        body('preferredCollegeTypes').optional().isArray(),
        // Conditional validation handled in service layer
    ],
    async (req: Request, res: Response) => {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const rankInput = {
                userId: req.body.userId,
                counsellingType: req.body.counsellingType,
                courseCategory: req.body.courseCategory,
                branch: req.body.branch,
                generalMeritRank: req.body.generalMeritRank,
                categoryRank: req.body.categoryRank,
                theoryRank: req.body.theoryRank,
                practicalRank: req.body.practicalRank,
                baseCategory: req.body.baseCategory,
                snq: req.body.snq,
                attendedPractical: req.body.attendedPractical,
                practicalMarks: req.body.practicalMarks,
                specialCategories: req.body.specialCategories,
                incomeSlab: req.body.incomeSlab,
                preferredColleges: req.body.preferredColleges,
                preferredLocations: req.body.preferredLocations,
                preferredCollegeTypes: req.body.preferredCollegeTypes
            };

            const result = await saveStudentRank(rankInput);

            if (!result.success) {
                return res.status(400).json(result);
            }

            res.status(result.action === 'created' ? 201 : 200).json(result);
        } catch (error: any) {
            console.error('Save rank error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
);

/**
 * GET /api/options/ranks/:userId
 * Get all saved ranks for a user
 */
router.get('/ranks/:userId',
    [param('userId').notEmpty().withMessage('User ID is required')],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { userId } = req.params;
            const result = await getStudentRanks(userId);

            if (!result.success) {
                return res.status(404).json(result);
            }

            res.json(result);
        } catch (error: any) {
            console.error('Get ranks error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
);

// ==================== OPTION GENERATION ====================

/**
 * POST /api/options/generate/:userId
 * Generate personalized option entry list
 * 
 * This endpoint:
 * 1. Fetches all saved ranks for the user
 * 2. Queries cutoff data from database
 * 3. Matches student ranks with previous year cutoffs
 * 4. Calculates admission chances
 * 5. Returns sorted list of college options
 */
router.post('/generate/:userId',
    [param('userId').notEmpty().withMessage('User ID is required')],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { userId } = req.params;
            const result = await generateOptionList(userId);

            if (!result.success) {
                return res.status(400).json(result);
            }

            const successResult = result as { success: true; data: any };

            res.json({
                success: true,
                data: successResult.data,
                count: successResult.data?.recommendations?.length || 0,
                message: 'Option list generated successfully'
            });
        } catch (error: any) {
            console.error('Generate options error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
);

// ==================== EXAMPLE USAGE ====================

/**
 * GET /api/options/example
 * Returns example payloads for different scenarios
 */
router.get('/example', (req: Request, res: Response) => {
    res.json({
        success: true,
        examples: {
            standardCourse: {
                description: 'Example for Engineering or other standard courses',
                endpoint: 'POST /api/options/ranks',
                payload: {
                    userId: 'user123',
                    counsellingType: 'UGCET',
                    courseCategory: 'Engineering',
                    branch: 'Computer Science',
                    generalMeritRank: 12345,
                    categoryRank: 6789
                }
            },
            farmScience: {
                description: 'Example for Farm Science (Edge Case - requires both ranks)',
                endpoint: 'POST /api/options/ranks',
                payload: {
                    userId: 'user123',
                    counsellingType: 'UGCET',
                    courseCategory: 'Farm Science',
                    branch: 'Agriculture',
                    theoryRank: 5000,
                    practicalRank: 4800
                }
            },
            veterinary: {
                description: 'Example for Veterinary (Edge Case - requires both ranks)',
                endpoint: 'POST /api/options/ranks',
                payload: {
                    userId: 'user123',
                    counsellingType: 'UGCET',
                    courseCategory: 'Veterinary',
                    theoryRank: 3200,
                    practicalRank: 3100
                }
            },
            generateOptions: {
                description: 'Generate option list after saving ranks',
                endpoint: 'POST /api/options/generate/user123',
                payload: {}
            }
        }
    });
});

export default router;
