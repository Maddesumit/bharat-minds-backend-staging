/**
 * User Profile Service
 * 
 * Handles user profile creation, updates, and eligibility calculation
 * Uses the category.service for deterministic category generation
 */

import { ID, Models } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';
import { generateEligibleCategories } from './category.service';
import { BaseCategory, ReservationFlags, UserProfile, CategoryVariant } from '../types/domain.types';

/**
 * User Profile document type as stored in Appwrite
 * Note: eligibleCategories and counsellingTypes are stored as JSON strings
 */
interface UserProfileDocument extends Models.Document {
    userId: string;
    name: string;
    email: string;
    phone: string;
    baseCategory: BaseCategory;
    hasKannada: boolean;
    hasRural: boolean;
    hasHK: boolean;
    eligibleCategories: string;  // JSON string in database
    counsellingTypes: string;    // JSON string in database
    profileCompleted: boolean;
    ranksEntered: boolean;
    preferencesEntered: boolean;
}

/**
 * Create user profile DTO
 */
export interface CreateUserProfileDTO {
    userId: string;
    name: string;
    email: string;
    phone: string;
    baseCategory: BaseCategory;
    hasKannada: boolean;
    hasRural: boolean;
    hasHK: boolean;
    counsellingTypes: string[]; // ['UGCET', 'UGNEET'] or ['COMBINED']
}

/**
 * Update user profile DTO
 */
export interface UpdateUserProfileDTO {
    name?: string;
    phone?: string;
    baseCategory?: BaseCategory;
    hasKannada?: boolean;
    hasRural?: boolean;
    hasHK?: boolean;
    counsellingTypes?: string[];
}

/**
 * Create a new user profile with automatic eligibility calculation
 */
export async function createUserProfile(data: CreateUserProfileDTO) {
    try {
        // Generate eligible categories using the deterministic algorithm
        const reservationFlags: ReservationFlags = {
            hasKannada: data.hasKannada,
            hasRural: data.hasRural,
            hasHK: data.hasHK,
        };

        const eligibleCategories = generateEligibleCategories(
            data.baseCategory,
            reservationFlags
        );

        // Create profile document
        const profileData = {
            userId: data.userId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            baseCategory: data.baseCategory,
            hasKannada: data.hasKannada,
            hasRural: data.hasRural,
            hasHK: data.hasHK,
            eligibleCategories: JSON.stringify(eligibleCategories),
            counsellingTypes: JSON.stringify(data.counsellingTypes),
            profileCompleted: true,
            ranksEntered: false,
            preferencesEntered: false,
        };

        const document = await databases.createDocument(
            config.databaseId,
            config.collections.userProfiles,
            ID.unique(),
            profileData
        );

        return {
            success: true,
            data: {
                ...document,
                eligibleCategories: eligibleCategories, // Return parsed array
                counsellingTypes: data.counsellingTypes,
            },
        };
    } catch (error: any) {
        console.error('Create user profile error:', error);
        return {
            success: false,
            error: error.message || 'Failed to create user profile',
        };
    }
}

/**
 * Get user profile by userId
 */
export async function getUserProfile(userId: string) {
    try {
        const documents = await databases.listDocuments(
            config.databaseId,
            config.collections.userProfiles
        );

        const profile = documents.documents.find(
            (doc: any) => doc.userId === userId
        ) as UserProfileDocument | undefined;

        if (!profile) {
            return {
                success: false,
                error: 'Profile not found',
            };
        }

        // Parse JSON fields
        return {
            success: true,
            data: {
                ...profile,
                eligibleCategories: JSON.parse(profile.eligibleCategories),
                counsellingTypes: JSON.parse(profile.counsellingTypes),
            },
        };
    } catch (error: any) {
        console.error('Get user profile error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get user profile',
        };
    }
}

/**
 * Update user profile
 * If baseCategory or reservation flags change, recalculate eligible categories
 */
export async function updateUserProfile(userId: string, updates: UpdateUserProfileDTO) {
    try {
        // Get existing profile
        const existingProfile = await getUserProfile(userId);

        if (!existingProfile.success || !existingProfile.data) {
            return {
                success: false,
                error: existingProfile.error || 'Profile not found',
            };
        }

        const profileId = existingProfile.data.$id;

        // Check if we need to recalculate eligible categories
        const needsRecalculation =
            updates.baseCategory !== undefined ||
            updates.hasKannada !== undefined ||
            updates.hasRural !== undefined ||
            updates.hasHK !== undefined;

        let updateData: any = { ...updates };

        if (needsRecalculation) {
            const baseCategory = updates.baseCategory || existingProfile.data.baseCategory;
            const flags: ReservationFlags = {
                hasKannada: updates.hasKannada ?? existingProfile.data.hasKannada,
                hasRural: updates.hasRural ?? existingProfile.data.hasRural,
                hasHK: updates.hasHK ?? existingProfile.data.hasHK,
            };

            const eligibleCategories = generateEligibleCategories(baseCategory, flags);
            updateData.eligibleCategories = JSON.stringify(eligibleCategories);
        }

        if (updates.counsellingTypes) {
            updateData.counsellingTypes = JSON.stringify(updates.counsellingTypes);
        }

        const document = await databases.updateDocument(
            config.databaseId,
            config.collections.userProfiles,
            profileId,
            updateData
        ) as UserProfileDocument;

        return {
            success: true,
            data: {
                ...document,
                eligibleCategories: JSON.parse(document.eligibleCategories || '[]'),
                counsellingTypes: JSON.parse(document.counsellingTypes || '[]'),
            },
        };
    } catch (error: any) {
        console.error('Update user profile error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update user profile',
        };
    }
}

/**
 * Update profile completion flags
 */
export async function updateProfileFlags(
    userId: string,
    flags: {
        ranksEntered?: boolean;
        preferencesEntered?: boolean;
    }
) {
    try {
        const existingProfile = await getUserProfile(userId);

        if (!existingProfile.success || !existingProfile.data) {
            return {
                success: false,
                error: existingProfile.error || 'Profile not found',
            };
        }

        const profileId = existingProfile.data.$id;

        const document = await databases.updateDocument(
            config.databaseId,
            config.collections.userProfiles,
            profileId,
            flags
        );

        return {
            success: true,
            data: document,
        };
    } catch (error: any) {
        console.error('Update profile flags error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update profile flags',
        };
    }
}

/**
 * Validate base category
 */
export function validateBaseCategory(category: string): boolean {
    return Object.values(BaseCategory).includes(category as BaseCategory);
}

/**
 * Get eligible categories for a user (without database call)
 */
export function calculateEligibleCategories(
    baseCategory: BaseCategory,
    flags: ReservationFlags
): CategoryVariant[] {
    return generateEligibleCategories(baseCategory, flags);
}

export default {
    createUserProfile,
    getUserProfile,
    updateUserProfile,
    updateProfileFlags,
    validateBaseCategory,
    calculateEligibleCategories,
};
