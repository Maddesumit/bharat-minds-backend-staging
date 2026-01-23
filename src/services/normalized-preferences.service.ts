import { ID } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';

/**
 * Service for handling normalized student preferences (student_preferences_v2 collection)
 * This enables the dual-write migration strategy
 */

interface College {
    id: string;        // Appwrite document ID
    code: string;
    name: string;
}

interface Course {
    id: string;        // Appwrite document ID
    code: string;
    name: string;
}

interface SaveNormalizedPreferencesParams {
    userId: string;
    colleges: College[];
    courses: Course[];
    locations?: string[];
    collegeTypes?: string[];
    seatTypes?: string[];
}

/**
 * Save preferences to the normalized student_preferences_v2 collection
 * Each college-course combination becomes a separate document
 */
export async function saveNormalizedPreferences(params: SaveNormalizedPreferencesParams) {
    const {
        userId,
        colleges = [],
        courses = [],
        locations = [],
        collegeTypes = [],
        seatTypes = []
    } = params;

    const createdDocuments: any[] = [];
    const errors: any[] = [];
    let preferenceRank = 1;

    try {
        // Process college preferences
        for (const college of colleges) {
            // For each college, create combinations with selected seat types
            const seatTypesToUse = seatTypes.length > 0 ? seatTypes : ['General'];

            for (const seatType of seatTypesToUse) {
                try {
                    const document = await databases.createDocument(
                        config.databaseId,
                        'student_preferences_v2', // New normalized collection
                        ID.unique(),
                        {
                            userId,
                            preferenceRank: preferenceRank++,

                            // College fields (REQUIRED)
                            collegeId: college.id || '',  // ✅ Now included from frontend
                            collegeCode: college.code || '',
                            collegeName: college.name || '',

                            // Branch fields (REQUIRED, empty for college-only prefs)
                            branchId: '',
                            branchCode: '',
                            branchName: '',

                            // Filter fields (REQUIRED)
                            seatType: seatType,
                            category: 'OPEN',
                            location: locations.length > 0 ? locations[0] : '',

                            // Eligibility & Probability (optional, defaults)
                            isEligible: false,
                            eligibilityScore: 0,
                            probabilityScore: 0,
                            probabilityCategory: '',

                            // Metadata (REQUIRED)
                            counsellingType: 'UGCET',
                            academicYear: new Date().getFullYear(),
                            isLocked: false,

                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    );
                    createdDocuments.push(document);
                } catch (error: any) {
                    console.error(`Error saving college preference: ${college.code}`, error);
                    errors.push({
                        type: 'college',
                        item: college,
                        error: error.message
                    });
                }
            }
        }

        // Process course/branch preferences
        for (const course of courses) {
            const seatTypesToUse = seatTypes.length > 0 ? seatTypes : ['General'];

            for (const seatType of seatTypesToUse) {
                try {
                    const document = await databases.createDocument(
                        config.databaseId,
                        'student_preferences_v2',
                        ID.unique(),
                        {
                            userId,
                            preferenceRank: preferenceRank++,

                            // College fields (REQUIRED, empty for course-only prefs)
                            collegeId: '',
                            collegeCode: '',
                            collegeName: '',

                            // Branch fields (REQUIRED)
                            branchId: course.id || '',  // ✅ Now included from frontend
                            branchCode: course.code || '',
                            branchName: course.name || '',

                            // Filter fields (REQUIRED)
                            seatType: seatType,
                            category: 'OPEN',
                            location: locations.length > 0 ? locations[0] : '',

                            // Eligibility & Probability (optional, defaults)
                            isEligible: false,
                            eligibilityScore: 0,
                            probabilityScore: 0,
                            probabilityCategory: '',

                            // Metadata (REQUIRED)
                            counsellingType: 'UGCET',
                            academicYear: new Date().getFullYear(),
                            isLocked: false,

                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    );
                    createdDocuments.push(document);
                } catch (error: any) {
                    console.error(`Error saving course preference: ${course.code}`, error);
                    errors.push({
                        type: 'course',
                        item: course,
                        error: error.message
                    });
                }
            }
        }

        console.log(`✅ Saved ${createdDocuments.length} normalized preference documents`);

        if (errors.length > 0) {
            console.warn(`⚠️  ${errors.length} preferences failed to save`);
        }

        return {
            success: true,
            count: createdDocuments.length,
            documents: createdDocuments,
            errors: errors.length > 0 ? errors : undefined
        };

    } catch (error: any) {
        console.error('❌ Error in saveNormalizedPreferences:', error);
        throw error;
    }
}

/**
 * Get normalized preferences for a user
 */
export async function getNormalizedPreferences(userId: string) {
    try {
        const { Query } = await import('node-appwrite');

        const response = await databases.listDocuments(
            config.databaseId,
            'student_preferences_v2',
            [
                Query.equal('userId', userId),
                Query.equal('isActive', true),
                Query.orderAsc('preferenceRank'),
                Query.limit(5000)
            ]
        );

        return {
            success: true,
            count: response.total,
            preferences: response.documents
        };

    } catch (error: any) {
        console.error('Error getting normalized preferences:', error);
        throw error;
    }
}

/**
 * Delete all normalized preferences for a user
 * Used when updating preferences
 */
export async function deleteUserNormalizedPreferences(userId: string) {
    try {
        const { Query } = await import('node-appwrite');

        // Get all preferences for this user
        const response = await databases.listDocuments(
            config.databaseId,
            'student_preferences_v2',
            [
                Query.equal('userId', userId),
                Query.limit(5000)
            ]
        );

        // Delete each document
        const deletePromises = response.documents.map(doc =>
            databases.deleteDocument(
                config.databaseId,
                'student_preferences_v2',
                doc.$id
            )
        );

        await Promise.all(deletePromises);

        console.log(`🗑️  Deleted ${response.documents.length} normalized preferences for user ${userId}`);

        return {
            success: true,
            deletedCount: response.documents.length
        };

    } catch (error: any) {
        console.error('Error deleting normalized preferences:', error);
        throw error;
    }
}
