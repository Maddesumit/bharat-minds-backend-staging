/**
 * Ranks Routes
 * 
 * API endpoints for student rank management
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as ranksService from '../services/ranks.service';
import { CounsellingType } from '../types/domain.types';

const router = Router();

/**
 * POST /api/ranks
 * Add or update a rank for a student
 */
router.post(
    '/',
    [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('counsellingType').isIn(Object.values(CounsellingType)).withMessage('Invalid counselling type'),
        body('courseType').notEmpty().withMessage('Course type is required'),
        body('theoryRank').optional().isInt({ min: 1 }).withMessage('Theory rank must be positive integer'),
        body('practicalScore').optional().isInt({ min: 0 }).withMessage('Practical score must be non-negative integer'),
        body('neetAIR').optional().isInt({ min: 1 }).withMessage('NEET AIR must be positive integer'),
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

            const result = await ranksService.addOrUpdateRank(req.body);

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(result.data ? 200 : 201).json(result);
        } catch (error: any) {
            console.error('Add/update rank error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/ranks/:userId
 * Get all ranks for a user
 */
router.get(
    '/:userId',
    [param('userId').notEmpty().withMessage('User ID is required')],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const result = await ranksService.getAllRanks(req.params.userId);

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get ranks error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/ranks/:userId/:counsellingType
 * Get ranks by counselling type
 */
router.get(
    '/:userId/:counsellingType',
    [
        param('userId').notEmpty().withMessage('User ID is required'),
        param('counsellingType').isIn(Object.values(CounsellingType)).withMessage('Invalid counselling type'),
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

            const result = await ranksService.getRanksByCounsellingType(
                req.params.userId,
                req.params.counsellingType as CounsellingType
            );

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get ranks by counselling type error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * DELETE /api/ranks/:userId/:counsellingType/:courseType
 * Delete a specific rank
 */
router.delete(
    '/:userId/:counsellingType/:courseType',
    [
        param('userId').notEmpty(),
        param('counsellingType').isIn(Object.values(CounsellingType)),
        param('courseType').notEmpty(),
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

            const { userId, counsellingType, courseType } = req.params;

            const result = await ranksService.deleteRank(userId, counsellingType, courseType);

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Delete rank error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * POST /api/ranks/validate
 * Validate rank data without saving
 */
router.post(
    '/validate',
    [
        body('userId').notEmpty(),
        body('counsellingType').isIn(Object.values(CounsellingType)),
        body('courseType').notEmpty(),
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

            const validation = ranksService.validateRankData(req.body);

            return res.status(200).json({
                success: true,
                validation,
            });
        } catch (error: any) {
            console.error('Validate rank error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/ranks/practical-required/:courseType
 * Check if a course requires practical score
 */
router.get(
    '/practical-required/:courseType',
    [param('courseType').notEmpty()],
    async (req: Request, res: Response) => {
        try {
            const required = ranksService.requiresPracticalScore(req.params.courseType);

            return res.status(200).json({
                success: true,
                courseType: req.params.courseType,
                practicalRequired: required,
            });
        } catch (error: any) {
            console.error('Check practical required error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

export default router;
