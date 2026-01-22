import { Request, Response, Router } from 'express';
import { ID } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';

const router = Router();

/**
 * Save student preferences
 * POST /api/preferences
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const {
            colleges,
            courses,
            locations,
            collegeTypes,
            seatTypes
        } = req.body;

        // Validate required fields
        if (!colleges && !courses) {
            return res.status(400).json({
                success: false,
                error: 'At least one college or course preference is required'
            });
        }

        // Generate a temporary userId for anonymous submissions
        const userId = ID.unique();
        const counsellingType = 'UGCET'; // Default, can be dynamic

        // Generate timestamps
        const now = new Date().toISOString();

        // Prepare options data (list of preferences)
        const options = [];

        // If colleges selected, create preferences for them
        if (colleges && colleges.length > 0) {
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

        // If courses selected, add them
        if (courses && courses.length > 0) {
            courses.forEach((course: any, index: number) => {
                options.push({
                    rank: options.length + 1,
                    collegeCode: '',
                    collegeName: '',
                    courseCode: course.code,
                    branch: course.name
                });
            });
        }

        // Create document matching Appwrite schema
        const document = await databases.createDocument(
            config.databaseId,
            config.collections.userPreferences,
            ID.unique(),
            {
                userId: userId,
                counsellingType: counsellingType,
                options: JSON.stringify(options), // Array of preferences
                totalOptions: options.length,
                isLocked: false,
                lastModified: now,

                // Store additional filter data as JSON
                filters: JSON.stringify({
                    locations: locations || [],
                    collegeTypes: collegeTypes || [],
                    seatTypes: seatTypes || []
                })
            }
        );

        res.status(201).json({
            success: true,
            data: document,
            message: 'Preferences saved successfully'
        });

    } catch (error: any) {
        console.error('Save preferences error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to save preferences'
        });
    }
});

/**
 * Get user preferences
 * GET /api/preferences/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const document = await databases.getDocument(
            config.databaseId,
            config.collections.userPreferences,
            req.params.id
        );

        // Parse JSON data
        const options = document.options ? JSON.parse(document.options as string) : [];
        const filters = document.filters ? JSON.parse(document.filters as string) : {};

        res.json({
            success: true,
            data: {
                ...document,
                options,
                filters
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
 * Update user preferences
 * PUT /api/preferences/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const {
            colleges,
            courses,
            locations,
            collegeTypes,
            seatTypes
        } = req.body;

        // Prepare updated options
        const options = [];

        if (colleges && colleges.length > 0) {
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

        if (courses && courses.length > 0) {
            courses.forEach((course: any, index: number) => {
                options.push({
                    rank: options.length + 1,
                    collegeCode: '',
                    collegeName: '',
                    courseCode: course.code,
                    branch: course.name
                });
            });
        }

        const now = new Date().toISOString();

        // Update document
        const document = await databases.updateDocument(
            config.databaseId,
            config.collections.userPreferences,
            req.params.id,
            {
                options: JSON.stringify(options),
                totalOptions: options.length,
                lastModified: now,
                filters: JSON.stringify({
                    locations: locations || [],
                    collegeTypes: collegeTypes || [],
                    seatTypes: seatTypes || []
                })
            }
        );

        res.json({
            success: true,
            data: document,
            message: 'Preferences updated successfully'
        });

    } catch (error: any) {
        console.error('Update preferences error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update preferences'
        });
    }
});

/**
 * Delete user preferences
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

export default router;
