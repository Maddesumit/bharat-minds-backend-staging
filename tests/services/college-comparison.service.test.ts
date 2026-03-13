import * as collegeComparisonService from '../../src/services/college-comparison.service';
import { databases, config } from '../../src/config/appwrite.config';
import collegeService from '../../src/services/college.service';
import { Query } from 'node-appwrite';

// Mock the Appwrite databases
jest.mock('../../src/config/appwrite.config', () => ({
    databases: {
        listDocuments: jest.fn()
    },
    config: {
        databaseId: 'test-db',
        collections: {
            collegeFees: 'test-fees',
            collegeMetrics: 'test-metrics'
        }
    }
}));

// Mock the college service
jest.mock('../../src/services/college.service', () => ({
    getCollegeByCode: jest.fn(),
    getSimilarColleges: jest.fn()
}));

describe('CollegeComparisonService', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateDistance', () => {
        it('should return 0 when coordinates are the same', () => {
            const distance = collegeComparisonService.calculateDistance(12.9716, 77.5946, 12.9716, 77.5946);
            expect(distance).toBe(0);
        });

        it('should calculate correct distance between Bangalore and Mumbai', () => {
            // Approx coords: Bangalore (12.97, 77.59), Mumbai (19.07, 72.87)
            // Expected distance is roughly 840-850km
            const distance = collegeComparisonService.calculateDistance(12.9716, 77.5946, 19.0760, 72.8777);
            expect(distance).toBeGreaterThan(800);
            expect(distance).toBeLessThan(900);
        });

        it('should handle extreme latitude values', () => {
            const distance = collegeComparisonService.calculateDistance(-90, 0, 90, 0);
            expect(distance).toBeCloseTo(20015, 0); // Poles distance
        });
    });

    describe('fetchCollegeFees', () => {
        it('should return empty map if no college codes provided', async () => {
            const result = await collegeComparisonService.fetchCollegeFees([]);
            expect(result.size).toBe(0);
        });

        it('should return fee data for provided colleges', async () => {
            (databases.listDocuments as jest.Mock).mockResolvedValue({
                documents: [
                    {
                        collegeCode: 'E001',
                        tuitionFees: 100000,
                        hostelFees: 50000,
                        totalFees: 150000,
                        academicYear: 2024,
                        category: 'GM'
                    }
                ]
            });

            const result = await collegeComparisonService.fetchCollegeFees(['E001']);
            expect(result.has('E001')).toBe(true);
            expect(result.get('E001')?.totalFees).toBe(150000);
        });

        it('should respect academicYear filter when provided', async () => {
            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });
            await collegeComparisonService.fetchCollegeFees(['E001'], { academicYear: 2023 });
            
            expect(databases.listDocuments).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                expect.arrayContaining([Query.equal('academicYear', 2023)])
            );
        });

        it('should handle database errors gracefully and return empty map', async () => {
            (databases.listDocuments as jest.Mock).mockRejectedValue(new Error('DB Error'));
            const result = await collegeComparisonService.fetchCollegeFees(['E001']);
            expect(result.size).toBe(0);
        });
    });

    describe('fetchCollegeMetricsBatch', () => {
        it('should return metrics for provided colleges', async () => {
            (databases.listDocuments as jest.Mock).mockResolvedValue({
                documents: [
                    {
                        collegeCode: 'E001',
                        academicYear: 2024,
                        placementRate: 95,
                        overallRating: 4.5
                    }
                ]
            });

            const result = await collegeComparisonService.fetchCollegeMetricsBatch(['E001']);
            expect(result.has('E001')).toBe(true);
            expect(result.get('E001')?.placementRate).toBe(95);
        });

        it('should return empty map on database failure', async () => {
            (databases.listDocuments as jest.Mock).mockRejectedValue(new Error('Metrics Error'));
            const result = await collegeComparisonService.fetchCollegeMetricsBatch(['E001']);
            expect(result.size).toBe(0);
        });
    });

    describe('calculateComparisonScore', () => {
        const mockComparison: any = {
            fees: 100000,
            distance: 100,
            placementRate: 80,
            overallRating: 4
        };

        const mockCriteria: any = {
            priorities: {
                fees: false,
                distance: false,
                placement: false,
                rating: false
            }
        };

        const minMax = {
            maxFees: 200000,
            maxDist: 200
        };

        it('should calculate a base score when no priorities are set', () => {
            const score = collegeComparisonService.calculateComparisonScore(mockComparison, mockCriteria, minMax);
            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should increase weight of fees when prioritized', () => {
            const prioritizedCriteria = { ...mockCriteria, priorities: { fees: true } };
            const score = collegeComparisonService.calculateComparisonScore(mockComparison, prioritizedCriteria, minMax);
            expect(score).toBeDefined();
        });

        it('should handle missing data by only scoring available fields', () => {
            const partialComparison: any = { fees: 100000 };
            const score = collegeComparisonService.calculateComparisonScore(partialComparison, mockCriteria, minMax);
            expect(score).toBe(50); // (1 - 100k/200k) * 100% normalized
        });

        it('should return 0 if no data is available', () => {
            const emptyComparison: any = {};
            const score = collegeComparisonService.calculateComparisonScore(emptyComparison, mockCriteria, minMax);
            expect(score).toBe(0);
        });
    });

    describe('compareColleges', () => {
        it('should throw error if no college codes provided', async () => {
            const result = await collegeComparisonService.compareColleges({ collegeCodes: [] });
            expect(result.success).toBe(false);
            expect(result.error).toBe('No college codes provided for comparison');
        });

        it('should successfully compare multiple colleges', async () => {
            // Mock fee fetching
            (databases.listDocuments as jest.Mock)
                .mockResolvedValueOnce({ // fees
                    documents: [{ collegeCode: 'E001', totalFees: 100000 }, { collegeCode: 'E002', totalFees: 150000 }]
                })
                .mockResolvedValueOnce({ // metrics
                    documents: [{ collegeCode: 'E001', placementRate: 90 }, { collegeCode: 'E002', placementRate: 80 }]
                });

            // Mock college service
            (collegeService.getCollegeByCode as jest.Mock)
                .mockResolvedValueOnce({ success: true, data: { collegeCode: 'E001', collegeName: 'College A' } })
                .mockResolvedValueOnce({ success: true, data: { collegeCode: 'E002', collegeName: 'College B' } });

            const result = await collegeComparisonService.compareColleges({ collegeCodes: ['E001', 'E002'] });
            
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.data?.[0].collegeCode).toBe('E001'); // Better due to lower fees/higher placement
        });

        it('should include distance calculation when student location is provided', async () => {
             // Mock fee/metrics empty for simplicity
            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });

            // Mock college with location
            (collegeService.getCollegeByCode as jest.Mock).mockResolvedValue({ 
                success: true, 
                data: { 
                    collegeCode: 'E001', 
                    latitude: 12.9716, 
                    longitude: 77.5946 
                } 
            });

            const result = await collegeComparisonService.compareColleges({ 
                collegeCodes: ['E001'],
                studentLocation: { latitude: 12.9716, longitude: 77.5946 }
            });

            expect(result.data?.[0].distance).toBe(0);
        });
    });
});
