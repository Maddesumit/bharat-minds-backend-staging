/**
 * BHARAT MINDS OPTION ENTRY GENERATOR
 * 
 * Service for handling student rank entry with edge cases for
 * Farm Science and Veterinary courses (Theory + Practical ranks)
 */

import { ID, Query } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';

// ==================== TYPES ====================

export type CounsellingType = 'UGCET' | 'UGNEET' | 'Combined';

export type CourseCategory = 
    | 'Engineering'
    | 'Architecture'
    | 'Veterinary'
    | 'Farm Science'
    | 'Pharmacy'
    | 'Yoga & Naturopathy'
    | 'B.Sc Nursing';

export interface RankInput {
    userId: string;
    counsellingType: CounsellingType;
    courseCategory: CourseCategory;
    branch?: string;  // For Engineering
    // Standard courses use generalMeritRank
    generalMeritRank?: number;
    categoryRank?: number;
    // Farm Science & Veterinary use both theory and practical
    theoryRank?: number;
    practicalRank?: number;
}

export interface OptionEntry {
    collegeCode: string;
    collegeName: string;
    courseCode: string;
    courseName: string;
    predictedRank: number;
    cutoffLastYear: number;
    admissionChance: 'High' | 'Medium' | 'Low';
}

// ==================== VALIDATION ====================

/**
 * Phase 2: Validate rank input based on course type
 */
export function validateRankInput(input: RankInput): { valid: boolean; error?: string } {
    const specialCourses = ['Farm Science', 'Veterinary'];
    
    // Edge Case: Farm Science & Veterinary need BOTH theory and practical
    if (specialCourses.includes(input.courseCategory)) {
        if (!input.theoryRank || !input.practicalRank) {
            return {
                valid: false,
                error: `${input.courseCategory} requires both Theory Rank AND Practical Rank`
            };
        }
        
        if (input.theoryRank <= 0 || input.practicalRank <= 0) {
            return {
                valid: false,
                error: 'Theory and Practical ranks must be positive integers'
            };
        }
    } else {
        // Standard courses need general merit rank
        if (!input.generalMeritRank) {
            return {
                valid: false,
                error: 'General Merit Rank is required for this course'
            };
        }
        
        if (input.generalMeritRank <= 0) {
            return {
                valid: false,
                error: 'Rank must be a positive integer'
            };
        }
    }
    
    return { valid: true };
}

// ==================== DATABASE OPERATIONS ====================

/**
 * Phase 3: Save student rank to database
 */
export async function saveStudentRank(rankInput: RankInput) {
    try {
        // Step 1: Validate input
        const validation = validateRankInput(rankInput);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }
        
        // Step 2: Check if rank already exists for this user + course combination
        const existingRanks = await databases.listDocuments(
            config.databaseId,
            config.collections.studentRanks,
            [
                Query.equal('userId', rankInput.userId),
                Query.equal('courseCategory', rankInput.courseCategory)
            ]
        );
        
        // Step 3: Prepare data for storage
        const rankData = {
            userId: rankInput.userId,
            counsellingType: rankInput.counsellingType,
            courseCategory: rankInput.courseCategory,
            branch: rankInput.branch || null,
            generalMeritRank: rankInput.generalMeritRank || null,
            categoryRank: rankInput.categoryRank || null,
            theoryRank: rankInput.theoryRank || null,
            practicalRank: rankInput.practicalRank || null,
            updatedAt: new Date().toISOString()
        };
        
        // Step 4: Update or Create
        if (existingRanks.documents.length > 0) {
            // Update existing rank
            const document = await databases.updateDocument(
                config.databaseId,
                config.collections.studentRanks,
                existingRanks.documents[0].$id,
                rankData
            );
            
            return {
                success: true,
                data: document,
                action: 'updated',
                message: 'Rank updated successfully'
            };
        } else {
            // Create new rank entry
            const document = await databases.createDocument(
                config.databaseId,
                config.collections.studentRanks,
                ID.unique(),
                {
                    ...rankData,
                    createdAt: new Date().toISOString()
                }
            );
            
            return {
                success: true,
                data: document,
                action: 'created',
                message: 'Rank saved successfully'
            };
        }
    } catch (error: any) {
        console.error('Save student rank error:', error);
        return {
            success: false,
            error: error.message || 'Failed to save rank'
        };
    }
}

/**
 * Get all ranks for a user
 */
export async function getStudentRanks(userId: string) {
    try {
        const response = await databases.listDocuments(
            config.databaseId,
            config.collections.studentRanks,
            [Query.equal('userId', userId)]
        );
        
        return {
            success: true,
            data: response.documents,
            count: response.total
        };
    } catch (error: any) {
        console.error('Get student ranks error:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch ranks'
        };
    }
}

// ==================== OPTION GENERATION ====================

/**
 * Phase 5: Generate personalized option entry list
 * Matches student ranks with previous year cutoff data
 */
export async function generateOptionList(userId: string): Promise<{
    success: boolean;
    data?: OptionEntry[];
    error?: string;
}> {
    try {
        // Step 1: Get student's saved ranks
        const ranksResult = await getStudentRanks(userId);
        if (!ranksResult.success || !ranksResult.data) {
            return {
                success: false,
                error: 'No ranks found for this user'
            };
        }
        
        const studentRanks = ranksResult.data;
        const optionEntries: OptionEntry[] = [];
        
        // Step 2: For each rank, query cutoff data
        for (const rank of studentRanks) {
            const courseCategory = rank.courseCategory as string;
            
            // Step 3: Build query based on course type
            let queries = [
                Query.equal('courseCategory', courseCategory),
                Query.orderAsc('cutoffRank')
            ];
            
            // Edge case handling for Farm Science/Veterinary
            if (['Farm Science', 'Veterinary'].includes(courseCategory)) {
                const avgRank = Math.floor(
                    ((rank.theoryRank || 0) + (rank.practicalRank || 0)) / 2
                );
                queries.push(Query.lessThanEqual('cutoffRank', avgRank + 1000)); // +1000 buffer
            } else {
                const studentRank = rank.generalMeritRank || 999999;
                queries.push(Query.lessThanEqual('cutoffRank', studentRank + 1000));
            }
            
            // Step 4: Fetch matching colleges from cutoff data
            const cutoffResponse = await databases.listDocuments(
                config.databaseId,
                config.collections.cutoffData,
                queries
            );
            
            // Step 5: Process results and calculate admission chances
            for (const cutoff of cutoffResponse.documents) {
                const cutoffRank = cutoff.cutoffRank as number;
                const studentRank = rank.generalMeritRank || 
                    Math.floor(((rank.theoryRank || 0) + (rank.practicalRank || 0)) / 2);
                
                const rankDifference = cutoffRank - studentRank;
                
                // Calculate admission chance
                let admissionChance: 'High' | 'Medium' | 'Low';
                if (rankDifference >= 500) {
                    admissionChance = 'High';
                } else if (rankDifference >= 100) {
                    admissionChance = 'Medium';
                } else {
                    admissionChance = 'Low';
                }
                
                optionEntries.push({
                    collegeCode: cutoff.collegeCode as string,
                    collegeName: cutoff.collegeName as string,
                    courseCode: cutoff.courseCode as string,
                    courseName: cutoff.courseName as string,
                    predictedRank: studentRank,
                    cutoffLastYear: cutoffRank,
                    admissionChance
                });
            }
        }
        
        // Step 6: Sort by admission chance and rank
        optionEntries.sort((a, b) => {
            const chanceOrder = { High: 0, Medium: 1, Low: 2 };
            return chanceOrder[a.admissionChance] - chanceOrder[b.admissionChance];
        });
        
        // Step 7: Save option list to database (optional)
        await databases.createDocument(
            config.databaseId,
            config.collections.optionLists,
            ID.unique(),
            {
                userId,
                options: JSON.stringify(optionEntries),
                generatedAt: new Date().toISOString()
            }
        );
        
        return {
            success: true,
            data: optionEntries
        };
    } catch (error: any) {
        console.error('Generate option list error:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate options'
        };
    }
}

// ==================== COURSE CATEGORIES ====================

/**
 * Phase 1: Get available course categories for counselling type
 */
export function getCourseCategoriesForCounselling(counsellingType: CounsellingType): CourseCategory[] {
    if (counsellingType === 'UGCET') {
        return [
            'Engineering',
            'Architecture',
            'Veterinary',
            'Farm Science',
            'Pharmacy',
            'Yoga & Naturopathy',
            'B.Sc Nursing'
        ];
    } else if (counsellingType === 'UGNEET') {
        return ['Veterinary'];
    } else {
        // Combined
        return [
            'Engineering',
            'Architecture',
            'Veterinary',
            'Farm Science',
            'Pharmacy',
            'Yoga & Naturopathy',
            'B.Sc Nursing'
        ];
    }
}

/**
 * Check if a course requires Theory + Practical ranks
 */
export function requiresDualRanks(courseCategory: CourseCategory): boolean {
    return ['Farm Science', 'Veterinary'].includes(courseCategory);
}

/**
 * Get engineering branches
 */
export function getEngineeringBranches(): string[] {
    return [
        'Computer Science',
        'Information Science',
        'Electronics & Communication',
        'Electrical & Electronics',
        'Mechanical',
        'Civil',
        'Chemical',
        'Biotechnology',
        'Industrial Engineering',
        'Automation & Robotics'
    ];
}

/**
 * Get Farm Science sub-categories
 */
export function getFarmScienceCategories(): string[] {
    return [
        'Agriculture',
        'Horticulture',
        'Sericulture',
        'Forestry',
        'Agricultural Engineering'
    ];
}

// ==================== EXPORTS ====================

export default {
    validateRankInput,
    saveStudentRank,
    getStudentRanks,
    generateOptionList,
    getCourseCategoriesForCounselling,
    requiresDualRanks,
    getEngineeringBranches,
    getFarmScienceCategories
};
