/**
 * Student Ranks Service
 * 
 * Manages course-wise ranks for students
 * Supports theory ranks, practical scores, and NEET AIR
 */

import { ID } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';
import { CounsellingType, UGCETCourseType, UGNEETCourseType } from '../types/domain.types';

/**
 * Add/Update rank DTO
 */
export interface AddRankDTO {
    userId: string;
    counsellingType: CounsellingType;
    courseType: string; // UGCETCourseType or UGNEETCourseType
    theoryRank?: number;
    practicalScore?: number;
    neetAIR?: number;
}

/**
 * Courses that require practical score
 */
const PRACTICAL_REQUIRED_COURSES = [
    UGCETCourseType.FARM_SCIENCE,
    UGCETCourseType.BVSC_AH,
];

/**
 * Add or update a rank for a student
 * Uses composite key: (userId, counsellingType, courseType)
 */
export async function addOrUpdateRank(data: AddRankDTO) {
    try {
        // Validate rank data
        const validation = validateRankData(data);
        if (!validation.isValid) {
            return {
                success: false,
                error: validation.errors.join(', '),
            };
        }

        // Check if rank already exists
        const existing = await getRank(data.userId, data.counsellingType, data.courseType);

        const rankData: any = {
            userId: data.userId,
            counsellingType: data.counsellingType,
            courseType: data.courseType,
            theoryRank: data.theoryRank || null,
            practicalScore: data.practicalScore || null,
            neetAIR: data.neetAIR || null,
            rankType: determineRankType(data),
        };

        let document;

        if (existing.success && existing.data) {
            // Update existing rank
            document = await databases.updateDocument(
                config.databaseId,
                config.collections.studentRanks,
                existing.data.$id,
                rankData
            );
        } else {
            // Create new rank
            document = await databases.createDocument(
                config.databaseId,
                config.collections.studentRanks,
                ID.unique(),
                rankData
            );
        }

        return {
            success: true,
            data: document,
            message: existing.success ? 'Rank updated successfully' : 'Rank added successfully',
        };
    } catch (error: any) {
        console.error('Add/Update rank error:', error);
        return {
            success: false,
            error: error.message || 'Failed to add/update rank',
        };
    }
}

/**
 * Get a specific rank
 */
export async function getRank(userId: string, counsellingType: string, courseType: string) {
    try {
        const documents = await databases.listDocuments(
            config.databaseId,
            config.collections.studentRanks
        );

        const rank = documents.documents.find(
            (doc: any) =>
                doc.userId === userId &&
                doc.counsellingType === counsellingType &&
                doc.courseType === courseType
        );

        if (!rank) {
            return {
                success: false,
                error: 'Rank not found',
            };
        }

        return {
            success: true,
            data: rank,
        };
    } catch (error: any) {
        console.error('Get rank error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get rank',
        };
    }
}

/**
 * Get all ranks for a user
 */
export async function getAllRanks(userId: string) {
    try {
        const documents = await databases.listDocuments(
            config.databaseId,
            config.collections.studentRanks
        );

        const ranks = documents.documents.filter((doc: any) => doc.userId === userId);

        return {
            success: true,
            data: ranks,
            count: ranks.length,
        };
    } catch (error: any) {
        console.error('Get all ranks error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get ranks',
        };
    }
}

/**
 * Delete a rank
 */
export async function deleteRank(userId: string, counsellingType: string, courseType: string) {
    try {
        const existing = await getRank(userId, counsellingType, courseType);

        if (!existing.success || !existing.data) {
            return existing;
        }

        await databases.deleteDocument(
            config.databaseId,
            config.collections.studentRanks,
            existing.data.$id
        );

        return {
            success: true,
            message: 'Rank deleted successfully',
        };
    } catch (error: any) {
        console.error('Delete rank error:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete rank',
        };
    }
}

/**
 * Validate rank data
 */
export function validateRankData(data: AddRankDTO): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check counselling type
    if (!Object.values(CounsellingType).includes(data.counsellingType)) {
        errors.push('Invalid counselling type');
    }

    // For UGNEET, NEET AIR is required
    if (data.counsellingType === CounsellingType.UGNEET) {
        if (!data.neetAIR) {
            errors.push('NEET AIR is required for UGNEET');
        }
        if (!Object.values(UGNEETCourseType).includes(data.courseType as UGNEETCourseType)) {
            errors.push('Invalid UGNEET course type');
        }
    }

    // For UGCET, theory rank is required
    if (data.counsellingType === CounsellingType.UGCET) {
        if (!data.theoryRank) {
            errors.push('Theory rank is required for UGCET courses');
        }
        if (!Object.values(UGCETCourseType).includes(data.courseType as UGCETCourseType)) {
            errors.push('Invalid UGCET course type');
        }

        // Check if practical score is required
        if (PRACTICAL_REQUIRED_COURSES.includes(data.courseType as UGCETCourseType)) {
            if (!data.practicalScore) {
                errors.push(`Practical score is required for ${data.courseType}`);
            }
        }
    }

    // Validate numeric values
    if (data.theoryRank !== undefined && data.theoryRank <= 0) {
        errors.push('Theory rank must be a positive number');
    }

    if (data.practicalScore !== undefined && data.practicalScore < 0) {
        errors.push('Practical score must be non-negative');
    }

    if (data.neetAIR !== undefined && data.neetAIR <= 0) {
        errors.push('NEET AIR must be a positive number');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Check if a course requires practical score
 */
export function requiresPracticalScore(courseType: string): boolean {
    return PRACTICAL_REQUIRED_COURSES.includes(courseType as UGCETCourseType);
}

/**
 * Determine rank type based on provided data
 */
function determineRankType(data: AddRankDTO): string {
    if (data.neetAIR) return 'NEET_AIR';
    if (data.theoryRank && data.practicalScore) return 'theory_and_practical';
    if (data.theoryRank) return 'theory';
    if (data.practicalScore) return 'practical';
    return 'unknown';
}

/**
 * Get ranks grouped by counselling type
 */
export async function getRanksByCounsellingType(userId: string, counsellingType: CounsellingType) {
    try {
        const allRanks = await getAllRanks(userId);

        if (!allRanks.success) {
            return allRanks;
        }

        const filtered = (allRanks.data || []).filter(
            (rank: any) => rank.counsellingType === counsellingType
        );

        return {
            success: true,
            data: filtered,
            count: filtered.length,
        };
    } catch (error: any) {
        console.error('Get ranks by counselling type error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get ranks',
        };
    }
}

export default {
    addOrUpdateRank,
    getRank,
    getAllRanks,
    deleteRank,
    validateRankData,
    requiresPracticalScore,
    getRanksByCounsellingType,
};
