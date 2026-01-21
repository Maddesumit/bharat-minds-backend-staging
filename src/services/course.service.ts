/**
 * Course Service
 * 
 * Handles course availability queries and seat type validation
 */

import { ID } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';
import { SeatType, CounsellingType, UGCETCourseType, UGNEETCourseType, CourseAvailability } from '../types/domain.types';

/**
 * Create course offering DTO (Admin only)
 */
export interface CreateCourseDTO {
    collegeId: string;
    collegeCode: string;
    courseType: string;
    branchName?: string;
    branchCode?: string;
    availableSeatTypes: SeatType[];
    totalSeats: number;
    intake?: number;
    accreditation?: string;
    affiliatedTo?: string;
}

/**
 * Get all courses
 */
export async function getAllCourses() {
    try {
        const documents = await databases.listDocuments(
            config.databaseId,
            config.collections.collegeCourses
        );

        return {
            success: true,
            data: documents.documents,
            total: documents.total,
        };
    } catch (error: any) {
        console.error('Get all courses error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get courses',
        };
    }
}

/**
 * Get courses by college
 */
export async function getCoursesByCollege(collegeId: string) {
    try {
        const documents = await databases.listDocuments(
            config.databaseId,
            config.collections.collegeCourses
        );

        const courses = documents.documents.filter((doc: any) => doc.collegeId === collegeId);

        // Parse JSON fields
        const parsed = courses.map((doc: any) => ({
            ...doc,
            availableSeatTypes: JSON.parse(doc.availableSeatTypes || '[]'),
        }));

        return {
            success: true,
            data: parsed,
            count: parsed.length,
        };
    } catch (error: any) {
        console.error('Get courses by college error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get courses',
        };
    }
}

/**
 * Get courses by college code
 */
export async function getCoursesByCollegeCode(collegeCode: string) {
    try {
        const documents = await databases.listDocuments(
            config.databaseId,
            config.collections.collegeCourses
        );

        const courses = documents.documents.filter((doc: any) => doc.collegeCode === collegeCode);

        const parsed = courses.map((doc: any) => ({
            ...doc,
            availableSeatTypes: JSON.parse(doc.availableSeatTypes || '[]'),
        }));

        return {
            success: true,
            data: parsed,
            count: parsed.length,
        };
    } catch (error: any) {
        console.error('Get courses by college code error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get courses',
        };
    }
}

/**
 * Search courses with filters
 */
export async function searchCourses(filters: {
    collegeCode?: string;
    courseType?: string;
    branchCode?: string;
}) {
    try {
        const documents = await databases.listDocuments(
            config.databaseId,
            config.collections.collegeCourses
        );

        let results = documents.documents;

        if (filters.collegeCode) {
            results = results.filter((doc: any) => doc.collegeCode === filters.collegeCode);
        }

        if (filters.courseType) {
            results = results.filter((doc: any) => doc.courseType === filters.courseType);
        }

        if (filters.branchCode) {
            results = results.filter((doc: any) => doc.branchCode === filters.branchCode);
        }

        const parsed = results.map((doc: any) => ({
            ...doc,
            availableSeatTypes: JSON.parse(doc.availableSeatTypes || '[]'),
        }));

        return {
            success: true,
            data: parsed,
            count: parsed.length,
        };
    } catch (error: any) {
        console.error('Search courses error:', error);
        return {
            success: false,
            error: error.message || 'Failed to search courses',
        };
    }
}

/**
 * Get available seat types for UGCET
 */
export function getUGCETSeatTypes() {
    return {
        success: true,
        data: [
            { code: SeatType.GOVERNMENT, name: 'Government' },
            { code: SeatType.AIDED, name: 'Aided' },
            { code: SeatType.PRIVATE, name: 'Private/Unaided' },
        ],
    };
}

/**
 * Get available seat types for UGNEET
 */
export function getUGNEETSeatTypes() {
    return {
        success: true,
        data: [
            { code: SeatType.GOV_UGNEET, name: 'Government' },
            { code: SeatType.PRIVATE_UGNEET, name: 'Private' },
            { code: SeatType.MANAGEMENT, name: 'Management/Payment' },
            { code: SeatType.NRI, name: 'NRI' },
        ],
    };
}

/**
 * Validate if a seat type is valid for counselling type
 */
export function validateSeatType(seatType: SeatType, counsellingType: CounsellingType): boolean {
    if (counsellingType === CounsellingType.UGCET) {
        return [SeatType.GOVERNMENT, SeatType.AIDED, SeatType.PRIVATE].includes(seatType);
    } else if (counsellingType === CounsellingType.UGNEET) {
        return [SeatType.GOV_UGNEET, SeatType.PRIVATE_UGNEET, SeatType.MANAGEMENT, SeatType.NRI].includes(seatType);
    }
    return false;
}

/**
 * Get course availability (combination of college and course data)
 */
export async function getCourseAvailability(
    collegeCode: string,
    courseType: string,
    branchCode?: string
): Promise<{ success: boolean; data?: CourseAvailability; error?: string }> {
    try {
        const filters: any = { collegeCode, courseType };
        if (branchCode) {
            filters.branchCode = branchCode;
        }

        const coursesResult = await searchCourses(filters);

        if (!coursesResult.success || coursesResult.data.length === 0) {
            return {
                success: false,
                error: 'Course not found',
            };
        }

        const course = coursesResult.data[0];

        return {
            success: true,
            data: {
                collegeId: course.collegeId,
                collegeCode: course.collegeCode,
                collegeName: '', // Would need to join with college table
                courseType: course.courseType,
                branchName: course.branchName,
                branchCode: course.branchCode,
                availableSeatTypes: course.availableSeatTypes,
                totalSeats: course.totalSeats,
            },
        };
    } catch (error: any) {
        console.error('Get course availability error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get course availability',
        };
    }
}

/**
 * Create course offering (Admin only)
 */
export async function createCourse(data: CreateCourseDTO) {
    try {
        const courseData = {
            collegeId: data.collegeId,
            collegeCode: data.collegeCode,
            courseType: data.courseType,
            branchName: data.branchName || '',
            branchCode: data.branchCode || '',
            availableSeatTypes: JSON.stringify(data.availableSeatTypes),
            totalSeats: data.totalSeats,
            intake: data.intake || null,
            accreditation: data.accreditation || '',
            affiliatedTo: data.affiliatedTo || '',
        };

        const document = await databases.createDocument(
            config.databaseId,
            config.collections.collegeCourses,
            ID.unique(),
            courseData
        );

        return {
            success: true,
            data: {
                ...document,
                availableSeatTypes: data.availableSeatTypes,
            },
            message: 'Course created successfully',
        };
    } catch (error: any) {
        console.error('Create course error:', error);
        return {
            success: false,
            error: error.message || 'Failed to create course',
        };
    }
}

/**
 * Get all UGCET course types
 */
export function getUGCETCourseTypes() {
    return {
        success: true,
        data: Object.values(UGCETCourseType),
    };
}

/**
 * Get all UGNEET course types
 */
export function getUGNEETCourseTypes() {
    return {
        success: true,
        data: Object.values(UGNEETCourseType),
    };
}

export default {
    getCoursesByCollege,
    getCoursesByCollegeCode,
    searchCourses,
    getUGCETSeatTypes,
    getUGNEETSeatTypes,
    validateSeatType,
    getCourseAvailability,
    createCourse,
    getUGCETCourseTypes,
    getUGNEETCourseTypes,
};
