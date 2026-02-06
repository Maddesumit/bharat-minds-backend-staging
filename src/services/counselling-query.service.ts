/**
 * Counselling Query Service
 * 
 * Production-ready service for fast, index-backed counselling queries.
 * 
 * Key design principles to avoid timeouts:
 * 1. No OR queries - use separate indexed lookups instead
 * 2. Leverage composite indexes for multi-field filtering
 * 3. Use pagination for large result sets
 * 4. Filter by indexed fields first, then apply additional filters
 * 5. Denormalize when necessary to avoid joins
 */

import { Client, Databases, Query } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'main_db';

const COLLECTIONS = {
    colleges: 'farming_vet_colleges',
    courses: 'farming_vet_courses',
    cutoffs: 'farming_vet_cutoffs',
    students: 'farming_vet_students',
};

// Risk level multipliers for cutoff calculation
const RISK_MULTIPLIERS = {
    safe: 0.85,       // 85% of cutoff (safer choices)
    moderate: 1.0,    // 100% of cutoff (at cutoff)
    aggressive: 1.15, // 115% of cutoff (riskier choices)
};

export interface EligibleCourse {
    courseId: string;
    courseName: string;
    branch: string;
    degree: string;
    collegeName: string;
    location: string;
    cutoffRank: number;
    studentRank: number;
    admissionProbability: number; // 0-100
    riskLevel: 'safe' | 'moderate' | 'aggressive';
    round: number;
    year: number;
    predictedCutoff?: number;
}

/**
 * Get eligible courses for a student
 * 
 * This query is optimized to avoid timeouts by:
 * 1. Using indexed category lookup (no OR query)
 * 2. Using indexed year filtering
 * 3. Using range query on cutoff_rank with proper index
 * 4. Paginating results
 * 5. Fetching college/course details in a second pass
 */
export async function getEligibleCourses(
    studentRank: number,
    category: string,
    year: number,
    options: {
        riskLevel?: 'safe' | 'moderate' | 'aggressive';
        branches?: string[];
        locations?: string[];
        degrees?: string[];
        limit?: number;
        offset?: number;
        latestRoundOnly?: boolean;
    } = {}
): Promise<EligibleCourse[]> {
    const {
        riskLevel = 'moderate',
        branches = [],
        locations = [],
        degrees = [],
        limit = 50,
        offset = 0,
        latestRoundOnly = true,
    } = options;

    // Calculate effective cutoff based on risk level
    const multiplier = RISK_MULTIPLIERS[riskLevel];
    const effectiveRank = studentRank * multiplier;

    console.log(`\n🔍 Finding eligible courses for rank ${studentRank} (${category}, ${riskLevel})`);
    console.log(`   Effective rank: ${effectiveRank.toFixed(0)}`);

    // Step 1: Query cutoffs using indexed fields
    // This uses the composite index: idx_category_year_rank
    const queries = [
        Query.equal('category', category),
        Query.equal('year', year),
        Query.lessThanEqual('cutoff_rank', effectiveRank),
        Query.orderDesc('cutoff_rank'), // Get closest to student's rank first
        Query.limit(limit),
        Query.offset(offset),
    ];

    // If latest round only, add round filter
    if (latestRoundOnly) {
        // First, find the latest round
        const latestRoundQuery = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.cutoffs,
            [
                Query.equal('category', category),
                Query.equal('year', year),
                Query.orderDesc('round'),
                Query.limit(1),
            ]
        );

        if (latestRoundQuery.documents.length > 0) {
            const latestRound = latestRoundQuery.documents[0].round;
            queries.push(Query.equal('round', latestRound));
            console.log(`   Latest round: ${latestRound}`);
        }
    }

    const cutoffsResult = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.cutoffs,
        queries
    );

    console.log(`   Found ${cutoffsResult.documents.length} eligible cutoffs`);

    if (cutoffsResult.documents.length === 0) {
        return [];
    }

    // Step 2: Fetch course and college details
    // We do this in a second pass to avoid complex joins
    const eligibleCourses: EligibleCourse[] = [];
    const courseCache = new Map<string, any>();
    const collegeCache = new Map<string, any>();

    for (const cutoff of cutoffsResult.documents) {
        try {
            // Get course details (with caching)
            let course = courseCache.get(cutoff.course_id);
            if (!course) {
                const courseResult = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.courses,
                    [Query.equal('course_id', cutoff.course_id), Query.limit(1)]
                );
                if (courseResult.documents.length === 0) continue;
                course = courseResult.documents[0];
                courseCache.set(cutoff.course_id, course);
            }

            // Apply branch filter
            if (branches.length > 0 && !branches.includes(course.branch)) {
                continue;
            }

            // Apply degree filter
            if (degrees.length > 0 && !degrees.includes(course.degree)) {
                continue;
            }

            // Get college details (with caching)
            let college = collegeCache.get(course.college_id);
            if (!college) {
                const collegeResult = await databases.getDocument(
                    DATABASE_ID,
                    COLLECTIONS.colleges,
                    course.college_id
                );
                college = collegeResult;
                collegeCache.set(course.college_id, college);
            }

            // Apply location filter
            if (locations.length > 0 && !locations.includes(college.location)) {
                continue;
            }

            // Calculate admission probability
            const probability = calculateAdmissionProbability(
                studentRank,
                cutoff.cutoff_rank,
                riskLevel
            );

            eligibleCourses.push({
                courseId: cutoff.course_id,
                courseName: course.course_name,
                branch: course.branch,
                degree: course.degree,
                collegeName: college.college_name,
                location: college.location,
                cutoffRank: cutoff.cutoff_rank,
                studentRank: studentRank,
                admissionProbability: probability,
                riskLevel: riskLevel,
                round: cutoff.round,
                year: cutoff.year,
            });
        } catch (error: any) {
            console.error(`   ⚠️  Error processing cutoff: ${error.message}`);
        }
    }

    console.log(`   Returning ${eligibleCourses.length} eligible courses\n`);
    return eligibleCourses;
}

/**
 * Calculate admission probability based on student rank vs cutoff
 */
function calculateAdmissionProbability(
    studentRank: number,
    cutoffRank: number,
    riskLevel: string
): number {
    // If student rank is better (lower) than cutoff, high probability
    if (studentRank <= cutoffRank * 0.8) {
        return 95;
    } else if (studentRank <= cutoffRank * 0.9) {
        return 85;
    } else if (studentRank <= cutoffRank) {
        return 70;
    } else if (studentRank <= cutoffRank * 1.05) {
        return 50;
    } else if (studentRank <= cutoffRank * 1.1) {
        return 30;
    } else {
        return 15;
    }
}

/**
 * Get cutoff trends for a course
 * Fetches cutoffs from the last N years to identify trends
 */
export async function getCutoffTrends(
    courseId: string,
    category: string,
    yearsBack: number = 3
): Promise<any[]> {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - yearsBack;

    const trends = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.cutoffs,
        [
            Query.equal('course_id', courseId),
            Query.equal('category', category),
            Query.greaterThanEqual('year', startYear),
            Query.orderDesc('year'),
            Query.limit(100),
        ]
    );

    return trends.documents;
}

/**
 * Predict cutoff for next year based on historical trends
 * 
 * Uses linear regression on last 3 years of data
 */
export async function predictCutoff(
    courseId: string,
    category: string,
    targetYear: number
): Promise<{ predictedCutoff: number; confidence: number }> {
    // Get historical data
    const trends = await getCutoffTrends(courseId, category, 3);

    if (trends.length < 2) {
        // Not enough data for prediction
        return { predictedCutoff: 0, confidence: 0 };
    }

    // Group by year and get average cutoff per year
    const yearlyData = new Map<number, number[]>();
    for (const trend of trends) {
        if (!yearlyData.has(trend.year)) {
            yearlyData.set(trend.year, []);
        }
        yearlyData.get(trend.year)!.push(trend.cutoff_rank);
    }

    const yearlyAverages: { year: number; cutoff: number }[] = [];
    for (const [year, cutoffs] of yearlyData) {
        const avg = cutoffs.reduce((a, b) => a + b, 0) / cutoffs.length;
        yearlyAverages.push({ year, cutoff: avg });
    }

    // Sort by year
    yearlyAverages.sort((a, b) => a.year - b.year);

    if (yearlyAverages.length < 2) {
        return { predictedCutoff: 0, confidence: 0 };
    }

    // Simple linear regression
    const n = yearlyAverages.length;
    const sumX = yearlyAverages.reduce((sum, d) => sum + d.year, 0);
    const sumY = yearlyAverages.reduce((sum, d) => sum + d.cutoff, 0);
    const sumXY = yearlyAverages.reduce((sum, d) => sum + d.year * d.cutoff, 0);
    const sumX2 = yearlyAverages.reduce((sum, d) => sum + d.year * d.year, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predictedCutoff = slope * targetYear + intercept;

    // Calculate confidence based on trend consistency
    const variance = yearlyAverages.reduce((sum, d) => {
        const predicted = slope * d.year + intercept;
        return sum + Math.pow(d.cutoff - predicted, 2);
    }, 0) / n;

    const stdDev = Math.sqrt(variance);
    const avgCutoff = sumY / n;
    const coefficientOfVariation = stdDev / avgCutoff;

    // Confidence: lower variation = higher confidence
    const confidence = Math.max(0, Math.min(100, 100 - coefficientOfVariation * 100));

    return {
        predictedCutoff: Math.round(predictedCutoff),
        confidence: Math.round(confidence),
    };
}

/**
 * Get courses by branch with pagination
 */
export async function getCoursesByBranch(
    branch: string,
    limit: number = 50,
    offset: number = 0
): Promise<any[]> {
    const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.courses,
        [
            Query.equal('branch', branch),
            Query.limit(limit),
            Query.offset(offset),
        ]
    );

    return result.documents;
}

/**
 * Get all available branches
 */
export async function getAvailableBranches(): Promise<string[]> {
    // Note: Appwrite doesn't have a native "distinct" query
    // So we fetch all courses and extract unique branches
    // For production, consider caching this result

    const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.courses,
        [Query.limit(1000)] // Adjust based on total courses
    );

    const branches = new Set<string>();
    for (const course of result.documents) {
        branches.add(course.branch);
    }

    return Array.from(branches).sort();
}

/**
 * Get counselling recommendations for a student
 * 
 * Returns courses bucketed by risk level
 */
export async function getCounsellingRecommendations(
    studentRank: number,
    category: string,
    year: number,
    preferences: {
        branches?: string[];
        locations?: string[];
        degrees?: string[];
    } = {}
): Promise<{
    safe: EligibleCourse[];
    moderate: EligibleCourse[];
    aggressive: EligibleCourse[];
}> {
    console.log('\n🎓 Generating counselling recommendations...');

    // Fetch courses for each risk level in parallel
    const [safe, moderate, aggressive] = await Promise.all([
        getEligibleCourses(studentRank, category, year, {
            ...preferences,
            riskLevel: 'safe',
            limit: 20,
        }),
        getEligibleCourses(studentRank, category, year, {
            ...preferences,
            riskLevel: 'moderate',
            limit: 20,
        }),
        getEligibleCourses(studentRank, category, year, {
            ...preferences,
            riskLevel: 'aggressive',
            limit: 20,
        }),
    ]);

    console.log(`   Safe: ${safe.length}`);
    console.log(`   Moderate: ${moderate.length}`);
    console.log(`   Aggressive: ${aggressive.length}\n`);

    return { safe, moderate, aggressive };
}

/**
 * Get predicted cutoffs for eligible courses
 */
export async function getEligibleCoursesWithPredictions(
    studentRank: number,
    category: string,
    currentYear: number,
    targetYear: number,
    options: {
        riskLevel?: 'safe' | 'moderate' | 'aggressive';
        branches?: string[];
        locations?: string[];
        degrees?: string[];
        limit?: number;
    } = {}
): Promise<EligibleCourse[]> {
    // First get eligible courses based on current year
    const eligibleCourses = await getEligibleCourses(
        studentRank,
        category,
        currentYear,
        options
    );

    // Add predictions for each course
    const coursesWithPredictions = await Promise.all(
        eligibleCourses.map(async (course) => {
            const prediction = await predictCutoff(course.courseId, category, targetYear);
            return {
                ...course,
                predictedCutoff: prediction.predictedCutoff,
                predictionConfidence: prediction.confidence,
            };
        })
    );

    return coursesWithPredictions;
}

// Export for use in other modules
export default {
    getEligibleCourses,
    getCutoffTrends,
    predictCutoff,
    getCoursesByBranch,
    getAvailableBranches,
    getCounsellingRecommendations,
    getEligibleCoursesWithPredictions,
};
