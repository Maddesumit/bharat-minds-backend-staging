/**
 * Multi-Course College Service
 * 
 * Handles college retrieval for different course types:
 * - Engineering: colleges collection
 * - Veterinary/Agriculture: farming_vet_colleges collection
 * - Medical: Extract from Farm_Agri/Farm_AgriV2 collections
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

/**
 * Get colleges based on course type
 */
export async function getCollegesByCourseType(filters: MultiCourseCollegeFilters) {
    try {
        console.log(`🏫 Fetching colleges for ${filters.courseType}...`);

        switch (filters.courseType) {
            case 'Engineering':
                return await getEngineeringColleges(filters);

            case 'Veterinary':
            case 'Agriculture':
                return await getFarmingVetColleges(filters);

            case 'Medical':
                return await getMedicalColleges(filters);

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
 * Get Engineering colleges from 'colleges' collection
 */
async function getEngineeringColleges(filters: MultiCourseCollegeFilters) {
    try {
        const queries: string[] = [Query.limit(500)];

        // Add filters if provided
        if (filters.location) {
            queries.push(Query.equal('city', filters.location));
        }
        if (filters.type) {
            queries.push(Query.equal('collegeType', filters.type));
        }

        const result = await databases.listDocuments(
            config.databaseId,
            config.collections.colleges,
            queries
        );

        let colleges = result.documents.map((doc: any) => ({
            code: doc.collegeCode || doc.$id,
            name: doc.collegeName || 'Unknown College',
            location: doc.city,
            type: doc.collegeType,
            district: doc.district
        }));

        // Apply search filter if provided
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            colleges = colleges.filter((college: CollegeResult) =>
                college.name.toLowerCase().includes(searchLower) ||
                college.code.toLowerCase().includes(searchLower)
            );
        }

        console.log(`   Found ${colleges.length} Engineering colleges`);

        return {
            success: true,
            data: colleges,
            total: colleges.length
        };
    } catch (error: any) {
        console.error('   Error fetching Engineering colleges:', error.message);
        return {
            success: false,
            error: error.message,
            data: []
        };
    }
}

/**
 * Get Farming/Veterinary colleges from 'farming_vet_colleges' collection
 */
async function getFarmingVetColleges(filters: MultiCourseCollegeFilters) {
    try {
        const queries: string[] = [Query.limit(500)];

        // Add filters if provided
        if (filters.location) {
            queries.push(Query.equal('location', filters.location));
        }
        if (filters.type) {
            queries.push(Query.equal('type', filters.type));
        }

        const result = await databases.listDocuments(
            config.databaseId,
            'farming_vet_colleges',
            queries
        );

        let colleges = result.documents.map((doc: any) => ({
            code: doc.college_id || doc.$id,
            name: doc.college_name || 'Unknown College',
            location: doc.location,
            type: doc.type,
            district: doc.district,
            state: doc.state
        }));

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
 * Get Medical colleges from 'Farm_Agri' or 'Farm_AgriV2' collections
 * Extract unique colleges from the wide-format data
 */
async function getMedicalColleges(filters: MultiCourseCollegeFilters) {
    try {
        const collectionsToTry = ['Farm_Agri', 'Farm_AgriV2'];

        for (const collectionName of collectionsToTry) {
            try {
                console.log(`   Trying ${collectionName}...`);

                const result = await databases.listDocuments(
                    config.databaseId,
                    collectionName,
                    [Query.limit(500)]
                );

                // Extract unique colleges
                const collegeMap = new Map<string, CollegeResult>();

                result.documents.forEach((doc: any) => {
                    const code = doc.college_id || doc.collegeCode || doc.$id;
                    const name = doc.college || doc.collegeName || 'Unknown College';

                    if (!collegeMap.has(code)) {
                        collegeMap.set(code, {
                            code,
                            name,
                            location: doc.location || doc.city,
                            type: 'Medical'
                        });
                    }
                });

                let colleges = Array.from(collegeMap.values());

                // Apply search filter if provided
                if (filters.search) {
                    const searchLower = filters.search.toLowerCase();
                    colleges = colleges.filter((college: CollegeResult) =>
                        college.name.toLowerCase().includes(searchLower) ||
                        college.code.toLowerCase().includes(searchLower)
                    );
                }

                // Apply location filter if provided
                if (filters.location) {
                    colleges = colleges.filter((college: CollegeResult) =>
                        college.location?.toLowerCase() === filters.location?.toLowerCase()
                    );
                }

                console.log(`   Found ${colleges.length} Medical colleges from ${collectionName}`);

                return {
                    success: true,
                    data: colleges,
                    total: colleges.length
                };

            } catch (error: any) {
                console.error(`   Failed to fetch from ${collectionName}:`, error.message);

                // If this is the last collection to try, return error
                if (collectionName === collectionsToTry[collectionsToTry.length - 1]) {
                    return {
                        success: false,
                        error: `Failed to fetch Medical colleges from all collections`,
                        data: []
                    };
                }
            }
        }

        // Fallback (should not reach here)
        return {
            success: false,
            error: 'No Medical college data found',
            data: []
        };

    } catch (error: any) {
        console.error('   Error fetching Medical colleges:', error.message);
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
