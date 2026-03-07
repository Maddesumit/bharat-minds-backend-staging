export function normalizeEngineeringStudentDocument(input: any, createdAtIso?: string) {
    const userId = String(input.userId || input.id || '').trim();
    const name = String(input.name || '').trim();
    const mobile = String(input.mobile || input.phone || '').trim();
    const email = String(input.email || '').trim();

    const baseCategory = String(input.baseCategory || '').trim();
    const hasKannada = Boolean(input.hasKannada);
    const hasRural = Boolean(input.hasRural);
    const hasHK = Boolean(input.hasHK);

    // Engineering-only persistence
    const counsellingTypes = ['UGCET'];
    const ugcetCourses = ['Engineering (BE/B.Tech)'];

    const courseRanks = Array.isArray(input.courseRanks) ? input.courseRanks : [];
    const eligibleCategories = Array.isArray(input.eligibleCategories) ? input.eligibleCategories : [];
    const specialCategories = Array.isArray(input.specialCategories) ? input.specialCategories : [];

    const snqApplied = Boolean(input.snqApplied);
    const incomeSlab = snqApplied ? String(input.incomeSlab || '').trim() : '';

    const preferredLocations = Array.isArray(input.preferredLocations) ? input.preferredLocations : [];
    const preferredCollegeTypes = Array.isArray(input.preferredCollegeTypes) ? input.preferredCollegeTypes : [];
    const preferredColleges = Array.isArray(input.preferredColleges) ? input.preferredColleges : [];

    return {
        userId,
        payload: {
            userId,
            name,
            mobile,
            email,
            counsellingTypes: JSON.stringify(counsellingTypes),
            ugcetCourses: JSON.stringify(ugcetCourses),
            farmScienceCourses: JSON.stringify([]),
            ugneetCourses: JSON.stringify([]),
            ugneetSpecialCategories: JSON.stringify([]),
            neetAIR: 0,
            courseRanks: JSON.stringify(courseRanks),
            baseCategory,
            hasKannada,
            hasRural,
            hasHK,
            snqApplied,
            incomeSlab,
            eligibleCategories: JSON.stringify(eligibleCategories),
            specialCategories: JSON.stringify(specialCategories),
            preferredLocations: JSON.stringify(preferredLocations),
            preferredCollegeTypes: JSON.stringify(preferredCollegeTypes),
            preferredColleges: JSON.stringify(preferredColleges),
            createdAt: createdAtIso || new Date().toISOString(),
        },
    };
}
