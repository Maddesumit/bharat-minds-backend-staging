/**
 * College Comparison Service
 * 
 * Provides functionality to compare colleges based on fees, distance, 
 * placement rates, and overall ratings.
 */

import { Query } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';
import collegeService from './college.service';
import { College } from '../types/domain.types';

/**
 * Wrapper for database operations with timeout and retry logic
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    timeoutMs: number = 30000
): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
            });

            const result = await Promise.race([
                operation(),
                timeoutPromise
            ]);

            return result;
        } catch (error: any) {
            lastError = error;
            console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);

            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

export interface ComparisonCriteria {
    collegeCodes: string[];
    studentLocation?: {
        latitude: number;
        longitude: number;
    };
    priorities?: {
        fees?: boolean;
        distance?: boolean;
        placement?: boolean;
        rating?: boolean;
    };
}

/**
 * Advanced criteria for batch comparing colleges
 */
export interface AdvancedComparisonCriteria extends ComparisonCriteria {
    courseCode?: string;
    category?: string;
    academicYear?: number;
    includeMetrics?: boolean;
    includeFees?: boolean;
}

/**
 * Fee data structure
 */
export interface FeeData {
    tuitionFees: number;
    hostelFees?: number;
    otherFees?: number;
    totalFees: number;
    feeType: string;
    academicYear: number;
    category: string;
}

/**
 * Metric data structure
 */
export interface MetricData {
    collegeCode: string;
    academicYear: number;
    placementRate?: number;
    averagePackage?: number;
    highestPackage?: number;
    nirfRanking?: number;
    naacGrade?: string;
    facultyStudentRatio?: number;
    researchPublications?: number;
    infrastructureScore?: number;
    industryConnections?: number;
    alumniScore?: number;
    overallRating?: number;
    lastUpdated: string;
}

/**
 * Standardized college comparison result
 */
export interface CollegeComparison {
    collegeCode: string;
    collegeName: string;
    collegeType: string;
    city: string;
    district: string;
    // Fee breakdown
    fees?: number;
    tuitionFees?: number;
    hostelFees?: number;
    otherFees?: number;
    feeType?: string;
    // Metrics breakdown
    placementRate?: number;
    nirfRanking?: number;
    overallRating?: number;
    naacGrade?: string;
    // Location & Scoring
    distance?: number; // In kilometers
    overallScore?: number; // Normalized score 0-100
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Fetch fees for multiple colleges with optional filters
 */
async function fetchCollegeFees(
    collegeCodes: string[], 
    filters?: { 
        courseCode?: string; 
        category?: string; 
        academicYear?: number; 
    }
): Promise<Map<string, FeeData>> {
    const feeMap = new Map<string, FeeData>();
    
    try {
        if (!collegeCodes.length) return feeMap;

        // Build query filters
        const queries = [
            Query.equal('collegeCode', collegeCodes),
            Query.limit(collegeCodes.length * 5) // Handle multiple entries per college if needed
        ];

        if (filters?.courseCode) queries.push(Query.equal('courseCode', filters.courseCode));
        if (filters?.category) queries.push(Query.equal('category', filters.category));
        
        // If academicYear is provided, filter by it. Otherwise, we'll sort and pick latest in-memory per college
        if (filters?.academicYear) {
            queries.push(Query.equal('academicYear', filters.academicYear));
        } else {
            queries.push(Query.orderDesc('academicYear'));
        }

        const result = await withRetry(() => 
            databases.listDocuments(
                config.databaseId,
                config.collections.collegeFees,
                queries
            )
        );

        // Process results - pick latest year per collegeCode
        result.documents.forEach((doc: any) => {
            if (!feeMap.has(doc.collegeCode)) {
                feeMap.set(doc.collegeCode, {
                    tuitionFees: doc.tuitionFees,
                    hostelFees: doc.hostelFees,
                    otherFees: doc.otherFees,
                    totalFees: doc.totalFees,
                    feeType: doc.feeType,
                    academicYear: doc.academicYear,
                    category: doc.category
                });
            }
        });

        return feeMap;
    } catch (error) {
        console.error(`Error fetching fees for batch:`, error);
        return feeMap;
    }
}

/**
 * Fetch performance metrics for multiple colleges
 */
async function fetchCollegeMetricsBatch(collegeCodes: string[]): Promise<Map<string, MetricData>> {
    const metricsMap = new Map<string, MetricData>();
    
    try {
        if (!collegeCodes.length) return metricsMap;

        const queries = [
            Query.equal('collegeCode', collegeCodes),
            Query.orderDesc('academicYear'),
            Query.limit(collegeCodes.length * 2) // Latest records focus
        ];

        const result = await withRetry(() => 
            databases.listDocuments(
                config.databaseId,
                config.collections.collegeMetrics,
                queries
            )
        );

        // Map latest metrics per college
        result.documents.forEach((doc: any) => {
            if (!metricsMap.has(doc.collegeCode)) {
                metricsMap.set(doc.collegeCode, {
                    collegeCode: doc.collegeCode,
                    academicYear: doc.academicYear,
                    placementRate: doc.placementRate,
                    averagePackage: doc.averagePackage,
                    highestPackage: doc.highestPackage,
                    nirfRanking: doc.nirfRanking,
                    naacGrade: doc.naacGrade,
                    facultyStudentRatio: doc.facultyStudentRatio,
                    researchPublications: doc.researchPublications,
                    infrastructureScore: doc.infrastructureScore,
                    industryConnections: doc.industryConnections,
                    alumniScore: doc.alumniScore,
                    overallRating: doc.overallRating,
                    lastUpdated: doc.lastUpdated
                });
            }
        });

        return metricsMap;
    } catch (error) {
        console.error(`Error fetching metrics batch:`, error);
        return metricsMap;
    }
}

/**
 * Calculate a composite score for a college based on criteria and priorities
 */
function calculateComparisonScore(
    comparison: CollegeComparison,
    criteria: ComparisonCriteria,
    minMaxRecords: {
        maxFees: number;
        maxDist: number;
    }
): number {
    let score = 0;
    let totalWeight = 0;

    // Weights configuration
    const weights: Record<string, number> = {
        fees: criteria.priorities?.fees ? 40 : 20,
        distance: criteria.priorities?.distance ? 40 : 20,
        placement: criteria.priorities?.placement ? 30 : 20,
        rating: criteria.priorities?.rating ? 30 : 20
    };

    // Fees component (Lower is better)
    if (comparison.fees !== undefined && minMaxRecords.maxFees > 0) {
        const feeScore = (1 - (comparison.fees / minMaxRecords.maxFees)) * weights.fees;
        score += feeScore;
        totalWeight += weights.fees;
    }

    // Distance component (Lower is better)
    if (comparison.distance !== undefined && minMaxRecords.maxDist > 0) {
        const distScore = (1 - (comparison.distance / minMaxRecords.maxDist)) * weights.distance;
        score += distScore;
        totalWeight += weights.distance;
    }

    // Placement component (Higher is better)
    if (comparison.placementRate !== undefined) {
        const placementScore = (comparison.placementRate / 100) * weights.placement;
        score += placementScore;
        totalWeight += weights.placement;
    }

    // Rating component (Higher is better, assuming 1-5 or 1-10 normalized to percentage)
    if (comparison.overallRating !== undefined) {
        // Assume rating is out of 5 based on common patterns, normalization logic can be adjusted
        const ratingNormalization = comparison.overallRating > 5 ? 10 : 5;
        const ratingScore = (comparison.overallRating / ratingNormalization) * weights.rating;
        score += ratingScore;
        totalWeight += weights.rating;
    }

    // Normalize final score to 0-100
    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
}

/**
 * Aggregate all comparison data sources into a unified structure
 */
function aggregateComparisonData(
    colleges: any[],
    feeMap: Map<string, FeeData>,
    metricsMap: Map<string, MetricData>,
    criteria: ComparisonCriteria
): CollegeComparison[] {
    return colleges.map(college => {
        const feeData = feeMap.get(college.collegeCode);
        const metricData = metricsMap.get(college.collegeCode);

        const comparison: CollegeComparison = {
            collegeCode: college.collegeCode,
            collegeName: college.collegeName,
            collegeType: college.collegeType,
            city: college.city,
            district: college.district,
            // Fees
            fees: feeData?.totalFees,
            tuitionFees: feeData?.tuitionFees,
            hostelFees: feeData?.hostelFees,
            otherFees: feeData?.otherFees,
            feeType: feeData?.feeType,
            // Metrics
            placementRate: metricData?.placementRate || college.placementRate,
            nirfRanking: metricData?.nirfRanking,
            overallRating: metricData?.overallRating || college.rating,
            naacGrade: metricData?.naacGrade
        };

        // Calculate distance if coordinates are available
        if (criteria.studentLocation && 
            college.latitude !== undefined && 
            college.longitude !== undefined) {
            comparison.distance = calculateDistance(
                criteria.studentLocation.latitude,
                criteria.studentLocation.longitude,
                college.latitude,
                college.longitude
            );
        }

        return comparison;
    });
}

/**
 * Compare multiple colleges based on input criteria
 */
export async function compareColleges(criteria: ComparisonCriteria) {
    try {
        if (!criteria.collegeCodes || criteria.collegeCodes.length === 0) {
            throw new Error('No college codes provided for comparison');
        }

        // 1. Fetch data from all sources in parallel
        const [feeMap, metricsMap] = await Promise.all([
            fetchCollegeFees(criteria.collegeCodes),
            fetchCollegeMetricsBatch(criteria.collegeCodes)
        ]);

        const colleges: any[] = [];
        for (const code of criteria.collegeCodes) {
            const collegeResult = await collegeService.getCollegeByCode(code);
            if (collegeResult.success && collegeResult.data) {
                colleges.push(collegeResult.data);
            }
        }

        // 2. Aggregate Data
        const comparisonResults = aggregateComparisonData(colleges, feeMap, metricsMap, criteria);

        // 3. Calculate min/max for normalization
        const maxFees = Math.max(...comparisonResults.map(c => c.fees || 0), 0);
        const maxDist = Math.max(...comparisonResults.map(c => c.distance || 0), 0);

        // 4. Calculate scores and Finalize
        const finalizedResults = comparisonResults.map(comp => ({
            ...comp,
            overallScore: calculateComparisonScore(comp, criteria, { maxFees, maxDist })
        }));

        // 5. Sort by overall score (highest first)
        finalizedResults.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

        return {
            success: true,
            data: finalizedResults,
            count: finalizedResults.length
        };

    } catch (error: any) {
        console.error('Compare colleges error:', error);
        return {
            success: false,
            error: error.message || 'Failed to compare colleges'
        };
    }
}

/**
 * Get detailed comparison for a single college, optionally including similar ones
 */
export async function getSingleCollegeComparison(
    collegeCode: string,
    options: {
        courseCode?: string;
        category?: string;
        academicYear?: number;
        includeSimilar?: boolean;
    }
) {
    try {
        // 1. Fetch target college
        const targetResult = await collegeService.getCollegeByCode(collegeCode);
        if (!targetResult.success || !targetResult.data) {
            throw new Error('College not found');
        }

        let colleges = [targetResult.data];
        const collegeCodes = [collegeCode];

        // 2. Fetch similar colleges if requested
        if (options.includeSimilar) {
            const similarResult = await collegeService.getSimilarColleges(collegeCode, 5);
            if (similarResult.success && similarResult.data) {
                similarResult.data.forEach(c => {
                    if (!collegeCodes.includes(c.collegeCode)) {
                        colleges.push(c);
                        collegeCodes.push(c.collegeCode);
                    }
                });
            }
        }

        // 3. Fetch data for all colleges in parallel
        const [feeMap, metricsMap] = await Promise.all([
            fetchCollegeFees(collegeCodes, {
                courseCode: options.courseCode,
                category: options.category,
                academicYear: options.academicYear
            }),
            fetchCollegeMetricsBatch(collegeCodes)
        ]);

        // 4. Aggregate and finalize
        // We pass empty priorities since this is a general view, or we could accept them in options
        const comparisonResults = aggregateComparisonData(colleges, feeMap, metricsMap, { collegeCodes });

        // Calculate min/max for normalization (using the whole batch for relative scoring)
        const maxFees = Math.max(...comparisonResults.map(c => c.fees || 0), 0);
        const maxDist = Math.max(...comparisonResults.map(c => c.distance || 0), 0);

        const finalizedResults = comparisonResults.map(comp => ({
            ...comp,
            overallScore: calculateComparisonScore(comp, { collegeCodes }, { maxFees, maxDist })
        }));

        return {
            success: true,
            data: {
                target: finalizedResults[0],
                similar: finalizedResults.slice(1)
            }
        };

    } catch (error: any) {
        console.error('Single college comparison error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get comparison'
        };
    }
}

/**
 * Advanced batch comparison for up to 50 colleges
 */
export async function compareCollegesBatch(criteria: AdvancedComparisonCriteria) {
    try {
        if (!criteria.collegeCodes || criteria.collegeCodes.length === 0) {
            throw new Error('No college codes provided for comparison');
        }

        if (criteria.collegeCodes.length > 50) {
            throw new Error('Maximum 50 colleges allowed for batch comparison');
        }

        // 1. Fetch data from all sources in parallel
        // We only fetch what is requested, but default to BOTH if neither specified (to maintain compatibility)
        const fetchFees = criteria.includeFees !== false;
        const fetchMetrics = criteria.includeMetrics !== false;

        const [feeMap, metricsMap] = await Promise.all([
            fetchFees ? fetchCollegeFees(criteria.collegeCodes, {
                courseCode: criteria.courseCode,
                category: criteria.category,
                academicYear: criteria.academicYear
            }) : Promise.resolve(new Map<string, FeeData>()),
            fetchMetrics ? fetchCollegeMetricsBatch(criteria.collegeCodes) : Promise.resolve(new Map<string, MetricData>())
        ]);

        const colleges: any[] = [];
        for (const code of criteria.collegeCodes) {
            const collegeResult = await collegeService.getCollegeByCode(code);
            if (collegeResult.success && collegeResult.data) {
                colleges.push(collegeResult.data);
            }
        }

        // 2. Aggregate Data
        const comparisonResults = aggregateComparisonData(colleges, feeMap, metricsMap, criteria);

        // 3. Calculate min/max for normalization
        const maxFees = Math.max(...comparisonResults.map(c => c.fees || 0), 0);
        const maxDist = Math.max(...comparisonResults.map(c => c.distance || 0), 0);

        // 4. Calculate scores and Finalize
        const finalizedResults = comparisonResults.map(comp => ({
            ...comp,
            overallScore: calculateComparisonScore(comp, criteria, { maxFees, maxDist })
        }));

        // 5. Sort by overall score (highest first)
        finalizedResults.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

        return {
            success: true,
            data: finalizedResults,
            count: finalizedResults.length
        };

    } catch (error: any) {
        console.error('Batch compare colleges error:', error);
        return {
            success: false,
            error: error.message || 'Failed to compare colleges batch'
        };
    }
}

export default {
    compareColleges,
    getSingleCollegeComparison,
    compareCollegesBatch
};
