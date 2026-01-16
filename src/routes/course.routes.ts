/**
 * Course Routes
 * 
 * API endpoints for course availability and seat types
 */

import { Router, Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import * as courseService from '../services/course.service';
import { CounsellingType } from '../types/domain.types';

const router = Router();

/**
 * GET /api/courses/college/:collegeId
 * Get all courses for a college
 */
router.get(
    '/college/:collegeId',
    [param('collegeId').notEmpty().withMessage('College ID is required')],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const result = await courseService.getCoursesByCollege(req.params.collegeId);

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get courses by college error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/courses/college-code/:collegeCode
 * Get all courses for a college by code
 */
router.get(
    '/college-code/:collegeCode',
    [param('collegeCode').notEmpty().withMessage('College code is required')],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const result = await courseService.getCoursesByCollegeCode(req.params.collegeCode);

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get courses by college code error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/courses/search
 * Search courses with filters
 * Query params: collegeCode, courseType, branchCode
 */
router.get('/search', async (req: Request, res: Response) => {
    try {
        const filters = {
            collegeCode: req.query.collegeCode as string,
            courseType: req.query.courseType as string,
            branchCode: req.query.branchCode as string,
        };

        const result = await courseService.searchCourses(filters);

        if (!result.success) {
            return res.status(404).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Search courses error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/courses/seat-types/ugcet
 * Get available seat types for UGCET
 */
router.get('/seat-types/ugcet', async (req: Request, res: Response) => {
    try {
        const result = courseService.getUGCETSeatTypes();
        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Get UGCET seat types error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/courses/seat-types/ugneet
 * Get available seat types for UGNEET
 */
router.get('/seat-types/ugneet', async (req: Request, res: Response) => {
    try {
        const result = courseService.getUGNEETSeatTypes();
        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Get UGNEET seat types error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/courses/course-types/ugcet
 * Get all UGCET course types
 */
router.get('/course-types/ugcet', async (req: Request, res: Response) => {
    try {
        const result = courseService.getUGCETCourseTypes();
        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Get UGCET course types error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/courses/course-types/ugneet
 * Get all UGNEET course types
 */
router.get('/course-types/ugneet', async (req: Request, res: Response) => {
    try {
        const result = courseService.getUGNEETCourseTypes();
        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Get UGNEET course types error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/courses/availability
 * Get course availability
 * Query params: collegeCode, courseType, branchCode (optional)
 */
router.get(
    '/availability',
    [
        query('collegeCode').notEmpty().withMessage('College code is required'),
        query('courseType').notEmpty().withMessage('Course type is required'),
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

            const result = await courseService.getCourseAvailability(
                req.query.collegeCode as string,
                req.query.courseType as string,
                req.query.branchCode as string | undefined
            );

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get course availability error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

export default router;
