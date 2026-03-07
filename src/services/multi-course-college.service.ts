/**
 * Multi-Course College Service
 * 
 * Handles college retrieval for different course types from the main colleges collection.
 */

import { databases, config } from '../config/appwrite.config';
import { Query } from 'node-appwrite';

export interface MultiCourseCollegeFilters {
    courseType: 'Engineering' | 'Veterinary' | 'Medical' | 'Agriculture';
    location?: string;
    type?: string;
    search?: string;
}

export interface CollegeResult {
    code: string;
    name: string;
    location?: string;
    type?: string;
    district?: string;
    state?: string;
}

async function listAllDocuments(collectionId: string, maxTotal: number = 5000): Promise<any[]> {
    const docs: any[] = [];
    const pageSize = 100; // Appwrite enforces a max page size
    let offset = 0;

    while (docs.length < maxTotal) {
        const result = await databases.listDocuments(
            config.databaseId,
            collectionId,
            [Query.limit(pageSize), Query.offset(offset)]
        );

        docs.push(...result.documents);
        offset += result.documents.length;

        if (result.documents.length < pageSize) break;
    }

    return docs;
}

/**
 * Get colleges based on course type from the single 'colleges_info' collection
 */
async function getColleges(filters: MultiCourseCollegeFilters) {
    try {
        const documents = await listAllDocuments(config.collections.collegesInfo, 5000);
        console.log(`   Fetched ${documents.length} documents from colleges_info`);

        let colleges = documents.map((doc: any) => ({
            code: (doc.collegeCode ?? doc.collegecode ?? doc.college_code ?? doc.code ?? doc.$id ?? '').toString(),
            name: (doc.collegeName ?? doc.collegename ?? doc.college_name ?? doc.name ?? 'Unknown College').toString(),
            location: (doc.city ?? doc.City ?? '').toString() || undefined,
            type: (doc.collegeType ?? doc.Type ?? doc.type ?? '').toString() || undefined,
            district: (doc.district ?? doc.District ?? '').toString() || undefined
        }));

        // Filter by course type if the collection has a matching attribute.
        // If not present (typical for the current CSV-backed schema), we treat the
        // colleges_info collection as a single Engineering dataset and skip this filter.
        if (filters.courseType && documents.length > 0) {
            const hasCourseCategoryAttr = Object.prototype.hasOwnProperty.call(documents[0] || {}, 'courseCategory');
            if (hasCourseCategoryAttr) {
                colleges = colleges.filter((college: any, idx: number) => {
                    const raw = documents[idx] as any;
                    return raw.courseCategory === filters.courseType;
                });
            }
        }

        if (filters.location) {
            const locationLower = filters.location.toLowerCase();
            colleges = colleges.filter((college: CollegeResult) => (college.location || '').toLowerCase() === locationLower);
        }

        if (filters.type) {
            const typeLower = filters.type.toLowerCase();
            colleges = colleges.filter((college: CollegeResult) => (college.type || '').toLowerCase() === typeLower);
        }

        // Apply search filter if provided
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            colleges = colleges.filter((college: CollegeResult) =>
                college.name.toLowerCase().includes(searchLower) ||
                college.code.toLowerCase().includes(searchLower)
            );
        }

        console.log(`   Found ${colleges.length} ${filters.courseType} colleges`);

        return {
            success: true,
            data: colleges,
            total: colleges.length
        };
    } catch (error: any) {
        console.error(`   Error fetching ${filters.courseType} colleges:`, error.message);
        return {
            success: false,
            error: error.message,
            data: []
        };
    }
}


/**
 * Get colleges based on course type
 */
export async function getCollegesByCourseType(filters: MultiCourseCollegeFilters) {
    try {
        console.log(`🏫 Fetching colleges for ${filters.courseType}...`);

        switch (filters.courseType) {
            case 'Engineering':
            case 'Veterinary':
            case 'Agriculture':
            case 'Medical':
                return await getColleges(filters);

            default:
                return {
                    success: false,
                    error: `Unsupported course type: ${filters.courseType}`,
                    data: []
                };
        }
    } catch (error: any) {
        console.error('❌ Get colleges by course type error:', error);
        return {
            success: false,
            error: error.message,
            data: []
        };
    }
}


/**
 * Get unique locations for a course type
 */
export async function getLocationsByCourseType(courseType: string) {
    try {
        const filters: MultiCourseCollegeFilters = {
            courseType: courseType as any
        };

        const result = await getCollegesByCourseType(filters);

        if (!result.success) {
            return result;
        }

        // Extract unique locations
        const locations = [...new Set(
            result.data
                .map((college: CollegeResult) => college.location)
                .filter((loc): loc is string => !!loc)
        )].sort();

        return {
            success: true,
            data: locations,
            total: locations.length
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
            data: []
        };
    }
}

/**
 * Get unique college types for a course type
 */
export async function getTypesByCourseType(courseType: string) {
try {
        const filters: MultiCourseCollegeFilters = {
            courseType: courseType as any
        };

        const result = await getCollegesByCourseType(filters);

        if (!result.success) {
            return result;
        }

        // Extract unique types
        const types = [...new Set(
            result.data
                .map((college: CollegeResult) => college.type)
                .filter((type): type is string => !!type)
        )].sort();

        return {
            success: true,
            data: types,
            total: types.length
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
            data: []
        };
    }
}
