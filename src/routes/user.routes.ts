/**
 * User Routes
 * 
 * API endpoints for user profile management
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as userProfileService from '../services/user-profile.service';
import { BaseCategory, CounsellingType } from '../types/domain.types';

const router = Router();

/**
 * POST /api/users/register
 * Create a new user profile with automatic eligibility calculation
 */
router.post(
    '/register',
    [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
        body('baseCategory').isIn(Object.values(BaseCategory)).withMessage('Invalid base category'),
        body('hasKannada').isBoolean().withMessage('hasKannada must be boolean'),
        body('hasRural').isBoolean().withMessage('hasRural must be boolean'),
        body('hasHK').isBoolean().withMessage('hasHK must be boolean'),
        body('counsellingTypes').isArray().withMessage('counsellingTypes must be an array'),
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

            const result = await userProfileService.createUserProfile(req.body);

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(201).json(result);
        } catch (error: any) {
            console.error('User registration error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * GET /api/users/profile/:userId
 * Get user profile by userId
 */
router.get(
    '/profile/:userId',
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

            const result = await userProfileService.getUserProfile(req.params.userId);

            if (!result.success) {
                return res.status(404).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Get profile error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * PUT /api/users/profile/:userId
 * Update user profile (recalculates eligibility if category/flags change)
 */
router.put(
    '/profile/:userId',
    [
        param('userId').notEmpty().withMessage('User ID is required'),
        body('baseCategory').optional().isIn(Object.values(BaseCategory)),
        body('hasKannada').optional().isBoolean(),
        body('hasRural').optional().isBoolean(),
        body('hasHK').optional().isBoolean(),
        body('counsellingTypes').optional().isArray(),
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

            const result = await userProfileService.updateUserProfile(
                req.params.userId,
                req.body
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Update profile error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * POST /api/users/calculate-eligibility
 * Calculate eligible categories without saving
 */
router.post(
    '/calculate-eligibility',
    [
        body('baseCategory').isIn(Object.values(BaseCategory)).withMessage('Invalid base category'),
        body('hasKannada').isBoolean(),
        body('hasRural').isBoolean(),
        body('hasHK').isBoolean(),
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

            const { baseCategory, hasKannada, hasRural, hasHK } = req.body;

            const eligibleCategories = userProfileService.calculateEligibleCategories(
                baseCategory,
                { hasKannada, hasRural, hasHK }
            );

            return res.status(200).json({
                success: true,
                data: {
                    baseCategory,
                    flags: { hasKannada, hasRural, hasHK },
                    eligibleCategories,
                },
            });
        } catch (error: any) {
            console.error('Calculate eligibility error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

/**
 * PUT /api/users/profile/:userId/flags
 * Update profile completion flags
 */
router.put(
    '/profile/:userId/flags',
    [
        param('userId').notEmpty(),
        body('ranksEntered').optional().isBoolean(),
        body('preferencesEntered').optional().isBoolean(),
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

            const result = await userProfileService.updateProfileFlags(
                req.params.userId,
                req.body
            );

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(200).json(result);
        } catch (error: any) {
            console.error('Update flags error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }
);

export default router;
