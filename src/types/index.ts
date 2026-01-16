/**
 * TypeScript Type Definitions for BharatMinds AI Backend
 */

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    code?: number;
}

export interface ValidationError {
    field: string;
    message: string;
}

export interface ErrorResponse {
    success: false;
    error: string;
    errors?: ValidationError[];
    code?: number;
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    phone?: string;
    college?: string;
    city?: string;
    state?: string;
    examType?: 'UGCET' | 'UGNEET' | 'COMBINED';
    currentYear?: string;
    stream?: string;
    preferredLanguage?: 'English' | 'Kannada' | 'Hindi' | 'Telugu';
}

export interface RegisterResponse {
    success: true;
    message: string;
    data: {
        user: {
            id: string;
            email: string;
            name: string;
        };
        profile: UserProfile;
    };
}

export interface UserProfile {
    $id: string;
    userId: string;
    name: string;
    email: string;
    phone?: string;
    college?: string;
    city?: string;
    state?: string;
    currentYear?: string;
    stream?: string;
    examType?: string;
    preferredLanguage?: string;
    profileCompleted: boolean;
    registrationCompleted: boolean;
    $createdAt: string;
    $updatedAt: string;
}

export interface UpdateProfileRequest {
    college?: string;
    city?: string;
    state?: string;
    currentYear?: string;
    stream?: string;
    examType?: 'UGCET' | 'UGNEET' | 'COMBINED';
    preferredLanguage?: 'English' | 'Kannada' | 'Hindi' | 'Telugu';
    profileCompleted?: boolean;
    registrationCompleted?: boolean;
}

// ============================================================================
// STUDENT TYPES
// ============================================================================

export interface CourseRank {
    courseCode: string;
    courseName: string;
    rank: number;
    practicalRank?: number;
}

export interface StudentData {
    $id: string;
    userId: string;
    name: string;
    mobile: string;
    email: string;
    counsellingTypes: string[];
    ugcetCourses?: string[];
    farmScienceCourses?: string[];
    ugneetCourses?: string;
    ugneetSpecialCategories?: string[];
    neetAIR?: number;
    courseRanks: string;
    baseCategory: string;
    hasKannada: boolean;
    hasRural: boolean;
    hasHK: boolean;
    snqApplied?: boolean;
    incomeSlab?: string;
    eligibleCategories: string;
    specialCategories: string;
    $createdAt: string;
    $updatedAt: string;
}

// ============================================================================
// COUNSELLING TYPES
// ============================================================================

export enum CounsellingType {
    UGCET = 'UGCET',
    UGNEET = 'UGNEET',
    COMBINED = 'COMBINED'
}

export enum BaseCategory {
    CATEGORY_1G = '1G',
    CATEGORY_2AG = '2AG',
    CATEGORY_2BG = '2BG',
    CATEGORY_3AG = '3AG',
    CATEGORY_3BG = '3BG',
    SC = 'SCG',
    ST = 'STG',
    GM = 'GM'
}

// ============================================================================
// OPTION LIST TYPES
// ============================================================================

export interface ScoredCollege {
    collegeCode: string;
    collegeName: string;
    course: string;
    courseCode: string;
    courseName: string;
    category: string;
    cutoffRank: number;
    round: string;
    year: number;
    score: number;
    probability: number;
    tier: 'safe' | 'target' | 'reach';
}

export interface OptionList {
    $id: string;
    studentId: string;
    userId: string;
    safeColleges: string; // JSON
    targetColleges: string; // JSON
    reachColleges: string; // JSON
    generatedAt: string;
    examType: string;
    totalOptions: number;
    $createdAt: string;
    $updatedAt: string;
}

export default {
    ApiResponse,
    ErrorResponse,
    RegisterRequest,
    RegisterResponse,
    UserProfile,
    UpdateProfileRequest,
    StudentData,
    CourseRank,
    ScoredCollege,
    OptionList,
};
