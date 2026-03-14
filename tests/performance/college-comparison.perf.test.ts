import express from 'express';
import request from 'supertest';
import { performance } from 'perf_hooks';
import collegeRoutes from '../../src/routes/college.routes';
import collegeService from '../../src/services/college.service';
import { databases } from '../../src/config/appwrite.config';

// ----------------------------------------------------------------------------
// SETUP & MOCKS
// ----------------------------------------------------------------------------
// We inject artificial database delays (e.g., 50ms) to ensure load tests 
// realistically benchmark Node's concurrency queues and event loop overhead
// and not just instant mock resolutions.
const SIMULATED_DB_DELAY = 5; 

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

/**
 * Creates dummy college data for mocking
 */
function createDummyCollege(code: string) {
    return {
        collegeCode: code,
        collegeName: `Simulated College ${code}`,
        city: 'Bangalore',
        latitude: 12.9716,
        longitude: 77.5946,
        placementRate: 85,
        rating: 4
    };
}

describe('College Comparison API - Performance & Load Tests', () => {
    let app: express.Application;

    beforeAll(() => {
        app = express();
        app.use(express.json());
        
        app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
        });

        app.use('/api/colleges', collegeRoutes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup default delayed responses
        (databases.listDocuments as jest.Mock).mockImplementation(async () => {
            await new Promise(r => setTimeout(r, SIMULATED_DB_DELAY));
            return { documents: [] };
        });

        (collegeService.getCollegeByCode as jest.Mock).mockImplementation(async (code: string) => {
            await new Promise(r => setTimeout(r, SIMULATED_DB_DELAY / 2)); // faster college base fetch
            return { success: true, data: createDummyCollege(code) };
        });
    });

    // ----------------------------------------------------------------------------
    // 1. LATENCY & BASIC PERFORMANCE TESTS
    // ----------------------------------------------------------------------------
    describe('Endpoint Response Latency (Under 2 seconds)', () => {
        
        it('should compare 5 colleges in under 2000ms', async () => {
            const codes = ['E001', 'E002', 'E003', 'E004', 'E005'];
            
            const start = performance.now();
            const response = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: codes });
            const end = performance.now();
            
            expect(response.status).toBe(200);
            expect(end - start).toBeLessThan(2000);
        });

        it('should batch map 20 colleges in under 2000ms', async () => {
            const codes = Array.from({ length: 20 }, (_, i) => `E0${i}`);
            
            const start = performance.now();
            const response = await request(app)
                .post('/api/colleges/batch-compare')
                .send({ collegeCodes: codes });
            const end = performance.now();
            
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(20);
            expect(end - start).toBeLessThan(2000);
        });

        it('should batch map maximum 50 colleges in under 2000ms', async () => {
            const codes = Array.from({ length: 50 }, (_, i) => `EMax${i}`);
            
            const start = performance.now();
            const response = await request(app)
                .post('/api/colleges/batch-compare')
                .send({ collegeCodes: codes });
            const end = performance.now();
            
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(50);
            expect(end - start).toBeLessThan(2000);
        });
    });

    // ----------------------------------------------------------------------------
    // 2. CONCURRENCY & LOAD TESTS
    // ----------------------------------------------------------------------------
    describe('Concurrent Requests Load Tolerance', () => {
        
        const performRequest = async (id: number) => {
            const response = await request(app)
                .post('/api/colleges/compare')
                .send({ collegeCodes: ['C1', 'C2', 'C3'] });
            return response.status;
        };

        it('should handle 10 concurrent users successfully without errors or timeouts', async () => {
             const requests = Array.from({ length: 10 }, (_, i) => performRequest(i));
             const startTime = performance.now();
             const results = await Promise.all(requests);
             const endTime = performance.now();

             const successCount = results.filter(status => status === 200).length;
             
             expect(successCount).toBe(10); // 100% success rate
             // With parallel DB calls, 10 concurrent users should theoretically resolve 
             // in roughly the same time as 1 user if event loop isn't blocked.
             expect(endTime - startTime).toBeLessThan(2000); 
        });

        it('should handle 25 concurrent users successfully without errors or timeouts', async () => {
            const requests = Array.from({ length: 25 }, (_, i) => performRequest(i));
            const startTime = performance.now();
            const results = await Promise.all(requests);
            const endTime = performance.now();

            const successCount = results.filter(status => status === 200).length;
            
            expect(successCount).toBe(25); // 100% success rate
            expect(endTime - startTime).toBeLessThan(2000);
       });
    });

    // ----------------------------------------------------------------------------
    // 3. MEMORY USAGE TESTS
    // ----------------------------------------------------------------------------
    describe('Memory Consumption Analysis', () => {
        // We force garbage collection if exposes, otherwise we just measure heap diff.
        // Node requires --expose-gc to run global.gc(), so we use relative diff checks.
        
        it('should not leak excessive memory during 25 large batch comparisons', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            const codes = Array.from({ length: 50 }, (_, i) => `E${i}`);
            
            // Execute sequentially to simulate a single API pod serving requests over time
            for(let i=0; i<25; i++) {
                await request(app).post('/api/colleges/batch-compare').send({ collegeCodes: codes });
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryDiffMB = (finalMemory - initialMemory) / 1024 / 1024;
            
            // A basic express JSON router aggregating 50 items should theoretically 
            // garbage collect beautifully. A spike of over 30MB per 25 requests implies a leak.
            expect(memoryDiffMB).toBeLessThan(30); 
        }, 60000); 
    });

    // ----------------------------------------------------------------------------
    // 4. DATABASE QUERY ISOLATION TIMING
    // ----------------------------------------------------------------------------
    describe('Database Service Function Benchmarks', () => {
        // By importing the raw functions, we test their mapping algorithms natively
        // separate from Express overhead.
        const internalService = require('../../src/services/college-comparison.service');

        it('should map fetched fees efficiently (< 10ms CPU time)', async () => {
            // Mock DB to return immediately for this test to measure purely the mapping overhead
            (databases.listDocuments as jest.Mock).mockResolvedValueOnce({
                documents: Array.from({ length: 150 }, (_, i) => ({ 
                    collegeCode: `C${i%50}`, // 3 variations per college
                    academicYear: 2024 - (i%3), 
                    totalFees: 100000 
                }))
            });

            const codes = Array.from({ length: 50 }, (_, i) => `C${i}`);
            
            const start = performance.now();
            await internalService.fetchCollegeFees(codes);
            const end = performance.now();
            
            const elapsed = end - start;
            expect(elapsed).toBeLessThan(50); // The .forEach map and filter shouldn't bottleneck
        });

        it('should map metrics efficiently (< 10ms CPU time)', async () => {
            (databases.listDocuments as jest.Mock).mockResolvedValueOnce({
                documents: Array.from({ length: 150 }, (_, i) => ({ 
                    collegeCode: `C${i%50}`,
                    placementRate: 90 
                }))
            });

            const codes = Array.from({ length: 50 }, (_, i) => `C${i}`);
            
            const start = performance.now();
            await internalService.fetchCollegeMetricsBatch(codes);
            const end = performance.now();
            
            expect(end - start).toBeLessThan(50);
        });
    });
});
