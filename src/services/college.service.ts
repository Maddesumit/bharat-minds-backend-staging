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
    latitude?: number;
    longitude?: number;
    averageFees?: number;
    placementRate?: number;
    rating?: number;
}

function normalizeCollegeDocument(doc: any): CollegeDocument {
    const counsellingTypesRaw = doc.counsellingTypes ?? doc.counselling_types ?? '[]';

    return {
        ...doc,
        collegeCode: (doc.collegeCode ?? doc.collegecode ?? doc.college_code ?? doc.code ?? doc.$id ?? '').toString(),
        collegeName: (doc.collegeName ?? doc.collegename ?? doc.college_name ?? doc.name ?? '').toString(),
        city: (doc.city ?? doc.City ?? '').toString(),
        district: (doc.district ?? doc.District ?? '').toString(),
        collegeType: (doc.collegeType ?? doc.Type ?? doc.type ?? '') as CollegeType,
        counsellingTypes: typeof counsellingTypesRaw === 'string' ? counsellingTypesRaw : JSON.stringify(counsellingTypesRaw),
        address: (doc.address ?? doc.Address ?? '').toString() || undefined,
        website: (doc.website ?? doc.Website ?? '').toString() || undefined,
        established: doc.established ?? doc.Established,
        accreditation: (doc.accreditation ?? doc.Accredation ?? doc.Accreditation ?? '').toString() || undefined,
        latitude: doc.latitude !== undefined ? Number(doc.latitude) : undefined,
        longitude: doc.longitude !== undefined ? Number(doc.longitude) : undefined,
        averageFees: doc.averageFees !== undefined ? Number(doc.averageFees) : undefined,
        placementRate: doc.placementRate !== undefined ? Number(doc.placementRate) : undefined,
        rating: doc.rating !== undefined ? Number(doc.rating) : undefined,
        createdAt: doc.$createdAt || doc.createdAt || '',
        updatedAt: doc.$updatedAt || doc.updatedAt || '',
    } as CollegeDocument;
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
export async function searchColleges(filters: CollegeSearchFilters): Promise<{ success: boolean; data?: any[]; total?: number; error?: string }> {
    try {
        const documents = await listAllDocuments(config.collections.collegesInfo, 5000);
        let results = documents.map(normalizeCollegeDocument);

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
                try {
                    const types = JSON.parse(doc.counsellingTypes || '[]');
                    return Array.isArray(types) && types.includes(filters.counsellingType);
                } catch {
                    return false;
                }
            });
        }

        // Parse counsellingTypes field (handle both string and JSON array)
        const parsed: (College & { counsellingTypes: string[] })[] = results.map((doc) => {
            let counsellingTypes: string[] = [];
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
            } as unknown as (College & { counsellingTypes: string[] });
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
            config.collections.collegesInfo,
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
        const documents = await listAllDocuments(config.collections.collegesInfo, 5000);
        const cities = [...new Set(documents.map(normalizeCollegeDocument).map((doc) => doc.city).filter(Boolean))];
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
        const documents = await listAllDocuments(config.collections.collegesInfo, 5000);
        const districts = [...new Set(documents.map(normalizeCollegeDocument).map((doc) => doc.district).filter(Boolean))];
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

        // colleges_info schema uses legacy attribute names (collegecode, collegename, City, Type, ...).
        // Keep writes compatible with that schema.
        const collegeData: any = {
            collegecode: data.collegeCode,
            collegename: data.collegeName,
            City: data.city,
            District: data.district,
            Type: data.collegeType,
            Address: data.address || null,
            Website: data.website || null,
            Established: data.established || null,
            Accredation: data.accreditation || null,
            // Optional: store counselling types if the collection has it (will be ignored/failed if missing)
            counsellingTypes: JSON.stringify(data.counsellingTypes),
        };

        const document = await databases.createDocument(
            config.databaseId,
            config.collections.collegesInfo,
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

/**
 * Get similar colleges based on city or type
 */
export async function getSimilarColleges(collegeCode: string, limit: number = 5) {
    try {
        const target = await getCollegeByCode(collegeCode);
        if (!target.success || !target.data) return { success: false, error: 'Target college not found' };

        const { city, collegeType } = target.data;

        // Fetch all colleges to perform similarity check (since we avoid complex Appwrite OR queries)
        const allCollegesResult = await searchColleges({});
        if (!allCollegesResult.success || !allCollegesResult.data) return allCollegesResult;

        const similar = allCollegesResult.data
            .filter(c => c.collegeCode !== collegeCode) // Exclude target
            .filter(c => c.city === city || c.collegeType === collegeType)
            .slice(0, limit);

        return {
            success: true,
            data: similar,
            count: similar.length
        };
    } catch (error: any) {
        console.error('Get similar colleges error:', error);
        return { success: false, error: error.message };
    }
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
    getSimilarColleges
};
