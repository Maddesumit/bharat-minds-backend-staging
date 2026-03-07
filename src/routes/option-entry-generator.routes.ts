/**
 * Option Entry Generator Routes
 
 * - document id = userId (same as Students doc id)
 * - also stores userId as an attribute for querying/indexing
 */

import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { databases, config } from '../config/appwrite.config';

const router = Router();

function isMissingCollectionError(error: any): boolean {
    return (
        error?.code === 404 ||
        error?.type === 'collection_not_found' ||
        error?.type === 'database_not_found' ||
        (typeof error?.message === 'string' && error.message.toLowerCase().includes('collection'))
    );
}

/**
 * POST /api/option-entry-generator
 * Upsert a user's saved option-entry list.
 *
 * Engineering-only scope: courseType must be "Engineering".
 */
router.post(
    '/',
    [
        body('userId').notEmpty().withMessage('userId is required'),
        body('courseType').optional().isString(),
        body('options').isArray().withMessage('options must be an array'),
    ],
    async (req: Request, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const userId = String(req.body.userId).trim();
            const courseType = String(req.body.courseType || 'Engineering').trim();
            if (courseType !== 'Engineering') {
                return res.status(400).json({
                    success: false,
                    error: 'Only Engineering preferences are supported for option-entry generator saving.',
                });
            }

            const options = Array.isArray(req.body.options) ? req.body.options : [];
            const now = new Date().toISOString();

            const payload = {
                userId,
                courseType,
                options: JSON.stringify(options),
                count: options.length,
                updatedAt: now,
                createdAt: now,
            };

            try {
                const created = await databases.createDocument(
                    config.databaseId,
                    config.collections.optionEntryGenerator,
                    userId,
                    payload
                );

                return res.status(201).json({
                    success: true,
                    action: 'created',
                    data: { id: created.$id },
                });
            } catch (error: any) {
                if (isMissingCollectionError(error)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Option-entry generator collection is not set up in Appwrite. Run the setup script on the backend first.',
                        hint: 'npm run setup:option-entry',
                    });
                }

                if (error?.code === 409 || error?.type === 'document_already_exists') {
                    const { createdAt, ...updatePayload } = payload;
                    const updated = await databases.updateDocument(
                        config.databaseId,
                        config.collections.optionEntryGenerator,
                        userId,
                        updatePayload
                    );

                    return res.status(200).json({
                        success: true,
                        action: 'updated',
                        data: { id: updated.$id },
                    });
                }

                throw error;
            }
        } catch (error: any) {
            console.error('Save option-entry list error:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to save option-entry list',
            });
        }
    }
);

/**
 * GET /api/option-entry-generator/:userId
 * Fetch the saved option-entry list for a user.
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
                config.collections.optionEntryGenerator,
                req.params.userId
            );

            let options: any[] = [];
            try {
                options = doc.options ? JSON.parse(String(doc.options)) : [];
            } catch {
                options = [];
            }

            return res.status(200).json({
                success: true,
                data: {
                    ...doc,
                    options,
                },
            });
        } catch (error: any) {
            if (error?.code === 404) {
                return res.status(404).json({ success: false, error: 'Saved list not found' });
            }
            console.error('Get option-entry list error:', error);
            return res.status(500).json({ success: false, error: error.message || 'Failed to fetch saved list' });
        }
    }
);

export default router;

