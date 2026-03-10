import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import * as authService from '../services/auth.service';
import { CounsellingType } from '../schemas/database.schema';

const router = Router();

/**
 * GET /api/auth
 * Get information about available auth endpoints
 */
router.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'BharatMinds AI Authentication API',
        version: '1.0.0',
        endpoints: {
            register: {
                method: 'POST',
                path: '/api/auth/register',
                description: 'Register a new user with extended profile',
                requiresAuth: false,
            },
            getProfile: {
                method: 'GET',
                path: '/api/auth/profile/:userId',
                description: 'Get user profile by userId',
                requiresAuth: true,
            },
            updateProfile: {
                method: 'PUT',
                path: '/api/auth/profile/:profileId',
                description: 'Update user profile',
                requiresAuth: true,
            },
            deleteUser: {
                method: 'DELETE',
                path: '/api/auth/user/:userId/:profileId',
                description: 'Delete user and profile',
                requiresAuth: true,
            },
            getUserByEmail: {
                method: 'GET',
                path: '/api/auth/user/email/:email',
                description: 'Get user by email address',
                requiresAuth: true,
            },
        },
    });
});

/**
 * POST /api/auth/register
 * Register a new user with extended profile
 */
router.post(
    '/register',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/)
            .withMessage('Password must contain uppercase letter')
            .matches(/[a-z]/)
            .withMessage('Password must contain lowercase letter')
            .matches(/[0-9!@#$%^&*]/)
            .withMessage('Password must contain number or symbol'),
        body('name').notEmpty().withMessage('Name is required'),
        body('phone').optional().isMobilePhone('any'),
    ],
    async (req: Request, res: Response) => {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const { email, password, name, phone, college, city, state, examType, currentYear, stream, preferredLanguage } = req.body;

            // Create user in Appwrite Auth
            const userResult = await authService.createUser({
                email,
                password,
                name,
                phone,
            });

            if (!userResult.success || !userResult.data) {
                const status = userResult.code === 409 ? 409 : 400;
                return res.status(status).json(userResult);
            }

            const userId = userResult.data.$id;

            // Create user profile
            const profileResult = await authService.createUserProfile({
                userId,
                name,
                email,
                phone,
                college,
                city,
                state,
                examType: examType as CounsellingType,
                currentYear,
                stream,
                preferredLanguage,
            });

            if (!profileResult.success) {
                // Rollback: delete user if profile creation fails
                console.error('Profile creation failed, rolling back user creation');
                // Note: In production, implement proper transaction handling
            }

            return res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: {
                        id: userId,
                        email: userResult.data.email,
                        name: userResult.data.name,
                    },
                    profile: profileResult.data,
                },
            });
        } catch (error: any) {
            console.error('Registration error:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message,
            });
        }
    }
);

/**
 * GET /api/auth/profile/:userId
 * Get user profile by userId
 */
router.get('/profile/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const result = await authService.getUserProfile(userId);

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
});

/**
 * PUT /api/auth/profile/:profileId
 * Update user profile
 */
router.put(
    '/profile/:profileId',
    [
        body('college').optional().isString(),
        body('city').optional().isString(),
        body('state').optional().isString(),
        body('examType').optional().isIn(['UGCET', 'UGNEET', 'COMBINED']),
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

            const { profileId } = req.params;
            const updateData = req.body;

            const result = await authService.updateUserProfile(profileId, updateData);

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
 * DELETE /api/auth/user/:userId/:profileId
 * Delete user and profile
 */
router.delete('/user/:userId/:profileId', async (req: Request, res: Response) => {
    try {
        const { userId, profileId } = req.params;

        const result = await authService.deleteUser(userId, profileId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Delete user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * GET /api/auth/user/email/:email
 * Get user by email
 */
router.get('/user/email/:email', async (req: Request, res: Response) => {
    try {
        const { email } = req.params;

        const result = await authService.getUserByEmail(email);

        if (!result.success) {
            return res.status(404).json(result);
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Get user by email error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

export default router;
