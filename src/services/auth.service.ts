import { ID } from 'node-appwrite';
import { databases, users, config } from '../config/appwrite.config';
import { UserProfileSchema, CounsellingType } from '../schemas/database.schema';

/**
 * Authentication Service
 * Handles user creation and profile management
 */

export interface CreateUserDTO {
    email: string;
    password: string;
    name: string;
    phone?: string;
}

export interface CreateProfileDTO {
    userId: string;
    name: string;
    email: string;
    phone?: string;
    college?: string;
    city?: string;
    state?: string;
    currentYear?: string;
    stream?: string;
    examType?: CounsellingType;
    preferredLanguage?: 'English' | 'Kannada' | 'Hindi' | 'Telugu';
}

/**
 * Create a new user in Appwrite Auth
 */
export async function createUser(data: CreateUserDTO) {
    try {
        const user = await users.create(
            ID.unique(),
            data.email,
            data.phone,
            data.password,
            data.name
        );

        return {
            success: true,
            data: user,
        };
    } catch (error: any) {
        console.error('Create user error:', error);
        return {
            success: false,
            error: error.message || 'Failed to create user',
            code: error.code,
        };
    }
}

/**
 * Create user profile in database
 */
export async function createUserProfile(data: CreateProfileDTO) {
    try {
        const profile: Partial<UserProfileSchema> = {
            userId: data.userId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            college: data.college,
            city: data.city,
            state: data.state,
            currentYear: data.currentYear,
            stream: data.stream,
            examType: data.examType,
            preferredLanguage: data.preferredLanguage || 'English',
            profileCompleted: false,
            registrationCompleted: false,
        };

        const document = await databases.createDocument(
            config.databaseId,
            config.collections.userProfiles,
            ID.unique(),
            profile
        );

        return {
            success: true,
            data: document,
        };
    } catch (error: any) {
        console.error('Create profile error:', error);
        return {
            success: false,
            error: error.message || 'Failed to create profile',
            code: error.code,
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
            config.collections.userProfiles,
            [
                // Query.equal('userId', userId)
            ]
        );

        if (documents.documents.length === 0) {
            return {
                success: false,
                error: 'Profile not found',
            };
        }

        return {
            success: true,
            data: documents.documents[0],
        };
    } catch (error: any) {
        console.error('Get profile error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get profile',
        };
    }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    documentId: string,
    data: Partial<UserProfileSchema>
) {
    try {
        const document = await databases.updateDocument(
            config.databaseId,
            config.collections.userProfiles,
            documentId,
            data
        );

        return {
            success: true,
            data: document,
        };
    } catch (error: any) {
        console.error('Update profile error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update profile',
        };
    }
}

/**
 * Delete user and associated profile
 */
export async function deleteUser(userId: string, profileId: string) {
    try {
        // Delete profile first
        await databases.deleteDocument(
            config.databaseId,
            config.collections.userProfiles,
            profileId
        );

        // Then delete user
        await users.delete(userId);

        return {
            success: true,
            message: 'User and profile deleted successfully',
        };
    } catch (error: any) {
        console.error('Delete user error:', error);
        return {
            success: false,
            error: error.message || 'Failed to delete user',
        };
    }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
    try {
        const userList = await users.list([
            // Query with email filter would go here
        ]);

        const user = userList.users.find(u => u.email === email);

        if (!user) {
            return {
                success: false,
                error: 'User not found',
            };
        }

        return {
            success: true,
            data: user,
        };
    } catch (error: any) {
        console.error('Get user by email error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get user',
        };
    }
}

export default {
    createUser,
    createUserProfile,
    getUserProfile,
    updateUserProfile,
    deleteUser,
    getUserByEmail,
};
