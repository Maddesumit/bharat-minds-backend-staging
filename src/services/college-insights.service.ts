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

async function listByAnyKey(args: { collectionId: string; keyCandidates: string[]; value: string }): Promise<any[]> {
    const out: any[] = [];
    const seen = new Set<string>();

    for (const key of args.keyCandidates) {
        try {
            const docs = await listAllDocuments(args.collectionId, [Query.equal(key, args.value)]);
            for (const d of docs) {
                const id = String(d?.$id || '');
                if (id && !seen.has(id)) {
                    seen.add(id);
                    out.push(d);
                }
            }
        } catch (e: any) {
            // Appwrite throws code 400, type 'general_query_invalid' if attribute is not in schema.
            // This is expected and should be ignored, allowing us to probe multiple keys.
            if (e?.type !== 'general_query_invalid') {
                // Re-throw unexpected errors
                throw e;
            }
        }
    }

    return out;
}

function normalizeBaseCategoryToCutoffCategory(baseCategory: string): string {
    const b = (baseCategory || '').toUpperCase().trim();

    // Accept common shorthand and map to cutoff category keys used in data (e.g. 2AG, SCG)
    if (b === '2A') return '2AG';
    if (b === '2B') return '2BG';
    if (b === '3A') return '3AG';
    if (b === '3B') return '3BG';
    if (b === '1') return '1G';
    if (b === 'SC') return 'SCG';
    if (b === 'ST') return 'STG';

    return b;
}

function applyKannadaRuralVariants(base: string, flags: { hasKannada: boolean; hasRural: boolean }) {
    const variants = new Set<string>();
    variants.add(base);

    // GM uses suffixes appended
    if (base === 'GM') {
        if (flags.hasKannada) variants.add('GMK');
        if (flags.hasRural) variants.add('GMR');
        return Array.from(variants);
    }

    // Most KEA categories end in G (e.g. 2AG, SCG, 1G). K/R variants replace the trailing G.
    if (base.endsWith('G')) {
        const prefix = base.slice(0, -1);
        if (flags.hasKannada) variants.add(`${prefix}K`);
        if (flags.hasRural) variants.add(`${prefix}R`);
        return Array.from(variants);
    }

    // Fallback: append if unexpected format
    if (flags.hasKannada) variants.add(`${base}K`);
    if (flags.hasRural) variants.add(`${base}R`);
    return Array.from(variants);
}

function applyHKToCategory(category: string): string {
    // If category ends with G, HK variant replaces G -> H (e.g. 2AG -> 2AH).
    // Otherwise HK appends H (e.g. 2AK -> 2AKH, GMR -> GMRH).
    if (category.endsWith('G')) return `${category.slice(0, -1)}H`;
    if (category.endsWith('H')) return category;
    return `${category}H`;
}

function buildEligibleCategoryLists(args: {
    baseCategory: string;
    hasKannada: boolean;
    hasRural: boolean;
    hasHK: boolean;
}): { list1: string[]; list2: string[]; eligibleCategories: string[] } {
    const base = normalizeBaseCategoryToCutoffCategory(args.baseCategory);

    const list1Base = applyKannadaRuralVariants(base, { hasKannada: args.hasKannada, hasRural: args.hasRural });
    const list2Base = applyKannadaRuralVariants('GM', { hasKannada: args.hasKannada, hasRural: args.hasRural });

    const list1 = new Set<string>(list1Base);
    const list2 = new Set<string>(list2Base);

    if (args.hasHK) {
        for (const c of list1Base) list1.add(applyHKToCategory(c));
        for (const c of list2Base) list2.add(applyHKToCategory(c));
    }

    const eligibleCategories = Array.from(new Set([...Array.from(list1), ...Array.from(list2)]));

    return {
        list1: Array.from(list1),
        list2: Array.from(list2),
        eligibleCategories,
    };
}

function normalizeCutoffRow(doc: any): { year: number | null; round: number | null; closingRank: number | null } {
    const year = typeof doc.year === 'number' ? doc.year : (typeof doc.year === 'string' ? Number(doc.year) : null);
    const round = typeof doc.round === 'number' ? doc.round : (typeof doc.round === 'string' ? Number(doc.round) : null);
    const closingRank =
        typeof doc.closingRank === 'number'
            ? doc.closingRank
            : (typeof doc.closingRank === 'string' ? Number(doc.closingRank) : (
                typeof doc.closing_rank === 'number'
                    ? doc.closing_rank
                    : (typeof doc.closing_rank === 'string' ? Number(doc.closing_rank) : (
                        typeof doc.cutoffRank === 'number'
                            ? doc.cutoffRank
                            : (typeof doc.cutoffRank === 'string' ? Number(doc.cutoffRank) : (
                                typeof doc.cutoff_rank === 'number'
                                    ? doc.cutoff_rank
                                    : (typeof doc.cutoff_rank === 'string' ? Number(doc.cutoff_rank) : null)
                            ))
                    ))
            ));

    return {
        year: Number.isFinite(year as any) ? (year as number) : null,
        round: Number.isFinite(round as any) ? (round as number) : null,
        closingRank: Number.isFinite(closingRank as any) ? (closingRank as number) : null,
    };
}

function extractCutoffFields(doc: any): { collegeCode: string; courseCode: string; category: string; year: number | null; round: number | null; closingRank: number | null } {
    const collegeCode = (doc.collegeCode ?? doc.college_code ?? doc.collegecode ?? doc.code ?? '').toString();
    const courseCode = (doc.courseId ?? doc.course_code ?? doc.courseCode ?? doc.coursecode ?? '').toString();
    const category = (doc.category ?? '').toString();
    const { year, round, closingRank } = normalizeCutoffRow(doc);
    return { collegeCode, courseCode, category, year, round, closingRank };
}

function summarizeLatestYearRound1Round2(rows: any[]): { year: number | null; round1ClosingRank?: number; round2ClosingRank?: number } {
    const points = rows
        .map((d) => extractCutoffFields(d))
        .filter((p) => p.year !== null && p.round !== null && p.closingRank !== null);

    if (!points.length) return { year: null };
    const latestYear = Math.max(...points.map((p) => p.year as number));
    const inYear = points.filter((p) => p.year === latestYear);
    const round1 = inYear.find((p) => p.round === 1)?.closingRank ?? undefined;
    const round2 = inYear.find((p) => p.round === 2)?.closingRank ?? undefined;

    return {
        year: latestYear,
        round1ClosingRank: typeof round1 === 'number' ? round1 : undefined,
        round2ClosingRank: typeof round2 === 'number' ? round2 : undefined,
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
    const collegeKeyCandidates = ['collegeCode', 'college_code', 'collegecode'];
    const docsR1 = await listByAnyKey({ collectionId: config.collections.r1Cutoffs, keyCandidates: collegeKeyCandidates, value: collegeCode });
    const docsR2 = await listByAnyKey({ collectionId: config.collections.r2Cutoffs, keyCandidates: collegeKeyCandidates, value: collegeCode });
    const docsHk = await listByAnyKey({ collectionId: config.collections.r1r2Hk, keyCandidates: collegeKeyCandidates, value: collegeCode });

    const courseSet = new Set<string>();
    for (const d of [...docsR1, ...docsR2, ...docsHk]) {
        const id = (d.courseId ?? d.course_code ?? d.courseCode ?? d.coursecode ?? d.course_code ?? '').toString();
        if (id) courseSet.add(id);
    }

    // Seat Matrix (best-effort): pull whatever exists for this college and summarize UG courses.
    const seatMatrixKeyCandidates = ['collegeCode', 'college_code', 'collegecode', 'collegeId', 'college_id'];
    const seatMatrixDocs = await listByAnyKey({
        collectionId: config.collections.seatMatrix,
        keyCandidates: seatMatrixKeyCandidates,
        value: collegeCode,
    });

    const normalizeYear = (v: any): number | null => {
        if (typeof v === 'number') return v;
        if (typeof v === 'string' && v.trim() && !isNaN(Number(v))) return Number(v);
        return null;
    };

    const normalizedSeatRows = (seatMatrixDocs as any[]).map((d) => {
        const academicYear =
            normalizeYear(d.academicYear) ??
            normalizeYear(d.acadamic_year) ??
            normalizeYear(d.academic_year) ??
            normalizeYear(d.year);

        const courseId = (d.courseId ?? d.course_code ?? d.courseCode ?? d.coursecode ?? '').toString() || null;
        const courseName = (d.courseName ?? d.course_name ?? d.coursename ?? d.course ?? d.courseName ?? '').toString() || null;

        const counsellingType =
            (d.counsellingType ?? d.counselling_type ?? d['counselling type'] ?? d.counselling ?? '').toString() || null;
        const seatType =
            (d.seatType ?? d.seat_type ?? d['seat type'] ?? d.seat ?? '').toString() || null;
        const categoryValue = (d.category ?? d.Category ?? '').toString() || null;

        const totalSeats =
            (typeof d.totalSeats === 'number' ? d.totalSeats : (typeof d.totalIntake === 'number' ? d.totalIntake : (typeof d.totalSeats === 'string' ? Number(d.totalSeats) : (typeof d.totalIntake === 'string' ? Number(d.totalIntake) : null))));
        const availableSeats =
            (typeof d.availableSeats === 'number' ? d.availableSeats : (typeof d.govtSeats === 'number' ? d.govtSeats : (typeof d.availableSeats === 'string' ? Number(d.availableSeats) : (typeof d.govtSeats === 'string' ? Number(d.govtSeats) : null))));

        return {
            academicYear,
            courseId,
            courseName,
            counsellingType,
            seatType,
            category: categoryValue,
            totalSeats: Number.isFinite(totalSeats as any) ? (totalSeats as number) : null,
            availableSeats: Number.isFinite(availableSeats as any) ? (availableSeats as number) : null,
            // Common breakdown fields (best-effort)
            hk: typeof d.hk === 'number' ? d.hk : (typeof d.hk === 'string' ? Number(d.hk) : null),
            rk: typeof d.rk === 'number' ? d.rk : (typeof d.rk === 'string' ? Number(d.rk) : null),
            govt: typeof d.govt === 'number' ? d.govt : (typeof d.govt === 'string' ? Number(d.govt) : null),
            management: typeof d.management === 'number' ? d.management : (typeof d.management === 'string' ? Number(d.management) : null),
            nri: typeof d.nri === 'number' ? d.nri : (typeof d.nri === 'string' ? Number(d.nri) : null),
            ph: typeof d.ph === 'number' ? d.ph : (typeof d.ph === 'string' ? Number(d.ph) : null),
            spl: typeof d.spl === 'number' ? d.spl : (typeof d.spl === 'string' ? Number(d.spl) : null),
            snq: typeof d.snq === 'number' ? d.snq : (typeof d.snq === 'string' ? Number(d.snq) : null),
            raw: d,
        };
    });

    const years = normalizedSeatRows.map((r) => r.academicYear).filter((y): y is number => typeof y === 'number');
    const latestSeatYear = years.length ? Math.max(...years) : null;
    const seatRowsLatest = latestSeatYear ? normalizedSeatRows.filter((r) => r.academicYear === latestSeatYear) : normalizedSeatRows;

    const courseMap = new Map<string, any>();
    for (const r of seatRowsLatest) {
        const key = (r.courseId || r.courseName || '').toString();
        if (!key) continue;
        const cur = courseMap.get(key) || { courseId: r.courseId, courseName: r.courseName, rows: [] as any[] };
        cur.rows.push(r);
        courseMap.set(key, cur);
    }

    const seatMatrixSummary = {
        latestYear: latestSeatYear,
        ugCoursesCount: courseMap.size,
        courses: Array.from(courseMap.values()).sort((a, b) => String(a.courseName || a.courseId).localeCompare(String(b.courseName || b.courseId))),
    };


    let trendSeries: Array<{ year: number; round: number; closingRank: number }> = [];
    let trendByYear: Array<{ year: number; round1ClosingRank?: number; round2ClosingRank?: number }> = [];
    let trendSummary: any = null;

    if (branchCode) {
        const courseCandidates = new Set([
            branchCode,
            branchCode.toUpperCase(),
            branchCode.toLowerCase(),
        ]);

        const rows = [...docsR1, ...docsR2, ...docsHk].filter((d: any) => {
            const course =
                (d.courseId ?? d.course_code ?? d.courseCode ?? d.coursecode ?? '').toString();
            if (!course || !courseCandidates.has(course) && !courseCandidates.has(course.toUpperCase())) return false;

            if (category) {
                const cat = (d.category ?? '').toString();
                if (cat !== category) return false;
            }
            return true;
        });

        trendSeries = rows
            .map((r) => normalizeCutoffRow(r))
            .filter((r) => r.year !== null && r.round !== null && r.closingRank !== null)
            .map((r) => ({ year: r.year as number, round: r.round as number, closingRank: r.closingRank as number }))
            .sort((a, b) => (a.year - b.year) || (a.round - b.round));

        const byYearMap = new Map<number, { year: number; round1ClosingRank?: number; round2ClosingRank?: number }>();
        for (const p of trendSeries) {
            const row = byYearMap.get(p.year) || { year: p.year };
            if (p.round === 1) row.round1ClosingRank = p.closingRank;
            if (p.round === 2) row.round2ClosingRank = p.closingRank;
            byYearMap.set(p.year, row);
        }
        trendByYear = Array.from(byYearMap.values()).sort((a, b) => a.year - b.year);

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
            seatMatrix: seatMatrixSummary,
            trend: {
                branchCode: branchCode || null,
                category: category || null,
                series: trendSeries,
                byYear: trendByYear,
                summary: trendSummary,
            },
        },
    };
}

export async function getEligibleCutoffs(args: {
    collegeCode: string;
    branchCode: string;
    baseCategory: string;
    hasKannada: boolean;
    hasRural: boolean;
    hasHK: boolean;
}) {
    const collegeCode = args.collegeCode;
    const branchCode = args.branchCode;

    const lists = buildEligibleCategoryLists({
        baseCategory: args.baseCategory,
        hasKannada: args.hasKannada,
        hasRural: args.hasRural,
        hasHK: args.hasHK,
    });

    const collegeKeyCandidates = ['collegeCode', 'college_code', 'collegecode'];
    const docsR1 = await listByAnyKey({ collectionId: config.collections.r1Cutoffs, keyCandidates: collegeKeyCandidates, value: collegeCode });
    const docsR2 = await listByAnyKey({ collectionId: config.collections.r2Cutoffs, keyCandidates: collegeKeyCandidates, value: collegeCode });
    const docsHk = await listByAnyKey({ collectionId: config.collections.r1r2Hk, keyCandidates: collegeKeyCandidates, value: collegeCode });

    const all = [...docsR1, ...docsR2, ...docsHk];

    const courseCandidates = new Set([branchCode, branchCode.toUpperCase(), branchCode.toLowerCase()]);

    const filtered = all.filter((d: any) => {
        const course = (d.courseId ?? d.course_code ?? d.courseCode ?? d.coursecode ?? '').toString();
        if (!course) return false;
        return courseCandidates.has(course) || courseCandidates.has(course.toUpperCase());
    });

    const perCategory = new Map<string, any[]>();
    for (const d of filtered) {
        const cat = (d.category ?? '').toString();
        if (!cat) continue;
        const arr = perCategory.get(cat) || [];
        arr.push(d);
        perCategory.set(cat, arr);
    }

    function buildList(categoryList: string[]) {
        return categoryList.map((cat) => {
            const docs = perCategory.get(cat) || [];
            const latest = summarizeLatestYearRound1Round2(docs);
            return {
                category: cat,
                year: latest.year,
                round1ClosingRank: latest.round1ClosingRank ?? null,
                round2ClosingRank: latest.round2ClosingRank ?? null,
            };
        });
    }

    return {
        success: true,
        data: {
            branchCode,
            baseCategory: normalizeBaseCategoryToCutoffCategory(args.baseCategory),
            flags: { hasKannada: args.hasKannada, hasRural: args.hasRural, hasHK: args.hasHK },
            eligibleCategories: lists.eligibleCategories,
            list1: buildList(lists.list1),
            list2: buildList(lists.list2),
        },
    };
}
