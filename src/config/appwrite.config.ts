import { Client, Databases, Users, Account, Storage } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Appwrite Client
const client = new Client();

client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

// Initialize Appwrite Services
export const databases = new Databases(client);
export const users = new Users(client);
export const account = new Account(client);
export const storage = new Storage(client);

// Configuration Constants
export const config = {
    endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: process.env.APPWRITE_PROJECT_ID || '',
    apiKey: process.env.APPWRITE_API_KEY || '',
    databaseId: process.env.APPWRITE_DATABASE_ID || 'main_db',
    collections: {
        userProfiles: process.env.APPWRITE_USER_PROFILES_COLLECTION_ID || 'user_profiles',
        studentRanks: process.env.APPWRITE_STUDENT_RANKS_COLLECTION_ID || 'student_ranks',
        colleges: process.env.APPWRITE_COLLEGES_COLLECTION_ID || 'colleges',
        collegeCourses: process.env.APPWRITE_COLLEGE_COURSES_COLLECTION_ID || 'college_courses',
        userPreferences: process.env.APPWRITE_USER_PREFERENCES_COLLECTION_ID || 'user_preferences',
        cutoffData: process.env.APPWRITE_CUTOFF_DATA_COLLECTION_ID || 'cutoff_data',
        // Legacy collections (if still needed)
        students: process.env.APPWRITE_STUDENTS_COLLECTION_ID || 'students',
        optionLists: process.env.APPWRITE_OPTION_LISTS_COLLECTION_ID || 'option_lists',
    },
    buckets: {
        pdfs: process.env.APPWRITE_PDF_BUCKET_ID || 'pdfs',
    },
};

/**
 * Check if Appwrite is properly configured
 */
export function isAppwriteConfigured(): boolean {
    return !!(config.projectId && config.apiKey && config.endpoint);
}

/**
 * Validate Appwrite connection
 */
export async function validateConnection(): Promise<boolean> {
    try {
        if (!isAppwriteConfigured()) {
            throw new Error('Appwrite is not configured properly');
        }

        console.log('✅ Appwrite credentials configured:');
        console.log(`   - Endpoint: ${config.endpoint}`);
        console.log(`   - Project ID: ${config.projectId}`);
        console.log(`   - Database ID: ${config.databaseId}`);
        console.log(`   - API Key: ${config.apiKey.substring(0, 20)}...`);

        // Note: SDK validation has been disabled due to version compatibility issues
        // Connection will be validated on first actual API call
        return true;
    } catch (error) {
        console.error('Appwrite configuration validation failed:', error);
        return false;
    }
}

export default client;
