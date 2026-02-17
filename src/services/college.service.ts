/**
 * College Service
 * 
 * Handles college search, filtering, and retrieval
 * Optimized for fast lookups using Appwrite indexes
 */

import { ID, Models, Query } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';
import { College, CollegeType, CounsellingType, CollegeSearchFilters } from '../types/domain.types';

/**
 * College document type as stored in Appwrite
 * Note: counsellingTypes is stored as JSON string in Appwrite
 */
interface CollegeDocument extends Models.Document {
    collegeCode: string;
    collegeName: string;
    city: string;
    district: string;
    collegeType: CollegeType;
    counsellingTypes: string;  // JSON string in database
    address?: string;
    website?: string;
    established?: number;
    accreditation?: string;
}

/**
 * Create college DTO (Admin only)
 */
export interface CreateCollegeDTO {
    collegeCode: string;
    collegeName: string;
    city: string;
    district: string;
    collegeType: CollegeType;
    counsellingTypes: CounsellingType[];
    address?: string;
    website?: string;
    established?: number;
    accreditation?: string;
}

/**
 * Search colleges with filters
 */
export async function searchColleges(filters: CollegeSearchFilters) {
    try {

        const documents = await databases.listDocuments(
            config.databaseId,
            config.collections.colleges,
            [Query.limit(5000)] // Get all colleges (max 5000)
        );

        let results = documents.documents as unknown as CollegeDocument[];

        // Apply filters
        if (filters.collegeCode) {
            results = results.filter((doc) =>
                doc.collegeCode.toLowerCase() === filters.collegeCode?.toLowerCase()
            );
        }

        if (filters.collegeName) {
            results = results.filter((doc) =>
                doc.collegeName.toLowerCase().includes(filters.collegeName?.toLowerCase() || '')
            );
        }

        if (filters.city) {
            results = results.filter((doc) =>
                doc.city.toLowerCase() === filters.city?.toLowerCase()
            );
        }

        if (filters.collegeType) {
            results = results.filter((doc) =>
                doc.collegeType === filters.collegeType
            );
        }

        if (filters.counsellingType) {
            results = results.filter((doc) => {
                const types = JSON.parse(doc.counsellingTypes || '[]');
                return types.includes(filters.counsellingType);
            });
        }

        // Parse counsellingTypes field (handle both string and JSON array)
        const parsed = results.map((doc) => {
            let counsellingTypes = [];
            try {
                // Try to parse as JSON array first
                counsellingTypes = JSON.parse(doc.counsellingTypes || '[]');
            } catch {
                // If it fails, treat as comma-separated string or single value
                const typesStr = doc.counsellingTypes || '';
                counsellingTypes = typesStr.includes(',')
                    ? typesStr.split(',').map(t => t.trim())
                    : typesStr ? [typesStr.trim()] : [];
            }

            return {
                ...doc,
                counsellingTypes
            };
        });

        return {
            success: true,
            data: parsed,
            total: parsed.length,
        };
    } catch (error: any) {
        console.error('Search colleges error:', error);
        return {
            success: false,
            error: error.message || 'Failed to search colleges',
        };
    }
}

/**
 * Get college by code (exact match)
 */
export async function getCollegeByCode(collegeCode: string) {
    try {
        const result = await searchColleges({ collegeCode });

        if (!result.success || !result.data) {
            return {
                success: false,
                error: result.success ? 'College not found' : (result.error || 'College not found'),
            };
        }

        if (result.data.length === 0) {
            return {
                success: false,
                error: 'College not found',
            };
        }

        return {
            success: true,
            data: result.data[0],
        };
    } catch (error: any) {
        console.error('Get college by code error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get college',
        };
    }
}

/**
 * Get college by ID
 */
export async function getCollege(collegeId: string) {
    try {
        const document = await databases.getDocument(
            config.databaseId,
            config.collections.colleges,
            collegeId
        ) as unknown as CollegeDocument;

        return {
            success: true,
            data: {
                ...document,
                counsellingTypes: JSON.parse(document.counsellingTypes || '[]'),
            },
        };
    } catch (error: any) {
        console.error('Get college error:', error);
        return {
            success: false,
            error: error.message || 'College not found',
        };
    }
}

/**
 * List all cities (for dropdown)
 */
export async function listCities() {
    try {
        const documents = await databases.listDocuments(
            config.databaseId,
            config.collections.colleges
        );

        const cities = [...new Set((documents.documents as unknown as CollegeDocument[]).map((doc) => doc.city))];
        cities.sort();

        return {
            success: true,
            data: cities,
            count: cities.length,
        };
    } catch (error: any) {
        console.error('List cities error:', error);
        return {
            success: false,
            error: error.message || 'Failed to list cities',
        };
    }
}

/**
 * List all districts
 */
export async function listDistricts() {
    try {
        const documents = await databases.listDocuments(
            config.databaseId,
            config.collections.colleges
        );

        const districts = [...new Set((documents.documents as unknown as CollegeDocument[]).map((doc) => doc.district))];
        districts.sort();

        return {
            success: true,
            data: districts,
            count: districts.length,
        };
    } catch (error: any) {
        console.error('List districts error:', error);
        return {
            success: false,
            error: error.message || 'Failed to list districts',
        };
    }
}

/**
 * Get colleges by type
 */
export async function getCollegesByType(collegeType: CollegeType) {
    try {
        return await searchColleges({ collegeType });
    } catch (error: any) {
        console.error('Get colleges by type error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get colleges',
        };
    }
}

/**
 * Get colleges by city
 */
export async function getCollegesByCity(city: string) {
    try {
        return await searchColleges({ city });
    } catch (error: any) {
        console.error('Get colleges by city error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get colleges',
        };
    }
}

/**
 * Create college (Admin only)
 */
export async function createCollege(data: CreateCollegeDTO) {
    try {
        // Check if college code already exists
        const existing = await getCollegeByCode(data.collegeCode);
        if (existing.success) {
            return {
                success: false,
                error: 'College code already exists',
            };
        }

        const collegeData = {
            collegeCode: data.collegeCode,
            collegeName: data.collegeName,
            city: data.city,
            district: data.district,
            collegeType: data.collegeType,
            counsellingTypes: JSON.stringify(data.counsellingTypes),
            address: data.address || '',
            website: data.website || '',
            established: data.established || null,
            accreditation: data.accreditation || '',
        };

        const document = await databases.createDocument(
            config.databaseId,
            config.collections.colleges,
            ID.unique(),
            collegeData
        );

        return {
            success: true,
            data: {
                ...document,
                counsellingTypes: data.counsellingTypes,
            },
            message: 'College created successfully',
        };
    } catch (error: any) {
        console.error('Create college error:', error);
        return {
            success: false,
            error: error.message || 'Failed to create college',
        };
    }
}

/**
 * Get all college types (for dropdown)
 */
export function getAllCollegeTypes() {
    return {
        success: true,
        data: Object.values(CollegeType),
    };
}

export default {
    searchColleges,
    getCollegeByCode,
    getCollege,
    listCities,
    listDistricts,
    getCollegesByType,
    getCollegesByCity,
    createCollege,
    getAllCollegeTypes,
};
