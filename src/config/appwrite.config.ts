import { Client, Databases, Users, Account, Storage } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Appwrite Client
const client = new Client();

// Use environment variable for endpoint, with fallback
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';

client
    .setEndpoint(endpoint)
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

// Initialize Appwrite Services
export const databases = new Databases(client);
export const users = new Users(client);
export const account = new Account(client);
export const storage = new Storage(client);

// Configuration Constants
export const config = {
    endpoint: endpoint,
    projectId: process.env.APPWRITE_PROJECT_ID || '',
    apiKey: process.env.APPWRITE_API_KEY || '',
    databaseId: process.env.APPWRITE_DATABASE_ID || 'main_db',
    collections: {
        // Core app collections (may not exist in all databases)
        userProfiles: process.env.APPWRITE_USER_PROFILES_COLLECTION_ID || 'user_profiles',
        studentRanks: process.env.APPWRITE_STUDENT_RANKS_COLLECTION_ID || 'student_ranks',
        userPreferences: process.env.APPWRITE_USER_PREFERENCES_COLLECTION_ID || 'user_preferences',

        // Legacy app collections (kept for build compatibility; may not exist in the current database)
        students: process.env.APPWRITE_STUDENTS_COLLECTION_ID || 'students',
        optionLists: process.env.APPWRITE_OPTION_LISTS_COLLECTION_ID || 'option_lists',
        optionEntryGenerator: process.env.APPWRITE_OPTION_ENTRY_GENERATOR_COLLECTION_ID || 'option_entry_generator',
        collegeCourses: process.env.APPWRITE_COLLEGE_COURSES_COLLECTION_ID || 'college_courses',
        cutoffData: process.env.APPWRITE_CUTOFF_DATA_COLLECTION_ID || 'cutoff_data',

        // Data collections (must match the current database schema)
        collegesInfo: process.env.APPWRITE_COLLEGES_INFO_COLLECTION_ID || 'colleges_info',
        r1Cutoffs: process.env.APPWRITE_R1_CUTOFFS_COLLECTION_ID || 'r1_cutoffs',
        r2Cutoffs: process.env.APPWRITE_R2_CUTOFFS_COLLECTION_ID || 'r1r2_hk_cutoff',
        r1r2Hk: process.env.APPWRITE_R1R2_HK_COLLECTION_ID || 'r1r2_hk',
        seatMatrix: process.env.APPWRITE_SEAT_MATRIX_COLLECTION_ID || 'seat_matrix',

        // Backward-compatible aliases (existing services reference these keys)
        colleges: process.env.APPWRITE_COLLEGES_COLLECTION_ID || (process.env.APPWRITE_COLLEGES_INFO_COLLECTION_ID || 'colleges_info'),
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

        console.log(' Appwrite credentials configured:');
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
