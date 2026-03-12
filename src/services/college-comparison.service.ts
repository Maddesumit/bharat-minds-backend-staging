/**
 * College Comparison Service
 * 
 * Provides functionality to compare colleges based on fees, distance, 
 * placement rates, and overall ratings.
 */

import { Query } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';
import collegeService from './college.service';

/**
 * Criteria for comparing colleges
 */
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
 * Standardized college comparison result
 */
export interface CollegeComparison {
    collegeCode: string;
    collegeName: string;
    collegeType: string;
    city: string;
    fees?: number;
    distance?: number; // In kilometers
    placementRate?: number;
    rating?: number;
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
 * Fetch fees for a specific college
 */
async function fetchCollegeFees(collegeCode: string): Promise<number | null> {
    try {
        const result = await databases.listDocuments(
            config.databaseId,
            config.collections.collegeFees,
            [
                Query.equal('collegeCode', collegeCode),
                Query.orderDesc('academicYear'),
                Query.limit(1)
            ]
        );

        if (result.documents.length > 0) {
            return result.documents[0].totalFees || result.documents[0].tuitionFees || null;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching fees for ${collegeCode}:`, error);
        return null;
    }
}

/**
 * Fetch performance metrics for a specific college
 */
async function fetchCollegeMetrics(collegeCode: string): Promise<any | null> {
    try {
        const result = await databases.listDocuments(
            config.databaseId,
            config.collections.collegeMetrics,
            [
                Query.equal('collegeCode', collegeCode),
                Query.orderDesc('academicYear'),
                Query.limit(1)
            ]
        );

        if (result.documents.length > 0) {
            return result.documents[0];
        }
        return null;
    } catch (error) {
        console.error(`Error fetching metrics for ${collegeCode}:`, error);
        return null;
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
    if (comparison.rating !== undefined) {
        // Assume rating is out of 5 based on common patterns, normalization logic can be adjusted
        const ratingNormalization = comparison.rating > 5 ? 10 : 5;
        const ratingScore = (comparison.rating / ratingNormalization) * weights.rating;
        score += ratingScore;
        totalWeight += weights.rating;
    }

    // Normalize final score to 0-100
    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
}

/**
 * Compare multiple colleges based on input criteria
 */
export async function compareColleges(criteria: ComparisonCriteria) {
    try {
        if (!criteria.collegeCodes || criteria.collegeCodes.length === 0) {
            throw new Error('No college codes provided for comparison');
        }

        const comparisonResults: CollegeComparison[] = [];

        // 1. Fetch data for each college
        for (const code of criteria.collegeCodes) {
            const collegeResult = await collegeService.getCollegeByCode(code);

            if (!collegeResult.success || !collegeResult.data) {
                continue; // Skip colleges that don't exist
            }

            const college = collegeResult.data;
            const fees = await fetchCollegeFees(code);
            const metrics = await fetchCollegeMetrics(code);

            const comparison: CollegeComparison = {
                collegeCode: college.collegeCode,
                collegeName: college.collegeName,
                collegeType: college.collegeType,
                city: college.city,
                fees: fees || undefined,
                placementRate: metrics?.placementRate || undefined,
                rating: metrics?.overallRating || college.rating || undefined // Use metric rating or college master rating
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

            comparisonResults.push(comparison);
        }

        // 2. Calculate min/max for normalization
        const maxFees = Math.max(...comparisonResults.map(c => c.fees || 0), 0);
        const maxDist = Math.max(...comparisonResults.map(c => c.distance || 0), 0);

        // 3. Calculate scores and Finalize
        const finalizedResults = comparisonResults.map(comp => ({
            ...comp,
            overallScore: calculateComparisonScore(comp, criteria, { maxFees, maxDist })
        }));

        // 4. Sort by overall score (highest first)
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

export default {
    compareColleges
};
