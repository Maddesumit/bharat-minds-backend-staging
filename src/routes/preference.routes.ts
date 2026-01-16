/**
 * Preference Routes (CRITICAL)
 * 
 * API endpoints for option entry preference management with comprehensive validation
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as preferenceService from '../services/preference.service';
import { CounsellingType, SeatType } from '../types/domain.types';

const router = Router();

/**
 * POST /api/preferences
 * Add a single preference entry
 */
router.post(
    '/',
    [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('counsellingType').isIn(Object.values(CounsellingType)).withMessage('Invalid counselling type'),
        body('collegeId').notEmpty().withMessage('College ID is required'),
        body('collegeCode').notEmpty().withMessage('College code is required'),
        body('collegeName').notEmpty().withMessage('College name is required'),
        body('courseType').notEmpty().withMessage('Course type is required'),
        body('seatType').isIn(Object.values(SeatType)).withMessage('Invalid seat type'),
        body('category').notEmpty().withMessage('Category is required'),
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

            const result = await preferenceService.addPreference(req.body);

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(201).json(result);
        } catch (error: any) {
            console.error('Add preference error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * POST /api/preferences/bulk
 * Add multiple preferences at once
 */
router.post(
    '/bulk',
    [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('counsellingType').isIn(Object.values(CounsellingType)).withMessage('Invalid counselling type'),
        body('preferences').isArray({ min: 1 }).withMessage('Preferences must be a non-empty array'),
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

            const { userId, counsellingType, preferences } = req.body;

            const result = await preferenceService.bulkAddPreferences(
                userId,
                counsellingType,
                preferences
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(201).json(result);
        } catch (error: any) {
            console.error('Bulk add preferences error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/preferences/:userId/:counsellingType
 * Get user's preferences for a counselling type
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

            const result = await preferenceService.getPreferences(
                req.params.userId,
                req.params.counsellingType as CounsellingType
            );

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get preferences error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * DELETE /api/preferences/:userId/:counsellingType/:priority
 * Remove a preference by priority
 */
router.delete(
    '/:userId/:counsellingType/:priority',
    [
        param('userId').notEmpty(),
        param('counsellingType').isIn(Object.values(CounsellingType)),
        param('priority').isInt({ min: 1 }).withMessage('Priority must be a positive integer'),
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

            const result = await preferenceService.removePreference(
                req.params.userId,
                req.params.counsellingType as CounsellingType,
                parseInt(req.params.priority)
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Remove preference error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * PUT /api/preferences/reorder
 * Reorder preferences (change priority)
 */
router.put(
    '/reorder',
    [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('counsellingType').isIn(Object.values(CounsellingType)),
        body('fromPriority').isInt({ min: 1 }),
        body('toPriority').isInt({ min: 1 }),
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

            const { userId, counsellingType, fromPriority, toPriority } = req.body;

            const result = await preferenceService.reorderPreferences(
                userId,
                counsellingType,
                fromPriority,
                toPriority
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Reorder preferences error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * POST /api/preferences/lock
 * Lock preferences (finalize submission with validation)
 */
router.post(
    '/lock',
    [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('counsellingType').isIn(Object.values(CounsellingType)),
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

            const { userId, counsellingType } = req.body;

            const result = await preferenceService.lockPreferences(userId, counsellingType);

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Lock preferences error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * POST /api/preferences/unlock
 * Unlock preferences (admin only)
 */
router.post(
    '/unlock',
    [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('counsellingType').isIn(Object.values(CounsellingType)),
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

            const { userId, counsellingType } = req.body;

            const result = await preferenceService.unlockPreferences(userId, counsellingType);

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Unlock preferences error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

export default router;
