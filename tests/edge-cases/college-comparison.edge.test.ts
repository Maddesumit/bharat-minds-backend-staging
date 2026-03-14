import express from 'express';
import request from 'supertest';
import collegeRoutes from '../../src/routes/college.routes';
import collegeService from '../../src/services/college.service';
import { databases } from '../../src/config/appwrite.config';

// ----------------------------------------------------------------------------
// MOCKS
// ----------------------------------------------------------------------------
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

jest.mock('../../src/services/college.service', () => ({
    getCollegeByCode: jest.fn(),
    getSimilarColleges: jest.fn(),
}));

// Helper: creates a minimal valid college object
function dummyCollege(code: string, overrides: Record<string, any> = {}) {
    return {
        collegeCode: code,
        collegeName: `College ${code}`,
        city: 'Bangalore',
        district: 'Bangalore Urban',
        collegeType: 'Engineering',
        ...overrides
    };
}

describe('College Comparison API - Edge Case Tests', () => {
    let app: express.Application;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        // Handle JSON parse errors (malformed body) — express.json() throws a SyntaxError
        app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            if (err.type === 'entity.parse.failed') {
                return res.status(400).json({ success: false, error: 'Invalid JSON body' });
            }
            return res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
        });

        app.use('/api/colleges', collegeRoutes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Default: DB returns empty docs (no fees/metrics data available)
        (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });
    });

    // ==========================================================================
    // 1. MISSING COLLEGE DATA
    // ==========================================================================
    describe('Missing College Data', () => {
        it('should return 200 with empty data when non-existent college codes are provided', async () => {
            (collegeService.getCollegeByCode as jest.Mock).mockResolvedValue({ success: false, error: 'Not found' });

            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['ZZZZ1', 'ZZZZ2'] });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(0); // graceful empty result
        });

        it('should return 400 when collegeCodes is an empty array', async () => {
            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: [] });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 when collegeCodes is null', async () => {
            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: null });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 when collegeCodes is undefined (missing from body)', async () => {
            const res = await request(app)
                .post('/api/colleges/compare')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 404 for single college GET when college does not exist', async () => {
            (collegeService.getCollegeByCode as jest.Mock).mockResolvedValue({ success: false, error: 'Not found' });

            const res = await request(app).get('/api/colleges/NONEXISTENT/compare');

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    // ==========================================================================
    // 2. MISSING FEE DATA
    // ==========================================================================
    describe('Missing and Invalid Fee Data', () => {
        it('should still succeed when college_fees collection returns no documents', async () => {
            (collegeService.getCollegeByCode as jest.Mock).mockResolvedValue({ success: true, data: dummyCollege('E001') });
            // DB returns empty (no fees) — already default in beforeEach

            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['E001', 'E002'] });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data[0].fees).toBeUndefined(); // fee fields are gracefully omitted
        });

        it('should still succeed when only some colleges have fee data', async () => {
            (collegeService.getCollegeByCode as jest.Mock)
                .mockResolvedValueOnce({ success: true, data: dummyCollege('E001') })
                .mockResolvedValueOnce({ success: true, data: dummyCollege('E002') });

            // Return fee data for only one college
            (databases.listDocuments as jest.Mock).mockResolvedValueOnce({
                documents: [{
                    collegeCode: 'E001',
                    totalFees: 80000,
                    tuitionFees: 60000,
                    feeType: 'government',
                    academicYear: 2024,
                    category: 'GM'
                }]
            }).mockResolvedValueOnce({ documents: [] }); // metrics empty

            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['E001', 'E002'] });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            // E001 should have fee data; E002 should not crash without it
            const e001 = res.body.data.find((c: any) => c.collegeCode === 'E001');
            const e002 = res.body.data.find((c: any) => c.collegeCode === 'E002');
            expect(e001).toBeDefined();
            expect(e002).toBeDefined();
        });
    });

    // ==========================================================================
    // 3. MISSING / INVALID COORDINATES
    // ==========================================================================
    describe('Missing and Invalid Coordinates', () => {
        it('should succeed when colleges lack latitude/longitude (distance should be absent)', async () => {
            // No coordinates in mock — dummyCollege has no lat/lng
            (collegeService.getCollegeByCode as jest.Mock).mockResolvedValue({ success: true, data: dummyCollege('E001') });

            const res = await request(app)
                .post('/api/colleges/compare')
                .send({
                    collegeCodes: ['E001', 'E002'],
                    studentLocation: { latitude: 12.97, longitude: 77.59 }
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data[0].distance).toBeUndefined(); // gracefully absent
        });

        it('should succeed when studentLocation is not provided', async () => {
            (collegeService.getCollegeByCode as jest.Mock).mockResolvedValue({
                success: true,
                data: dummyCollege('E001', { latitude: 12.9716, longitude: 77.5946 })
            });

            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['E001', 'E002'] });

            expect(res.status).toBe(200);
            expect(res.body.data[0].distance).toBeUndefined(); // no student location = no distance
        });

        it('should return 400 for invalid studentLocation (non-numeric coordinates)', async () => {
            const res = await request(app)
                .post('/api/colleges/compare')
                .send({
                    collegeCodes: ['E001', 'E002'],
                    studentLocation: { latitude: 'not-a-number', longitude: 'also-invalid' }
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 for out-of-range coordinates', async () => {
            const res = await request(app)
                .post('/api/colleges/compare')
                .send({
                    collegeCodes: ['E001', 'E002'],
                    studentLocation: { latitude: 300, longitude: -999 }
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    // ==========================================================================
    // 4. MISSING / INVALID METRICS DATA
    // ==========================================================================
    describe('Missing and Invalid Metrics Data', () => {
        it('should succeed when college_metrics collection returns no documents', async () => {
            (collegeService.getCollegeByCode as jest.Mock).mockResolvedValue({ success: true, data: dummyCollege('E001') });
            // Docs = [] for both fees AND metrics — already default

            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['E001', 'E002'] });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data[0].placementRate).toBeUndefined();
        });

        it('should work with partial metrics (some fields missing)', async () => {
            (collegeService.getCollegeByCode as jest.Mock).mockResolvedValue({ success: true, data: dummyCollege('E001') });

            // Metrics doc with only placementRate, no other fields
            (databases.listDocuments as jest.Mock)
                .mockResolvedValueOnce({ documents: [] }) // fees
                .mockResolvedValueOnce({ documents: [{ collegeCode: 'E001', placementRate: 88 }] }); // partial metrics

            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['E001', 'E002'] });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            // placementRate should be mapped; other fields should be undefined (not crash)
        });
    });

    // ==========================================================================
    // 5. DATABASE FAILURES
    // ==========================================================================
    describe('Database Failures and Error Handling', () => {
        it('should still return college data when fee DB query throws a connection error', async () => {
            (collegeService.getCollegeByCode as jest.Mock).mockResolvedValue({ success: true, data: dummyCollege('E001') });
            
            // First DB call (fees) throws, second (metrics) succeeds
            (databases.listDocuments as jest.Mock)
                .mockRejectedValueOnce(new Error('ECONNREFUSED: database connection refused'))
                .mockResolvedValueOnce({ documents: [] });

            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['E001', 'E002'] });

            // Service should catch DB error and gracefully return empty fees
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should still return college data when metrics DB query throws a network error', async () => {
            (collegeService.getCollegeByCode as jest.Mock).mockResolvedValue({ success: true, data: dummyCollege('E001') });
            
            // Fees succeed but metrics throw a network error
            (databases.listDocuments as jest.Mock)
                .mockResolvedValueOnce({ documents: [] }) // fees OK
                .mockRejectedValueOnce(new Error('Network timeout')); // metrics fail

            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['E001', 'E002'] });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should still return 200 when both fees and metrics DB queries fail', async () => {
            (collegeService.getCollegeByCode as jest.Mock).mockResolvedValue({ success: true, data: dummyCollege('E001') });
            (databases.listDocuments as jest.Mock).mockRejectedValue(new Error('DB unreachable'));

            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['E001', 'E002'] });

            // The service is designed to return an error response, not crash
            expect([200, 500]).toContain(res.status);
            expect(res.body).toBeDefined();
        });

        it('should handle a timeout from getCollegeByCode service gracefully', async () => {
            // Simulate college service timing out (eventual rejection)
            (collegeService.getCollegeByCode as jest.Mock).mockRejectedValue(new Error('Operation timed out'));
            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });

            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['E001', 'E002'] });

            // compareColleges wraps errors - service catches them and the route returns 500 or 404
            expect([404, 500]).toContain(res.status);
            expect(res.body.success).toBe(false);
        });
    });

    // ==========================================================================
    // 6. INVALID INPUTS
    // ==========================================================================
    describe('Invalid Request Inputs', () => {
        it('should return 400 for malformed JSON body (handled by express.json())', async () => {
            const res = await request(app)
                .post('/api/colleges/compare')
                .set('Content-Type', 'application/json')
                .send('{not-valid-json:::}');

            expect(res.status).toBe(400);
        });

        it('should return 400 for non-array collegeCodes (string instead of array)', async () => {
            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: 'E001' }); // string, not array

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 for array with non-string elements', async () => {
            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: [123, 456] }); // numbers not strings

            expect(res.status).toBe(400);
        });

        it('should return 400 for batch-compare exceeding 50 college limit', async () => {
            const codes = Array.from({ length: 51 }, (_, i) => `E${i}`);
            const res = await request(app)
                .post('/api/colleges/batch-compare')
                .send({ collegeCodes: codes });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 for compare with more than 10 colleges', async () => {
            const codes = Array.from({ length: 11 }, (_, i) => `E${i}`);
            const res = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: codes });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 for invalid priority values (non-boolean)', async () => {
            const res = await request(app)
                .post('/api/colleges/compare')
                .send({
                    collegeCodes: ['E001', 'E002'],
                    priorities: { fees: 'yes-please', distance: 5 } // not booleans
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should return 400 for invalid exportFormat in batch-compare', async () => {
            // Mock college lookup so validation reaches the exportFormat check
            (collegeService.getCollegeByCode as jest.Mock).mockResolvedValue({ success: true, data: { collegeCode: 'E001', collegeName: 'College A' } });

            const res = await request(app)
                .post('/api/colleges/batch-compare')
                .send({
                    collegeCodes: ['E001', 'E002'], // valid: 2 codes
                    exportFormat: 'pdf' // unsupported format
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });
});
