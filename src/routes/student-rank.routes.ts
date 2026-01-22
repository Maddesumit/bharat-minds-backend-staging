import { Request, Response, Router } from 'express';
import { ID } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';

const router = Router();

/**
 * Save student rank data
 * POST /api/student-ranks
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const {
            counsellingType,
            courseCategory,
            branch,
            generalMeritRank,
            theoryRank,
            practicalRank,
            baseCategory,
            reservations,
            specialCategories,
            snqSlab
        } = req.body;

        // Validate required fields
        if (!counsellingType || !courseCategory || !baseCategory) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: counsellingType, courseCategory, baseCategory'
            });
        }

        // Validate rank data
        if (!generalMeritRank && !theoryRank) {
            return res.status(400).json({
                success: false,
                error: 'Either generalMeritRank or theoryRank is required'
            });
        }

        // Generate a temporary userId for anonymous submissions
        // In future, this will come from authenticated user session
        const userId = ID.unique();

        // Prepare rank data according to schema
        const generalMerit = generalMeritRank ? parseInt(String(generalMeritRank)) : 0;
        const theory = theoryRank ? parseInt(String(theoryRank)) : 0;
        const practical = practicalRank ? parseInt(String(practicalRank)) : null;

        // Generate timestamps
        const now = new Date().toISOString();

        // Create document matching exact Appwrite schema
        const document = await databases.createDocument(
            config.databaseId,
            config.collections.studentRanks,
            ID.unique(),
            {
                userId: userId,
                counsellingType: counsellingType,
                courseCategory: courseCategory,
                branch: branch || '',  // Empty string if not provided
                generalMeritRank: generalMerit,
                categoryRank: 0,  // Placeholder, can be calculated later
                theoryRank: theory,
                practicalRank: practical,  // NULL if not provided
                createdAt: now,  // ISO timestamp string
                updatedAt: now  // ISO timestamp string
            }
        );

        res.status(201).json({
            success: true,
            data: document,
            message: 'Rank data saved successfully'
        });

    } catch (error: any) {
        console.error('Save rank error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to save rank data'
        });
    }
});

/**
 * Get student rank by ID
 * GET /api/student-ranks/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const document = await databases.getDocument(
            config.databaseId,
            config.collections.studentRanks,
            req.params.id
        );

        // Parse JSON data
        const eligibilityData = document.eligibilityData
            ? JSON.parse(document.eligibilityData as string)
            : {};

        res.json({
            success: true,
            data: {
                ...document,
                eligibilityData
            }
        });

    } catch (error: any) {
        console.error('Get rank error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get rank data'
        });
    }
});

export default router;
