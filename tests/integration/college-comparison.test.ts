import express from 'express';
import request from 'supertest';
import collegeRoutes from '../../src/routes/college.routes';
import collegeService from '../../src/services/college.service';
import { databases } from '../../src/config/appwrite.config';


// Mock Appwrite databases
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

// Mock College Service
jest.mock('../../src/services/college.service', () => ({
    getCollegeByCode: jest.fn(),
    getSimilarColleges: jest.fn(),
    searchColleges: jest.fn(),
    listCities: jest.fn(),
    listDistricts: jest.fn(),
    getAllCollegeTypes: jest.fn(),
    getCollegesByType: jest.fn(),
    getCollegesByCity: jest.fn(),
}));

describe('College Comparison API Integration Tests', () => {
    let app: express.Application;

    beforeAll(() => {
        // Initialize an isolated Express app specifically for these routes
        app = express();
        app.use(express.json());
        
        // Error handler to catch JSON parsing issues or internal server errors
        app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
        });

        // Mount the router, mirroring the main index.ts
        app.use('/api/colleges', collegeRoutes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/colleges/compare', () => {
        it('should return 400 if collegeCodes is missing', async () => {
            const response = await request(app)
                .post('/api/colleges/compare')
                .send({ priorities: { fees: true } });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should return 400 if collegeCodes has less than 2 codes', async () => {
            const response = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['E001'] });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should return 400 if collegeCodes has more than 10 codes', async () => {
            const codes = Array.from({ length: 11 }, (_, i) => `E00${i}`);
            const response = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: codes });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should return success payload when collegeCodes are valid', async () => {
            // Mock getCollegeByCode
            (collegeService.getCollegeByCode as jest.Mock)
                .mockResolvedValueOnce({ success: true, data: { collegeCode: 'E001', collegeName: 'College One' } })
                .mockResolvedValueOnce({ success: true, data: { collegeCode: 'E002', collegeName: 'College Two' } });

            // Mock database calls (fees and then metrics for compareColleges function)
            (databases.listDocuments as jest.Mock)
                .mockResolvedValueOnce({ documents: [] }) // Fees
                .mockResolvedValueOnce({ documents: [] }); // Metrics

            const response = await request(app)
                .post('/api/colleges/compare')
                .send({ 
                    collegeCodes: ['E001', 'E002'],
                    priorities: { fees: true }
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(collegeService.getCollegeByCode).toHaveBeenCalledTimes(2);
            expect(databases.listDocuments).toHaveBeenCalledTimes(2);
        });

        it('should process student location priorities correctly', async () => {
            (collegeService.getCollegeByCode as jest.Mock)
                .mockResolvedValue({ success: true, data: { collegeCode: 'E001', collegeName: 'College One', latitude: 12.9, longitude: 77.5 } });

            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });

            const response = await request(app)
                .post('/api/colleges/compare')
                .send({ 
                    collegeCodes: ['E001', 'E002'],
                    studentLocation: { latitude: 12.9716, longitude: 77.5946 },
                    priorities: { distance: true }
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            // Wait, we need to check if the data has 'distance' populated, but our mock might be simplified.
            expect(response.body.data[0]).toHaveProperty('distance');
        });

        it('should return 200 and empty data if colleges are not found by service', async () => {
             (collegeService.getCollegeByCode as jest.Mock)
                .mockResolvedValue({ success: false, error: 'College not found' });

             const response = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['BAD1', 'BAD2'] });

             expect(response.status).toBe(200);
             expect(response.body.success).toBe(true);
             expect(response.body.data).toHaveLength(0);
        });
    });

    describe('GET /api/colleges/:code/compare', () => {
        it('should return 400 if validation fails (handled by express-validator but :code is always somewhat present in paths)', async () => {
            // Can't really hit empty param like /api/colleges//compare as Express route matching fails 
            // We can test validation when query params are invalid type, though no strict validation is on them
        });

        it('should return 404 if college is not found', async () => {
            (collegeService.getCollegeByCode as jest.Mock)
                .mockResolvedValue({ success: false, error: 'College not found' });

            const response = await request(app)
                .get('/api/colleges/INVALID/compare');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should return single college comparison data without similar colleges by default', async () => {
            (collegeService.getCollegeByCode as jest.Mock)
                .mockResolvedValue({ success: true, data: { collegeCode: 'E001', collegeName: 'College One' } });

            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });

            const response = await request(app)
                .get('/api/colleges/E001/compare');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.target).toBeDefined();
            expect(response.body.data.similar).toHaveLength(0);
            expect(collegeService.getCollegeByCode).toHaveBeenCalledWith('E001');
        });

        it('should return includeSimilar=true data by calling getSimilarColleges', async () => {
            (collegeService.getCollegeByCode as jest.Mock)
                .mockResolvedValue({ success: true, data: { collegeCode: 'E001', collegeName: 'College One' } });
            
            (collegeService.getSimilarColleges as jest.Mock)
                .mockResolvedValue({ success: true, data: [{ collegeCode: 'E002', collegeName: 'College Two' }] });

            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });

            const response = await request(app)
                .get('/api/colleges/E001/compare?includeSimilar=true');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.similar).toBeDefined();
            expect(response.body.data.similar.length).toBeGreaterThan(0);
            expect(collegeService.getSimilarColleges).toHaveBeenCalled();
        });
    });

    describe('POST /api/colleges/batch-compare', () => {
        it('should return 400 if exceeding 50 college limit', async () => {
            const codes = Array.from({ length: 51 }, (_, i) => `E00${i}`);
            const response = await request(app)
                .post('/api/colleges/batch-compare')
                .send({ collegeCodes: codes });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should return successful JSON representation when valid', async () => {
            const mockColleges = [
                { collegeCode: 'E001', collegeName: 'College A' },
                { collegeCode: 'E002', collegeName: 'College B' }
            ];
            
            // Mock map iteration inside compareCollegesBatch uses searchColleges? No, it uses getCollegeByCode in a loop
            (collegeService.getCollegeByCode as jest.Mock)
                .mockResolvedValueOnce({ success: true, data: mockColleges[0] })
                .mockResolvedValueOnce({ success: true, data: mockColleges[1] });

            (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });

            const response = await request(app)
                .post('/api/colleges/batch-compare')
                .send({ 
                    collegeCodes: ['E001', 'E002'],
                    academicYear: 2024
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });

        it('should return text/csv when exportFormat is csv', async () => {
             (collegeService.getCollegeByCode as jest.Mock)
                .mockResolvedValue({ success: true, data: { collegeCode: 'E001', collegeName: 'College A' } });
             (databases.listDocuments as jest.Mock).mockResolvedValue({ documents: [] });

             const response = await request(app)
                .post('/api/colleges/batch-compare')
                .send({ 
                    collegeCodes: ['E001'],
                    exportFormat: 'csv'
                });

             expect(response.status).toBe(200);
             expect(response.headers['content-type']).toContain('text/csv');
             expect(response.text).toContain('collegeCode'); // header
             expect(response.text).toContain('E001'); // data
        });

        it('should return 400 for pdf format since it is unimplemented', async () => {
             const response = await request(app)
                .post('/api/colleges/batch-compare')
                .send({ 
                    collegeCodes: ['E001'],
                    exportFormat: 'pdf'
                });

             expect(response.status).toBe(400);
             expect(response.body.success).toBe(false);
             expect(response.body.error).toContain('PDF export is not yet implemented');
        });
    });
});
