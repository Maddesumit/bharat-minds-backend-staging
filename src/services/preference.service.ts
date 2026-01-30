/**
 * Preference Service (CRITICAL)
 * 
 * Handles user preference/option entry with comprehensive validation:
 * - No duplicate entries (college + course + seat type + category)
 * - Continuous priority ordering (no gaps)
 * - Seat type must be valid for counselling type
 * - Category must be in user's eligible list
 */

import { ID } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';
import { OptionEntry, UserPreferences, ValidationResult, CounsellingType, SeatType, CategoryVariant } from '../types/domain.types';
import { isCategoryEligible } from './category.service';
import { validateSeatType } from './course.service';
import { getUserProfile } from './user-profile.service';

/**
 * Add preference DTO
 */
export interface AddPreferenceDTO {
    userId: string;
    counsellingType: CounsellingType;
    collegeId: string;
    collegeCode: string;
    collegeName: string;
    courseType: string;
    branchName?: string;
    branchCode?: string;
    seatType: SeatType;
    category: CategoryVariant;
}

/**
 * Add a single preference entry
 */
export async function addPreference(data: AddPreferenceDTO) {
    try {
        // Get user's existing preferences
        const existingPrefs = await getPreferences(data.userId, data.counsellingType);

        let options: OptionEntry[] = [];
        let preferencesId: string | null = null;

        if (existingPrefs.success && existingPrefs.data) {
            options = existingPrefs.data.options;
            preferencesId = existingPrefs.data.$id;

            // Check if preferences are locked
            if (existingPrefs.data.isLocked) {
                return {
                    success: false,
                    error: 'Preferences are locked. Cannot add new entries.',
                };
            }
        }

        // Create new option entry with next priority
        const newOption: OptionEntry = {
            priority: options.length + 1,
            collegeId: data.collegeId,
            collegeCode: data.collegeCode,
            collegeName: data.collegeName,
            courseType: data.courseType,
            branchName: data.branchName,
            branchCode: data.branchCode,
            seatType: data.seatType,
            category: data.category,
        };

        // Validate the new entry
        const validation = await validatePreferenceEntry(data.userId, newOption, options);

        if (!validation.isValid) {
            return {
                success: false,
                errors: validation.errors,
            };
        }

        // Add to options list
        options.push(newOption);

        // Save preferences
        if (preferencesId) {
            // Update existing
            return await updatePreferencesDocument(preferencesId, options);
        } else {
            // Create new
            return await createPreferencesDocument(data.userId, data.counsellingType, options);
        }
    } catch (error: any) {
        console.error('Add preference error:', error);
        return {
            success: false,
            error: error.message || 'Failed to add preference',
        };
    }
}

/**
 * Bulk add preferences
 */
// two-column format for rounds
export async function bulkAddPreferences(
    userId: string,
    counsellingType: CounsellingType,
    preferences: Omit<AddPreferenceDTO, 'userId' | 'counsellingType'>[]
) {
    try {
        // Validate all entries first
        const options: OptionEntry[] = preferences.map((pref, index) => ({
            priority: index + 1,
            collegeId: pref.collegeId,
            collegeCode: pref.collegeCode,
            collegeName: pref.collegeName,
            courseType: pref.courseType,
            branchName: pref.branchName,
            branchCode: pref.branchCode,
            seatType: pref.seatType,
            category: pref.category,
        }));

        // Validate all entries
        const validation = await validatePreferenceList(userId, counsellingType, options);

        if (!validation.isValid) {
            return {
                success: false,
                errors: validation.errors,
            };
        }

        // Create or update preferences
        const existing = await getPreferences(userId, counsellingType);

        if (existing.success && existing.data) {
            if (existing.data.isLocked) {
                return {
                    success: false,
                    error: 'Preferences are locked',
                };
            }
            return await updatePreferencesDocument(existing.data.$id, options);
        } else {
            return await createPreferencesDocument(userId, counsellingType, options);
        }
    } catch (error: any) {
        console.error('Bulk add preferences error:', error);
        return {
            success: false,
            error: error.message || 'Failed to bulk add preferences',
        };
    }
}

/**
 * Get user preferences
 */
export async function getPreferences(userId: string, counsellingType: CounsellingType) {
    try {
        const documents = await databases.listDocuments(
            config.databaseId,
            config.collections.userPreferences
        );

        const prefs = documents.documents.find(
            (doc: any) => doc.userId === userId && doc.counsellingType === counsellingType
        );

        if (!prefs) {
            return {
                success: false,
                error: 'Preferences not found',
            };
        }

        return {
            success: true,
            data: {
                ...prefs,
                options: JSON.parse(prefs.options || '[]'),
            },
        };
    } catch (error: any) {
        console.error('Get preferences error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get preferences',
        };
    }
}

/**
 * Remove a preference by priority
 */
export async function removePreference(userId: string, counsellingType: CounsellingType, priority: number) {
    try {
        const existing = await getPreferences(userId, counsellingType);

        if (!existing.success) {
            return existing;
        }

        if (existing.data.isLocked) {
            return {
                success: false,
                error: 'Preferences are locked',
            };
        }

        // Remove the option
        let options: OptionEntry[] = existing.data.options.filter((opt: OptionEntry) => opt.priority !== priority);

        // Reorder priorities
        options = options.map((opt, index) => ({
            ...opt,
            priority: index + 1,
        }));

        return await updatePreferencesDocument(existing.data.$id, options);
    } catch (error: any) {
        console.error('Remove preference error:', error);
        return {
            success: false,
            error: error.message || 'Failed to remove preference',
        };
    }
}

/**
 * Reorder preferences (change priority)
 */
export async function reorderPreferences(
    userId: string,
    counsellingType: CounsellingType,
    fromPriority: number,
    toPriority: number
) {
    try {
        const existing = await getPreferences(userId, counsellingType);

        if (!existing.success) {
            return existing;
        }

        if (existing.data.isLocked) {
            return {
                success: false,
                error: 'Preferences are locked',
            };
        }

        let options: OptionEntry[] = existing.data.options;

        // Find and move the option
        const movedOption = options.find(opt => opt.priority === fromPriority);

        if (!movedOption) {
            return {
                success: false,
                error: 'Option not found',
            };
        }

        // Remove from old position
        options = options.filter(opt => opt.priority !== fromPriority);

        // Insert at new position
        options.splice(toPriority - 1, 0, movedOption);

        // Reorder all priorities
        options = options.map((opt, index) => ({
            ...opt,
            priority: index + 1,
        }));

        return await updatePreferencesDocument(existing.data.$id, options);
    } catch (error: any) {
        console.error('Reorder preferences error:', error);
        return {
            success: false,
            error: error.message || 'Failed to reorder preferences',
        };
    }
}

/**
 * Lock preferences (finalize submission)
 */
export async function lockPreferences(userId: string, counsellingType: CounsellingType) {
    try {
        const existing = await getPreferences(userId, counsellingType);

        if (!existing.success) {
            return existing;
        }

        if (existing.data.isLocked) {
            return {
                success: false,
                error: 'Preferences are already locked',
            };
        }

        // Validate before locking
        const validation = await validatePreferenceList(userId, counsellingType, existing.data.options);

        if (!validation.isValid) {
            return {
                success: false,
                error: 'Cannot lock preferences with validation errors',
                errors: validation.errors,
            };
        }

        const document = await databases.updateDocument(
            config.databaseId,
            config.collections.userPreferences,
            existing.data.$id,
            { isLocked: true }
        );

        return {
            success: true,
            data: document,
            message: 'Preferences locked successfully',
        };
    } catch (error: any) {
        console.error('Lock preferences error:', error);
        return {
            success: false,
            error: error.message || 'Failed to lock preferences',
        };
    }
}

/**
 * Unlock preferences (admin only)
 */
export async function unlockPreferences(userId: string, counsellingType: CounsellingType) {
    try {
        const existing = await getPreferences(userId, counsellingType);

        if (!existing.success) {
            return existing;
        }

        const document = await databases.updateDocument(
            config.databaseId,
            config.collections.userPreferences,
            existing.data.$id,
            { isLocked: false }
        );

        return {
            success: true,
            data: document,
            message: 'Preferences unlocked successfully',
        };
    } catch (error: any) {
        console.error('Unlock preferences error:', error);
        return {
            success: false,
            error: error.message || 'Failed to unlock preferences',
        };
    }
}

/**
 * Validate a single preference entry
 */
async function validatePreferenceEntry(
    userId: string,
    newEntry: OptionEntry,
    existingOptions: OptionEntry[]
): Promise<ValidationResult> {
    const errors: string[] = [];

    // Get user profile for eligible categories
    const profile = await getUserProfile(userId);

    if (!profile.success) {
        errors.push('User profile not found');
        return { isValid: false, errors };
    }

    const eligibleCategories: CategoryVariant[] = profile.data.eligibleCategories;
    const counsellingTypes: CounsellingType[] = profile.data.counsellingTypes;

    // Check if category is eligible
    if (!isCategoryEligible(newEntry.category, eligibleCategories)) {
        errors.push(`Category ${newEntry.category} is not in your eligible categories list`);
    }

    // Check for duplicates (college + course + seat type + category)
    const duplicate = existingOptions.find(
        (opt) =>
            opt.collegeCode === newEntry.collegeCode &&
            opt.courseType === newEntry.courseType &&
            opt.branchCode === newEntry.branchCode &&
            opt.seatType === newEntry.seatType &&
            opt.category === newEntry.category
    );

    if (duplicate) {
        errors.push('Duplicate entry: This option already exists in your preferences');
    }

    // Validate seat type for counselling type
    // Note: We need to determine counselling type from context
    // For now, assuming it's passed or derived from user profile

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Validate entire preference list
 */
async function validatePreferenceList(
    userId: string,
    counsellingType: CounsellingType,
    options: OptionEntry[]
): Promise<ValidationResult> {
    const errors: string[] = [];

    // Get user profile
    const profile = await getUserProfile(userId);

    if (!profile.success) {
        errors.push('User profile not found');
        return { isValid: false, errors };
    }

    const eligibleCategories: CategoryVariant[] = profile.data.eligibleCategories;

    // Check priority continuity (1, 2, 3... no gaps)
    const priorities = options.map(opt => opt.priority).sort((a, b) => a - b);
    for (let i = 0; i < priorities.length; i++) {
        if (priorities[i] !== i + 1) {
            errors.push(`Priority gap detected: Expected ${i + 1}, got ${priorities[i]}`);
            break;
        }
    }

    // Check for duplicates
    const seen = new Set<string>();
    for (const opt of options) {
        const key = `${opt.collegeCode}-${opt.courseType}-${opt.branchCode || ''}-${opt.seatType}-${opt.category}`;
        if (seen.has(key)) {
            errors.push(`Duplicate entry found: ${opt.collegeName} - ${opt.courseType} - ${opt.seatType} - ${opt.category}`);
        }
        seen.add(key);
    }

    // Validate each option
    for (const opt of options) {
        // Category eligibility
        if (!isCategoryEligible(opt.category, eligibleCategories)) {
            errors.push(`Invalid category ${opt.category} for option ${opt.priority}`);
        }

        // Seat type validation
        if (!validateSeatType(opt.seatType, counsellingType)) {
            errors.push(`Invalid seat type ${opt.seatType} for ${counsellingType} at option ${opt.priority}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Create preferences document
 */
async function createPreferencesDocument(
    userId: string,
    counsellingType: CounsellingType,
    options: OptionEntry[]
) {
    try {
        const document = await databases.createDocument(
            config.databaseId,
            config.collections.userPreferences,
            ID.unique(),
            {
                userId,
                counsellingType,
                options: JSON.stringify(options),
                totalOptions: options.length,
                isLocked: false,
                lastModified: new Date().toISOString(),
            }
        );

        return {
            success: true,
            data: {
                ...document,
                options: options,
            },
            message: 'Preferences saved successfully',
        };
    } catch (error: any) {
        console.error('Create preferences document error:', error);
        return {
            success: false,
            error: error.message || 'Failed to save preferences',
        };
    }
}

/**
 * Update preferences document
 */
async function updatePreferencesDocument(preferencesId: string, options: OptionEntry[]) {
    try {
        const document = await databases.updateDocument(
            config.databaseId,
            config.collections.userPreferences,
            preferencesId,
            {
                options: JSON.stringify(options),
                totalOptions: options.length,
                lastModified: new Date().toISOString(),
            }
        );

        return {
            success: true,
            data: {
                ...document,
                options: options,
            },
            message: 'Preferences updated successfully',
        };
    } catch (error: any) {
        console.error('Update preferences document error:', error);
        return {
            success: false,
            error: error.message || 'Failed to update preferences',
        };
    }
}

export default {
    addPreference,
    bulkAddPreferences,
    getPreferences,
    removePreference,
    reorderPreferences,
    lockPreferences,
    unlockPreferences,
};
