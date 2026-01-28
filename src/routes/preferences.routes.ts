import { Request, Response, Router } from 'express';
import { ID } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';
import { saveNormalizedPreferences } from '../services/normalized-preferences.service';

const router = Router();

/**
 * Save student preferences
 * POST /api/preferences
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        console.log('📥 Received preferences POST request');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        const {
            colleges,
            courses,
            locations,
            collegeTypes,
            seatTypes
        } = req.body;

        //  CORRECT VALIDATION
        if (
            (!Array.isArray(colleges) || colleges.length === 0) &&
            (!Array.isArray(courses) || courses.length === 0)
        ) {
            console.log(' Validation failed: No colleges or courses selected');
            return res.status(400).json({
                success: false,
                error: 'At least one college or course preference is required'
            });
        }

        // Generate anonymous userId
        const userId = ID.unique();
        const counsellingType = 'UGCET';

        // Prepare options list
        const options: any[] = [];

        if (Array.isArray(colleges) && colleges.length > 0) {
            colleges.forEach((college: any, index: number) => {
                options.push({
                    rank: index + 1,
                    collegeCode: college.code,
                    collegeName: college.name,
                    courseCode: '',
                    branch: ''
                });
            });
        }

        if (Array.isArray(courses) && courses.length > 0) {
            courses.forEach((course: any) => {
                options.push({
                    rank: options.length + 1,
                    collegeCode: '',
                    collegeName: '',
                    courseCode: course.code,
                    branch: course.name
                });
            });
        }

        //  SAFETY CHECK
        if (options.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid preferences generated'
            });
        }

        const now = new Date().toISOString();

        const preferencesData = {
            counsellingType,
            colleges: colleges || [],
            courses: courses || [],
            locations: locations || [],
            collegeTypes: collegeTypes || [],
            seatTypes: seatTypes || [],
            options,
            totalOptions: options.length,
            isLocked: false,
            lastModified: now
        };

        console.log('📦 Preferences to save:', JSON.stringify(preferencesData, null, 2));

        // ============================================
        // DUAL-WRITE IMPLEMENTATION
        // Write to BOTH old and new schemas for migration
        // ============================================

        // 1️⃣ Write to OLD schema (user_preferences) - JSON format
        const legacyDocument = await databases.createDocument(
            config.databaseId,
            config.collections.userPreferences,
            ID.unique(),
            {
                userId,
                preferences: JSON.stringify(preferencesData),
                createdAt: now,
                updatedAt: now
            }
        );

        console.log('✅ [LEGACY] Preferences saved:', legacyDocument.$id);

        // 2️⃣ Write to NEW schema (student_preferences_v2) - Normalized format
        let normalizedResult;
        try {
            normalizedResult = await saveNormalizedPreferences({
                userId,
                colleges: colleges || [],
                courses: courses || [],
                locations: locations || [],
                collegeTypes: collegeTypes || [],
                seatTypes: seatTypes || []
            });

            console.log('✅ [NORMALIZED] Saved', normalizedResult.count, 'preference documents');

        } catch (normalizedError: any) {
            // Non-blocking: If normalized save fails, log but don't fail the request
            console.warn('⚠️  [NORMALIZED] Failed to save (non-blocking):', normalizedError.message);
            normalizedResult = {
                success: false,
                error: normalizedError.message
            };
        }

        // ============================================
        // Return success with metadata from both writes
        // ============================================
        return res.status(201).json({
            success: true,
            data: legacyDocument,
            normalized: {
                enabled: true,
                saved: normalizedResult?.success || false,
                count: normalizedResult?.count || 0,
                error: (normalizedResult as any)?.error
            },
            message: 'Preferences saved successfully'
        });

    } catch (error: any) {
        console.error(' Save preferences error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to save preferences'
        });
    }
});

/**
 * Get preferences
 * GET /api/preferences/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const document = await databases.getDocument(
            config.databaseId,
            config.collections.userPreferences,
            req.params.id
        );

        const parsedPreferences = document.preferences
            ? JSON.parse(document.preferences as string)
            : {};

        res.json({
            success: true,
            data: {
                ...document,
                preferences: parsedPreferences
            }
        });

    } catch (error: any) {
        console.error('Get preferences error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get preferences'
        });
    }
});

/**
 * Delete preferences
 * DELETE /api/preferences/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await databases.deleteDocument(
            config.databaseId,
            config.collections.userPreferences,
            req.params.id
        );

        res.json({
            success: true,
            message: 'Preferences deleted successfully'
        });

    } catch (error: any) {
        console.error('Delete preferences error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete preferences'
        });
    }
});

import { generateOptions } from '../services/option-generator.service';

/**
 * Generate options based on rank and preferences
 * POST /api/preferences/generate-options
 */
router.post('/generate-options', async (req: Request, res: Response) => {
    try {
        console.log('🎲 Generating options request:', req.body);

        const { rank, category, courseCodes, collegeCodes, seatType } = req.body;

        if (!rank || !category) {
            return res.status(400).json({
                success: false,
                error: 'Rank and Category are required'
            });
        }

        const options = await generateOptions({
            rank: parseInt(rank),
            category: category,
            courseCodes,
            collegeCodes,
            seatType
        });

        return res.json({
            success: true,
            count: options.length,
            data: options
        });

    } catch (error: any) {
        console.error('Error generating options:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate options'
        });
    }
});

export default router;
