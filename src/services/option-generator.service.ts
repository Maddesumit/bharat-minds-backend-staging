
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

export interface OptionEntry {
    optionId: string;
    collegeCode: string;
    collegeName: string;
    branchCode: string;
    branchName: string;
    cutoffRank: number;
    probability: number; // 0-100
    probabilityLabel: 'High' | 'Medium' | 'Low' | 'Very Low';
    category: string;
    year: number;
    round: number;
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
        const queries: string[] = [
            Query.equal('category', category),
            Query.equal('seatType', seatType),
            // We want to fetch options where cutoff is RELEVANT.
            // i.e. cutoffRank > 0.
            // We usually want "Safe" (cutoff > rank) and "Ambitious" (cutoff slightly < rank).
            // Let's fetch reasonably close cutoffs. 
            // If Rank is 10000, we might want to see colleges with cutoff 5000+.
            // If Rank is 10000, cutoff 200 is impossible.
            Query.greaterThanEqual('cutoffRank', Math.floor(rank * 0.5)),
            Query.limit(100) // Safety limit per query
        ];

        // If specific colleges provided, filter by them
        // Appwrite query doesn't support "In Array" for strings easily in one go efficiently without multiple queries or search.
        // If collegeCodes is small, we can loop.
        // If courseCodes is small, we can loop.

        // Strategy: 
        // 1. If courseCodes provided, loop through them and query.
        // 2. If collegeCodes provided, filter in memory (unless only college provided).

        if (courseCodes.length > 0) {
            const promises = courseCodes.map(code =>
                databases.listDocuments(
                    config.databaseId,
                    'historical_cutoffs',
                    [
                        ...queries,
                        Query.equal('branchCode', code),
                        Query.orderAsc('cutoffRank'), // Best colleges (lowest rank) first? No, lowest rank is hard. 
                        // We want high cutoff matching. 
                        // Actually, just order by cutoffRank ascending (hardest to easiest).
                        Query.limit(50)
                    ]
                )
            );

            const results = await Promise.all(promises);
            results.forEach(r => documents.push(...r.documents));
        } else {
            // No course restriction? Query all? Might be too many.
            // This is "Suggest me anything" mode.
            // We limit to top 100 results matching rank.
            const response = await databases.listDocuments(
                config.databaseId,
                'historical_cutoffs',
                [
                    ...queries,
                    Query.orderAsc('cutoffRank'),
                    Query.limit(100)
                ]
            );
            documents = response.documents;
        }

        // Deduplicate locally (in case of overlaps if we change logic)
        const uniqueDocs = new Map();
        documents.forEach(doc => {
            const key = `${doc.collegeCode}-${doc.branchCode}`;
            if (!uniqueDocs.has(key)) {
                uniqueDocs.set(key, doc);
            }
        });

        const options: OptionEntry[] = Array.from(uniqueDocs.values()).map((doc: any) => {
            const cutoff = doc.cutoffRank;
            let prob = 0;
            let label: OptionEntry['probabilityLabel'] = 'Low';

            // Probability Logic
            // If Rank < Cutoff, Good chance.
            // Gap = Cutoff - Rank.
            // If Rank is 5000, Cutoff 6000 -> Gap 1000. Safety margin 20%?

            if (rank <= cutoff) {
                // Determine how safe
                const ratio = rank / cutoff; // e.g. 5000/6000 = 0.83
                if (ratio <= 0.8) {
                    prob = 95;
                    label = 'High';
                } else {
                    prob = 75;
                    label = 'Medium';
                }
            } else {
                // Rank > Cutoff (Ambitious)
                // e.g. Rank 6000, Cutoff 5000. Ratio = 1.2
                const ratio = rank / cutoff;
                if (ratio < 1.15) {
                    prob = 40;
                    label = 'Low';
                } else {
                    prob = 10;
                    label = 'Very Low';
                }
            }

            return {
                optionId: doc.$id,
                collegeCode: doc.collegeCode,
                collegeName: doc.collegeName || doc.collegeCode,
                branchCode: doc.branchCode,
                branchName: doc.branchName,
                cutoffRank: cutoff,
                probability: prob,
                probabilityLabel: label,
                category: doc.category,
                year: doc.academicYear,
                round: doc.round
            };
        });

        // Sort by Probability Order: Low -> Medium -> High (Ascending)
        // User Request: "lower percentages up, highest below, mid in middle"
        return options.sort((a, b) => a.probability - b.probability);

    } catch (error) {
        console.error('Error generating options:', error);
        return [];
    }
}
