/**
 * College Routes
 * 
 * API endpoints for college search and management
 */

import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import * as collegeService from '../services/college.service';
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

export default router;
