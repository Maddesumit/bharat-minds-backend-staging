/**
 * Students Routes
 *
 * Backend-owned persistence for student profiles.
 * Only Engineering (UGCET) related data is persisted per current product scope.
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { databases, config } from '../config/appwrite.config';
import { normalizeEngineeringStudentDocument } from '../utils/engineering-student.util';

const router = Router();

/**
 * POST /api/students
 * Create/update a student profile (document id = userId)
 */
router.post(
    '/',
    [
        body('userId').notEmpty().withMessage('userId is required'),
        body('name').notEmpty().withMessage('name is required'),
        body('mobile').notEmpty().withMessage('mobile is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('baseCategory').notEmpty().withMessage('baseCategory is required'),
        body('courseRanks').isArray().withMessage('courseRanks must be an array'),
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { userId, payload } = normalizeEngineeringStudentDocument(req.body);
            if (!userId) {
                return res.status(400).json({ success: false, error: 'Invalid userId' });
            }

            try {
                const created = await databases.createDocument(
                    config.databaseId,
                    config.collections.students,
                    userId,
                    payload
                );

                return res.status(201).json({
                    success: true,
                    action: 'created',
                    data: { id: created.$id },
                });
            } catch (error: any) {
                // 409: document already exists -> update
                if (error?.code === 409 || error?.type === 'document_already_exists') {
                    const { createdAt, ...updatePayload } = payload;
                    const updated = await databases.updateDocument(
                        config.databaseId,
                        config.collections.students,
                        userId,
                        updatePayload
                    );

                    return res.status(200).json({
                        success: true,
                        action: 'updated',
                        data: { id: updated.$id },
                    });
                }

                // Missing collection is a common setup issue
                if (error?.code === 404 || String(error?.message || '').toLowerCase().includes('collection')) {
                    return res.status(400).json({
                        success: false,
                        error: 'Students collection is not set up in Appwrite. Run the setup script on the backend first.',
                        hint: 'npm run setup:students',
                    });
                }

                throw error;
            }
        } catch (error: any) {
            console.error('Save student error:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to save student profile',
            });
        }
    }
);

/**
 * GET /api/students/:userId
 * Fetch a student profile by userId (document id)
 */
router.get(
    '/:userId',
    [param('userId').notEmpty().withMessage('userId is required')],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const doc = await databases.getDocument(
                config.databaseId,
                config.collections.students,
                req.params.userId
            );

            return res.status(200).json({ success: true, data: doc });
        } catch (error: any) {
            const message = error?.message || 'Failed to fetch student profile';
            const code = error?.code;
            if (code === 404) {
                return res.status(404).json({ success: false, error: 'Student profile not found' });
            }
            console.error('Get student error:', error);
            return res.status(500).json({ success: false, error: message });
        }
    }
);

export default router;
