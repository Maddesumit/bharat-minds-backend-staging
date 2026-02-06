/**
 * Counselling API Routes
 * 
 * Express routes for the normalized counselling system
 */

import express, { Request, Response } from 'express';
import counsellingService from '../services/counselling-query.service';

const router = express.Router();

/**
 * GET /api/counselling/eligible-courses
 * 
 * Get eligible courses for a student based on rank and category
 * 
 * Query parameters:
 * - rank (required): Student's rank
 * - category (required): Student's category (GM, SCG, STG, etc.)
 * - year (required): Admission year
 * - riskLevel (optional): safe, moderate, or aggressive (default: moderate)
 * - branches (optional): Comma-separated list of preferred branches
 * - locations (optional): Comma-separated list of preferred locations
 * - degrees (optional): Comma-separated list of preferred degrees
 * - limit (optional): Maximum number of results (default: 50)
 * - offset (optional): Pagination offset (default: 0)
 */
router.get('/eligible-courses', async (req: Request, res: Response) => {
    try {
        const { rank, category, year, riskLevel, branches, locations, degrees, limit, offset } = req.query;

        // Validate required parameters
        if (!rank || !category || !year) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: rank, category, year',
            });
        }

        const courses = await counsellingService.getEligibleCourses(
            parseInt(rank as string),
            category as string,
            parseInt(year as string),
            {
                riskLevel: (riskLevel as any) || 'moderate',
                branches: branches ? (branches as string).split(',').map(b => b.trim()) : undefined,
                locations: locations ? (locations as string).split(',').map(l => l.trim()) : undefined,
                degrees: degrees ? (degrees as string).split(',').map(d => d.trim()) : undefined,
                limit: limit ? parseInt(limit as string) : 50,
                offset: offset ? parseInt(offset as string) : 0,
            }
        );

        res.json({
            success: true,
            data: courses,
            count: courses.length,
        });
    } catch (error: any) {
        console.error('Error fetching eligible courses:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

/**
 * GET /api/counselling/recommendations
 * 
 * Get counselling recommendations bucketed by risk level
 * 
 * Query parameters:
 * - rank (required): Student's rank
 * - category (required): Student's category
 * - year (required): Admission year
 * - branches (optional): Comma-separated list of preferred branches
 * - locations (optional): Comma-separated list of preferred locations
 * - degrees (optional): Comma-separated list of preferred degrees
 */
router.get('/recommendations', async (req: Request, res: Response) => {
    try {
        const { rank, category, year, branches, locations, degrees } = req.query;

        if (!rank || !category || !year) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: rank, category, year',
            });
        }

        const recommendations = await counsellingService.getCounsellingRecommendations(
            parseInt(rank as string),
            category as string,
            parseInt(year as string),
            {
                branches: branches ? (branches as string).split(',').map(b => b.trim()) : undefined,
                locations: locations ? (locations as string).split(',').map(l => l.trim()) : undefined,
                degrees: degrees ? (degrees as string).split(',').map(d => d.trim()) : undefined,
            }
        );

        res.json({
            success: true,
            data: recommendations,
            summary: {
                safe: recommendations.safe.length,
                moderate: recommendations.moderate.length,
                aggressive: recommendations.aggressive.length,
                total: recommendations.safe.length + recommendations.moderate.length + recommendations.aggressive.length,
            },
        });
    } catch (error: any) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

/**
 * GET /api/counselling/predict-cutoff
 * 
 * Predict cutoff for a course in the target year
 * 
 * Query parameters:
 * - courseId (required): Course ID
 * - category (required): Student's category
 * - targetYear (required): Year to predict for
 */
router.get('/predict-cutoff', async (req: Request, res: Response) => {
    try {
        const { courseId, category, targetYear } = req.query;

        if (!courseId || !category || !targetYear) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: courseId, category, targetYear',
            });
        }

        const prediction = await counsellingService.predictCutoff(
            courseId as string,
            category as string,
            parseInt(targetYear as string)
        );

        res.json({
            success: true,
            data: prediction,
        });
    } catch (error: any) {
        console.error('Error predicting cutoff:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

/**
 * GET /api/counselling/cutoff-trends
 * 
 * Get historical cutoff trends for a course
 * 
 * Query parameters:
 * - courseId (required): Course ID
 * - category (required): Student's category
 * - yearsBack (optional): Number of years to look back (default: 3)
 */
router.get('/cutoff-trends', async (req: Request, res: Response) => {
    try {
        const { courseId, category, yearsBack } = req.query;

        if (!courseId || !category) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: courseId, category',
            });
        }

        const trends = await counsellingService.getCutoffTrends(
            courseId as string,
            category as string,
            yearsBack ? parseInt(yearsBack as string) : 3
        );

        res.json({
            success: true,
            data: trends,
            count: trends.length,
        });
    } catch (error: any) {
        console.error('Error fetching cutoff trends:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

/**
 * GET /api/counselling/branches
 * 
 * Get all available branches
 */
router.get('/branches', async (req: Request, res: Response) => {
    try {
        const branches = await counsellingService.getAvailableBranches();

        res.json({
            success: true,
            data: branches,
            count: branches.length,
        });
    } catch (error: any) {
        console.error('Error fetching branches:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

/**
 * GET /api/counselling/courses-by-branch
 * 
 * Get courses by branch with pagination
 * 
 * Query parameters:
 * - branch (required): Branch name
 * - limit (optional): Maximum number of results (default: 50)
 * - offset (optional): Pagination offset (default: 0)
 */
router.get('/courses-by-branch', async (req: Request, res: Response) => {
    try {
        const { branch, limit, offset } = req.query;

        if (!branch) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: branch',
            });
        }

        const courses = await counsellingService.getCoursesByBranch(
            branch as string,
            limit ? parseInt(limit as string) : 50,
            offset ? parseInt(offset as string) : 0
        );

        res.json({
            success: true,
            data: courses,
            count: courses.length,
        });
    } catch (error: any) {
        console.error('Error fetching courses by branch:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

/**
 * GET /api/counselling/eligible-with-predictions
 * 
 * Get eligible courses with cutoff predictions
 * 
 * Query parameters:
 * - rank (required): Student's rank
 * - category (required): Student's category
 * - currentYear (required): Current year for eligibility
 * - targetYear (required): Target year for predictions
 * - riskLevel (optional): safe, moderate, or aggressive
 * - branches (optional): Comma-separated list of preferred branches
 * - limit (optional): Maximum number of results (default: 50)
 */
router.get('/eligible-with-predictions', async (req: Request, res: Response) => {
    try {
        const { rank, category, currentYear, targetYear, riskLevel, branches, limit } = req.query;

        if (!rank || !category || !currentYear || !targetYear) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: rank, category, currentYear, targetYear',
            });
        }

        const courses = await counsellingService.getEligibleCoursesWithPredictions(
            parseInt(rank as string),
            category as string,
            parseInt(currentYear as string),
            parseInt(targetYear as string),
            {
                riskLevel: (riskLevel as any) || 'moderate',
                branches: branches ? (branches as string).split(',').map(b => b.trim()) : undefined,
                limit: limit ? parseInt(limit as string) : 50,
            }
        );

        res.json({
            success: true,
            data: courses,
            count: courses.length,
        });
    } catch (error: any) {
        console.error('Error fetching eligible courses with predictions:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
});

export default router;
