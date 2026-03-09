import { Query } from 'node-appwrite';
import { databases, config } from '../config/appwrite.config';
import * as collegeService from './college.service';

async function listAllDocuments(collectionId: string, queries: any[], maxDocs: number = 5000): Promise<any[]> {
    const out: any[] = [];
    let offset = 0;
    const limit = 100;

    while (out.length < maxDocs) {
        const page = await databases.listDocuments(
            config.databaseId,
            collectionId,
            [...queries, Query.limit(limit), Query.offset(offset)]
        );

        const docs = (page.documents || []) as any[];
        out.push(...docs);

        if (docs.length < limit) break;
        offset += limit;
    }

    return out.slice(0, maxDocs);
}

function normalizeCutoffRow(doc: any): { year: number | null; round: number | null; closingRank: number | null } {
    const year = typeof doc.year === 'number' ? doc.year : (typeof doc.year === 'string' ? Number(doc.year) : null);
    const round = typeof doc.round === 'number' ? doc.round : (typeof doc.round === 'string' ? Number(doc.round) : null);
    const closingRank =
        typeof doc.closingRank === 'number'
            ? doc.closingRank
            : (typeof doc.closingRank === 'string' ? Number(doc.closingRank) : null);

    return {
        year: Number.isFinite(year as any) ? (year as number) : null,
        round: Number.isFinite(round as any) ? (round as number) : null,
        closingRank: Number.isFinite(closingRank as any) ? (closingRank as number) : null,
    };
}

export async function getCollegeInsights(args: {
    collegeCode: string;
    branchCode?: string;
    category?: string;
}) {
    const { collegeCode, branchCode, category } = args;

    const college = await collegeService.getCollegeByCode(collegeCode);
    if (!college.success) return college;

    // Count distinct courses offered (Engineering-only inference from cutoff collections)
    const docsR1 = await listAllDocuments(config.collections.r1Cutoffs, [Query.equal('collegeCode', collegeCode)]);
    const docsR2 = await listAllDocuments(config.collections.r2Cutoffs, [Query.equal('collegeCode', collegeCode)]);
    const docsHk = await listAllDocuments(config.collections.r1r2Hk, [Query.equal('collegeCode', collegeCode)]);

    const courseSet = new Set<string>();
    for (const d of [...docsR1, ...docsR2, ...docsHk]) {
        const id = (d.courseId ?? d.course_code ?? d.coursecode ?? '').toString();
        if (id) courseSet.add(id);
    }

    let trendSeries: Array<{ year: number; round: number; closingRank: number }> = [];
    let trendSummary: any = null;

    if (branchCode) {
        const baseQueries = [
            Query.equal('collegeCode', collegeCode),
            Query.equal('courseId', branchCode),
        ];
        const withCategory = category ? [...baseQueries, Query.equal('category', category)] : baseQueries;

        const rows = [
            ...(await listAllDocuments(config.collections.r1Cutoffs, withCategory)),
            ...(await listAllDocuments(config.collections.r2Cutoffs, withCategory)),
            ...(await listAllDocuments(config.collections.r1r2Hk, withCategory)),
        ];

        trendSeries = rows
            .map((r) => normalizeCutoffRow(r))
            .filter((r) => r.year !== null && r.round !== null && r.closingRank !== null)
            .map((r) => ({ year: r.year as number, round: r.round as number, closingRank: r.closingRank as number }))
            .sort((a, b) => (a.year - b.year) || (a.round - b.round));

        if (trendSeries.length > 0) {
            const earliest = trendSeries[0]!;
            const latest = trendSeries[trendSeries.length - 1]!;
            const closingRanks = trendSeries.map((p) => p.closingRank);
            const min = Math.min(...closingRanks);
            const max = Math.max(...closingRanks);

            // For ranks: lower closingRank means more competitive.
            const direction =
                latest.closingRank < earliest.closingRank
                    ? 'more_competitive'
                    : latest.closingRank > earliest.closingRank
                        ? 'less_competitive'
                        : 'stable';

            trendSummary = {
                direction,
                earliest,
                latest,
                minClosingRank: min,
                maxClosingRank: max,
            };
        }
    }

    return {
        success: true,
        data: {
            college: college.data,
            coursesOfferedCount: courseSet.size,
            trend: {
                branchCode: branchCode || null,
                category: category || null,
                series: trendSeries,
                summary: trendSummary,
            },
        },
    };
}

