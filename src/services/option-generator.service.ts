
import { Query } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';

export interface GenerationCriteria {
    rank: number;
    category: string;
    seatType?: string; // e.g. 'Government'
    courseCodes?: string[]; // e.g. ['CS', 'IS', 'EC']
    collegeCodes?: string[]; // e.g. ['E001']
    location?: string;
}

export interface RoundData {
    cutoff: number;
    probability: number;
    probabilityLabel: 'High' | 'Medium' | 'Low' | 'Very Low';
    isOpen?: boolean; // If cutoff exists
}

export interface OptionEntry {
    optionId: string;
    collegeCode: string;
    collegeName: string;
    branchCode: string;
    branchName: string;
    category: string;
    year: number;
    r1: RoundData | null;
    r2: RoundData | null;
}

/**
 * Generates a list of college-course options based on student rank and preferences
 */
export async function generateOptions(criteria: GenerationCriteria): Promise<OptionEntry[]> {
    const {
        rank,
        category,
        seatType = 'Government',
        courseCodes = [],
        collegeCodes = []
    } = criteria;

    console.log(`🎲 Generating options for Rank: ${rank}, Cat: ${category}, Courses: ${courseCodes.length}`);

    try {
        let documents: any[] = [];
        // Filtering criteria
        const queries: string[] = [
            Query.equal('category', category),
            Query.equal('seatType', seatType),
            // Fetch relevant cutoffs (cutoff > 50% of rank to avoid impossible options)
            Query.greaterThanEqual('cutoffRank', Math.floor(rank * 0.5)),
            Query.limit(100)
        ];

        if (courseCodes.length > 0) {
            const promises = courseCodes.map(code =>
                databases.listDocuments(
                    config.databaseId,
                    'historical_cutoffs',
                    [
                        ...queries,
                        Query.equal('branchCode', code),
                        Query.limit(100) // Increase limit to catch multiple rounds
                    ]
                )
            );

            const results = await Promise.all(promises);
            results.forEach(r => documents.push(...r.documents));
        } else {
            const response = await databases.listDocuments(
                config.databaseId,
                'historical_cutoffs',
                [
                    ...queries,
                    Query.orderAsc('cutoffRank'),
                    Query.limit(200) // Fetch more to ensure we get R1 and R2 pairs
                ]
            );
            documents = response.documents;
        }

        // Group by College-Branch
        const groupedOptions = new Map<string, any>();

        documents.forEach(doc => {
            const key = `${doc.collegeCode}-${doc.branchCode}`;

            if (!groupedOptions.has(key)) {
                groupedOptions.set(key, {
                    optionId: doc.$id,
                    collegeCode: doc.collegeCode,
                    collegeName: doc.collegeName || doc.collegeCode,
                    branchCode: doc.branchCode,
                    branchName: doc.branchName,
                    category: doc.category,
                    year: doc.academicYear,
                    r1: null,
                    r2: null
                });
            }

            const entry = groupedOptions.get(key);
            const roundNum = doc.round || 1; // Default to 1 if missing

            // Calculate Probability for this specific round doc
            const cutoff = doc.cutoffRank;
            let prob = 0;
            let label: RoundData['probabilityLabel'] = 'Low';

            if (rank <= cutoff) {
                const ratio = rank / cutoff;
                if (ratio <= 0.8) {
                    prob = 95; label = 'High';
                } else {
                    prob = 75; label = 'Medium';
                }
            } else {
                const ratio = rank / cutoff;
                if (ratio < 1.15) {
                    prob = 40; label = 'Low';
                } else {
                    prob = 10; label = 'Very Low';
                }
            }

            const roundData: RoundData = {
                cutoff,
                probability: prob,
                probabilityLabel: label,
                isOpen: true
            };

            if (roundNum === 1) entry.r1 = roundData;
            else if (roundNum === 2) entry.r2 = roundData;
        });

        // Convert Map to Array
        const options: OptionEntry[] = Array.from(groupedOptions.values());

        // Sort by R1 probability (Low -> High)
        return options.sort((a, b) => {
            const probA = a.r1 ? a.r1.probability : (a.r2 ? a.r2.probability : 0);
            const probB = b.r1 ? b.r1.probability : (b.r2 ? b.r2.probability : 0);
            return probA - probB;
        });

    } catch (error) {
        console.error('Error generating options:', error);
        return [];
    }
}
