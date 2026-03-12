/**
 * College Routes
 * 
 * API endpoints for college search and management
 */

import { Router, Request, Response } from 'express';
import { query, param, body, validationResult } from 'express-validator';
import * as collegeService from '../services/college.service';
import * as collegeInsightsService from '../services/college-insights.service';
import * as collegeComparisonService from '../services/college-comparison.service';
import { CollegeType, CounsellingType } from '../types/domain.types';

const router = Router();

/**
 * GET /api/colleges
 * Search colleges with optional filters
 * Query params: collegeCode, collegeName, city, collegeType, counsellingType
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const filters = {
            collegeCode: req.query.collegeCode as string,
            collegeName: req.query.collegeName as string,
            city: req.query.city as string,
            collegeType: req.query.collegeType as CollegeType,
            counsellingType: req.query.counsellingType as CounsellingType,
        };

        const result = await collegeService.searchColleges(filters);

        if (!result.success) {
            return res.status(404).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Search colleges error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/colleges/:code
 * Get college by code
 */
router.get(
    '/:code',
    [param('code').notEmpty().withMessage('College code is required')],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const result = await collegeService.getCollegeByCode(req.params.code);

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get college by code error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/colleges/:code/insights
 * Extra college details for new-tab view:
 * - coursesOfferedCount (inferred from cutoff collections)
 * - cutoff trend series for a specific branchCode (+ optional category)
 *
 * Query params:
 * - branchCode (optional)
 * - category (optional)
 */
router.get(
    '/:code/insights',
    [
        param('code').notEmpty().withMessage('College code is required'),
        query('branchCode').optional().isString(),
        query('category').optional().isString(),
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

            const result = await collegeInsightsService.getCollegeInsights({
                collegeCode: req.params.code,
                branchCode: (req.query.branchCode as string) || undefined,
                category: (req.query.category as string) || undefined,
            });

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get college insights error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);


router.get(
    '/:code/eligible-cutoffs',
    [
        param('code').notEmpty().withMessage('College code is required'),
        query('branchCode').notEmpty().withMessage('branchCode is required'),
        query('baseCategory').notEmpty().withMessage('baseCategory is required'),
        query('hasKannada').notEmpty().withMessage('hasKannada is required'),
        query('hasRural').notEmpty().withMessage('hasRural is required'),
        query('hasHK').notEmpty().withMessage('hasHK is required'),
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

            const parseBool = (v: any) => String(v).toLowerCase() === 'true';

            const result = await collegeInsightsService.getEligibleCutoffs({
                collegeCode: req.params.code,
                branchCode: String(req.query.branchCode),
                baseCategory: String(req.query.baseCategory),
                hasKannada: parseBool(req.query.hasKannada),
                hasRural: parseBool(req.query.hasRural),
                hasHK: parseBool(req.query.hasHK),
            });

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get eligible cutoffs error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/colleges/:code/compare
 * Get comparison data for a single college + optional similar colleges
 */
router.get(
    '/:code/compare',
    [
        param('code').notEmpty().withMessage('College code is required'),
        query('courseCode').optional().isString(),
        query('category').optional().isString(),
        query('academicYear').optional().isInt().toInt(),
        query('includeSimilar').optional().toBoolean()
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

            const result = await collegeComparisonService.getSingleCollegeComparison(
                req.params.code,
                {
                    courseCode: req.query.courseCode as string,
                    category: req.query.category as string,
                    academicYear: req.query.academicYear ? Number(req.query.academicYear) : undefined,
                    includeSimilar: req.query.includeSimilar as any === true
                }
            );

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Single college comparison route error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/colleges/cities/list
 * Get list of all cities
 */
router.get('/cities/list', async (req: Request, res: Response) => {
    try {
        const result = await collegeService.listCities();

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('List cities error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/colleges/districts/list
 * Get list of all districts
 */
router.get('/districts/list', async (req: Request, res: Response) => {
    try {
        const result = await collegeService.listDistricts();

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('List districts error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/colleges/types/list
 * Get all college types
 */
router.get('/types/list', async (req: Request, res: Response) => {
    try {
        const result = collegeService.getAllCollegeTypes();
        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Get college types error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/colleges/by-type/:type
 * Get colleges by type
 */
router.get(
    '/by-type/:type',
    [param('type').isIn(Object.values(CollegeType)).withMessage('Invalid college type')],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const result = await collegeService.getCollegesByType(req.params.type as CollegeType);

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get colleges by type error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/colleges/by-city/:city
 * Get colleges by city
 */
router.get(
    '/by-city/:city',
    [param('city').notEmpty().withMessage('City is required')],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const result = await collegeService.getCollegesByCity(req.params.city);

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get colleges by city error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

import * as multiCourseCollegeService from '../services/multi-course-college.service';

/**
 * GET /api/colleges/by-course-type/:courseType
 * Get colleges by course type (Engineering, Veterinary, Medical, Agriculture)
 */
router.get(
    '/by-course-type/:courseType',
    [param('courseType').isIn(['Engineering', 'Veterinary', 'Medical', 'Agriculture']).withMessage('Invalid course type')],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const filters: any = {
                courseType: req.params.courseType,
                location: req.query.location as string,
                type: req.query.type as string,
                search: req.query.search as string
            };

            const result = await multiCourseCollegeService.getCollegesByCourseType(filters);

            if (!result.success) {
                return res.status(500).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get colleges by course type error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/colleges/locations-by-course-type/:courseType
 * Get unique locations for a course type
 */
router.get(
    '/locations-by-course-type/:courseType',
    [param('courseType').isIn(['Engineering', 'Veterinary', 'Medical', 'Agriculture']).withMessage('Invalid course type')],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const result = await multiCourseCollegeService.getLocationsByCourseType(req.params.courseType);

            if (!result.success) {
                return res.status(500).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get locations by course type error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/colleges/types-by-course-type/:courseType
 * Get unique college types for a course type
 */
router.get(
    '/types-by-course-type/:courseType',
    [param('courseType').isIn(['Engineering', 'Veterinary', 'Medical', 'Agriculture']).withMessage('Invalid course type')],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const result = await multiCourseCollegeService.getTypesByCourseType(req.params.courseType);

            if (!result.success) {
                return res.status(500).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get types by course type error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * POST /api/colleges/compare
 * Compare multiple colleges based on input criteria
 */
router.post(
    '/compare',
    [
        body('collegeCodes').isArray({ min: 2, max: 10 }).withMessage('Provide 2-10 college codes'),
        body('collegeCodes.*').isString().withMessage('Each college code must be a string'),
        body('studentLocation.latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
        body('studentLocation.longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
        body('priorities.fees').optional().isBoolean().withMessage('fees priority must be boolean'),
        body('priorities.distance').optional().isBoolean().withMessage('distance priority must be boolean'),
        body('priorities.placement').optional().isBoolean().withMessage('placement priority must be boolean'),
        body('priorities.rating').optional().isBoolean().withMessage('rating priority must be boolean')
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

            const result = await collegeComparisonService.compareColleges(req.body);

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('College comparison route error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

export default router;
