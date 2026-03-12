/**
 * BHARAT MINDS - Complete Appwrite Database Schema
 * 
 * This file defines ALL collections needed for the Option Entry Generator platform.
 * Use this as a reference when creating collections in Appwrite Console.
 * 
 * COLLECTIONS:
 * 1. user_profiles - User identity and eligibility
 * 2. student_ranks - Course-wise ranks for each user
 * 3. colleges - College master data
 * 4. college_courses - Courses offered by colleges
 * 5. college_fees - Detailed fee structure
 * 6. user_preferences - User's option entry preferences
 * 7. cutoff_data - DELETED
 * 
 * INDEXING STRATEGY:
 * - Primary keys: Always indexed
 * - Foreign keys: Always indexed for joins
 * - Search fields: Indexed for fast retrieval
 * - Filter fields: Indexed for queries
 */

// ============================================================================
// COLLECTION 1: user_profiles
// ============================================================================

/**
 * User Profiles Collection
 * 
 * Collection ID: user_profiles
 * Collection Name: "User Profiles"
 */
export const UserProfilesSchema = {
    collectionId: 'user_profiles',
    collectionName: 'User Profiles',

    attributes: [
        // Primary Key
        { key: 'userId', type: 'string', size: 36, required: true, array: false },

        // Personal Information
        { key: 'name', type: 'string', size: 255, required: true },
        { key: 'email', type: 'email', size: 320, required: true },
        { key: 'phone', type: 'string', size: 15, required: true },

        // Eligibility Information
        { key: 'baseCategory', type: 'string', size: 10, required: true },
        { key: 'hasKannada', type: 'boolean', required: false, default: false },
        { key: 'hasRural', type: 'boolean', required: false, default: false },
        { key: 'hasHK', type: 'boolean', required: false, default: false },

        // Generated eligible categories (stored as JSON array)
        { key: 'eligibleCategories', type: 'string', size: 500, required: true },

        // Counselling configuration
        { key: 'counsellingTypes', type: 'string', size: 100, required: true }, // JSON array

        // Profile status flags
        { key: 'profileCompleted', type: 'boolean', required: false, default: false },
        { key: 'ranksEntered', type: 'boolean', required: false, default: false },
        { key: 'preferencesEntered', type: 'boolean', required: false, default: false },
    ],

    indexes: [
        { key: 'idx_userId', type: 'unique', attributes: ['userId'] },
        { key: 'idx_email', type: 'key', attributes: ['email'] },
        { key: 'idx_phone', type: 'key', attributes: ['phone'] },
        { key: 'idx_baseCategory', type: 'key', attributes: ['baseCategory'] },
        { key: 'idx_counsellingTypes', type: 'fulltext', attributes: ['counsellingTypes'] },
    ],

    permissions: {
        create: ['users'],
        read: ['users'],
        update: ['users'],
        delete: ['users'],
    }
};

// ============================================================================
// COLLECTION 2: student_ranks
// ============================================================================

/**
 * Student Ranks Collection
 * 
 * Collection ID: student_ranks
 * Purpose: Store course-wise ranks for each student
 * Key: (userId, counsellingType, courseType) - Composite key
 */
export const StudentRanksSchema = {
    collectionId: 'student_ranks',
    collectionName: 'Student_OptionEntry_Farm_Agri',

    attributes: [
        // Composite Key
        { key: 'userId', type: 'string', size: 36, required: true },
        { key: 'counsellingType', type: 'string', size: 20, required: true }, // UGCET, UGNEET, COMBINED
        { key: 'courseType', type: 'string', size: 100, required: true }, // Course name

        // Rank Information
        { key: 'theoryRank', type: 'integer', required: false }, // For most courses
        { key: 'practicalScore', type: 'integer', required: false }, // For Farm Science, BVSc & AH
        { key: 'neetAIR', type: 'integer', required: false }, // For UGNEET only

        // Additional metadata
        { key: 'rankType', type: 'string', size: 50, required: false }, // 'theory', 'practical', 'combined'
    ],

    indexes: [
        { key: 'idx_userId', type: 'key', attributes: ['userId'] },
        { key: 'idx_composite', type: 'unique', attributes: ['userId', 'counsellingType', 'courseType'] },
        { key: 'idx_counsellingType', type: 'key', attributes: ['counsellingType'] },
        { key: 'idx_courseType', type: 'key', attributes: ['courseType'] },
    ],

    permissions: {
        create: ['users'],
        read: ['users'],
        update: ['users'],
        delete: ['users'],
    }
};

// ============================================================================
// COLLECTION 3: colleges
// ============================================================================

/**
 * Colleges Collection
 * 
 * Collection ID: colleges
 * Purpose: Master data for all colleges in Karnataka
 */
export const CollegesSchema = {
    collectionId: 'colleges',
    collectionName: 'Engineering Colleges',

    attributes: [
        // Primary identification
        { key: 'collegeId', type: 'string', size: 36, required: true },
        { key: 'collegeCode', type: 'string', size: 20, required: true },
        { key: 'collegeName', type: 'string', size: 500, required: true },

        // Location
        { key: 'city', type: 'string', size: 100, required: true },
        { key: 'district', type: 'string', size: 100, required: true },

        // Classification
        { key: 'collegeType', type: 'string', size: 50, required: true },

        // Additional info
        { key: 'address', type: 'string', size: 1000, required: false },
        { key: 'website', type: 'string', size: 255, required: false },
        { key: 'established', type: 'integer', required: false },
        { key: 'accreditation', type: 'string', size: 50, required: false, array: true },

        // Comparison Attributes
        { key: 'latitude', type: 'float', required: false },
        { key: 'longitude', type: 'float', required: false },
        { key: 'averageFees', type: 'integer', required: false },
        { key: 'placementRate', type: 'integer', required: false },
        { key: 'rating', type: 'integer', required: false },
    ],

    indexes: [
        { key: 'idx_collegeCode', type: 'unique', attributes: ['collegeCode'] },
        { key: 'idx_collegeName', type: 'fulltext', attributes: ['collegeName'] },
        { key: 'idx_city', type: 'key', attributes: ['city'] },
        { key: 'idx_collegeType', type: 'key', attributes: ['collegeType'] },
        { key: 'idx_latitude', type: 'key', attributes: ['latitude'] },
        { key: 'idx_longitude', type: 'key', attributes: ['longitude'] },
        { key: 'idx_averageFees', type: 'key', attributes: ['averageFees'] },
        { key: 'idx_placementRate', type: 'key', attributes: ['placementRate'] },
        { key: 'idx_rating', type: 'key', attributes: ['rating'] },
    ],

    permissions: {
        create: ['admins'],
        read: ['any'],
        update: ['admins'],
        delete: ['admins'],
    }
};

// ============================================================================
// COLLECTION 4: college_courses
// ============================================================================

/**
 * College Courses Collection
 * 
 * Collection ID: college_courses
 * Purpose: Courses offered by each college with seat type availability
 */
export const CollegeCoursesSchema = {
    collectionId: 'college_courses',
    collectionName: 'Engineering College Courses',

    attributes: [
        // Primary Identification
        { key: 'courseId', type: 'string', size: 36, required: true },
        { key: 'collegeId', type: 'string', size: 36, required: true },

        // Course Info
        { key: 'courseType', type: 'string', size: 100, required: true },
        { key: 'branchCode', type: 'string', size: 20, required: true },
        { key: 'branchName', type: 'string', size: 200, required: true },

        // Metadata
        { key: 'intake', type: 'integer', required: false },
    ],

    indexes: [
        { key: 'idx_collegeId', type: 'key', attributes: ['collegeId'] },
        { key: 'idx_courseId', type: 'unique', attributes: ['courseId'] },
        { key: 'idx_courseType', type: 'key', attributes: ['courseType'] },
        { key: 'idx_branchCode', type: 'key', attributes: ['branchCode'] },
        { key: 'idx_composite', type: 'key', attributes: ['collegeId', 'courseType', 'branchCode'] },
    ],

    permissions: {
        create: ['admins'],
        read: ['any'],
        update: ['admins'],
        delete: ['admins'],
    }
};

// ============================================================================
// COLLECTION 5: college_fees
// ============================================================================

/**
 * College Fees Collection
 * 
 * Collection ID: college_fees
 * Purpose: Detailed fee structure for colleges and courses
 */
export const CollegeFeesSchema = {
    collectionId: 'college_fees',
    collectionName: 'College Fees',

    attributes: [
        { key: 'collegeCode', type: 'string', size: 20, required: true },
        { key: 'courseCode', type: 'string', size: 20, required: true },
        { key: 'category', type: 'string', size: 50, required: true },
        { key: 'academicYear', type: 'integer', required: true },
        { key: 'tuitionFees', type: 'integer', required: true },
        { key: 'hostelFees', type: 'integer', required: false },
        { key: 'messFees', type: 'integer', required: false },
        { key: 'otherFees', type: 'integer', required: false },
        { key: 'totalFees', type: 'integer', required: true },
        { key: 'feeType', type: 'string', size: 50, required: true },
        { key: 'isRefundable', type: 'boolean', required: false },
        { key: 'lastUpdated', type: 'datetime', required: true },
    ],

    indexes: [
        { key: 'idx_primary_lookup', type: 'key', attributes: ['collegeCode', 'courseCode', 'category', 'academicYear'] },
        { key: 'idx_collegeCode', type: 'key', attributes: ['collegeCode'] },
        { key: 'idx_courseCode', type: 'key', attributes: ['courseCode'] },
        { key: 'idx_category', type: 'key', attributes: ['category'] },
    ],

    permissions: {
        create: ['admins'],
        read: ['any'],
        update: ['admins'],
        delete: ['admins'],
    }
};

// ============================================================================
// COLLECTION 6: user_preferences
// ============================================================================

/**
 * User Preferences Collection
 * 
 * Collection ID: user_preferences
 * Purpose: User's option entry preferences (ordered list)
 */
export const UserPreferencesSchema = {
    collectionId: 'user_preferences',
    collectionName: 'User Preferences',

    attributes: [
        // Primary Key
        { key: 'userId', type: 'string', size: 36, required: true },
        { key: 'counsellingType', type: 'string', size: 20, required: true },

        // Preference List (stored as JSON)
        { key: 'options', type: 'string', size: 50000, required: true }, // JSON array of OptionEntry[]

        // Metadata
        { key: 'totalOptions', type: 'integer', required: false, default: 0 },
        { key: 'isLocked', type: 'boolean', required: false, default: false },
        { key: 'lastModified', type: 'datetime', required: true },
    ],

    indexes: [
        { key: 'idx_userId', type: 'key', attributes: ['userId'] },
        { key: 'idx_composite', type: 'unique', attributes: ['userId', 'counsellingType'] },
        { key: 'idx_counsellingType', type: 'key', attributes: ['counsellingType'] },
        { key: 'idx_isLocked', type: 'key', attributes: ['isLocked'] },
    ],

    permissions: {
        create: ['users'],
        read: ['users'],
        update: ['users'],
        delete: ['users'],
    }
};

// ============================================================================
// SCHEMA EXPORT AND DOCUMENTATION
// ============================================================================

/**
 * Complete schema export for Appwrite setup
 */
export const AppwriteSchemas = {
    userProfiles: UserProfilesSchema,
    studentRanks: StudentRanksSchema,
    colleges: CollegesSchema,
    collegeCourses: CollegeCoursesSchema,
    collegeFees: CollegeFeesSchema,
    userPreferences: UserPreferencesSchema,
};

/**
 * Setup Instructions:
 * 
 * 1. Create Database in Appwrite Console:
 *    - Name: "bharatminds_db"
 *    - Copy Database ID to .env
 * 
 * 2. Create Collections:
 *    For each schema above:
 *    - Create collection with the specified collectionId
 *    - Add all attributes as defined
 *    - Create all indexes as specified
 *    - Set permissions as documented
 * 
 * 3. Index Strategy:
 *    - unique: Ensures no duplicates (primary keys)
 *    - key: Standard index for filters and joins
 *    - fulltext: For text search (college names, etc.)
 * 
 * 4. JSON Fields:
 *    - Store arrays and objects as JSON strings
 *    - Parse in application layer
 *    - Max size: 50KB for preferences, 500B for small arrays
 * 
 * 5. Permissions:
 *    - 'any': Public read access
 *    - 'users': Authenticated users
 *    - 'admins': Admin role (setup in Appwrite)
 */

export default AppwriteSchemas;
