/// <reference types="jest" />
import request from 'supertest';
import express from 'express';
import collegeRouter from '../../src/routes/college.routes';
import * as collegeService from '../../src/services/college.service';
import { databases } from '../../src/config/appwrite.config';
import { CollegeType } from '../../src/types/domain.types';

/**
 * Integration tests for the extended features of the College Comparison Service:
 * - College Type Preference (Government, Aided, Private)
 * - Establishment Year Preference (Newest, Oldest)
 */

// Mock the services and database
jest.mock('../../src/services/college.service');
jest.mock('../../src/config/appwrite.config', () => ({
    databases: {
        listDocuments: jest.fn()
    },
    config: {
        databaseId: 'test-db',
        collections: {
            collegesInfo: 'colleges_info',
            collegeFees: 'college_fees',
            collegeMetrics: 'college_metrics'
        }
    }
}));

// Explicitly type the mocks to satisfy TypeScript in all environments
const mockGetCollegeByCode = collegeService.getCollegeByCode as jest.Mock;
const mockListDocuments = databases.listDocuments as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/colleges', collegeRouter);

/**
 * Creates a dummy college object for testing
 */
const dummyCollege = (code: string, overrides: Record<string, any> = {}) => ({
    $id: `id-${code}`,
    collegeCode: code,
    collegeName: `College ${code}`,
    collegeType: CollegeType.VTU_PRIVATE,
    city: 'Bangalore',
    district: 'Bangalore Urban',
    established: 2000,
    counsellingTypes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
});

describe('College Comparison Extended Features', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should favor Government colleges when collegeTypePreference is set to government', async () => {
        // Mock two colleges: one Govt, one Private
        mockGetCollegeByCode
            .mockResolvedValueOnce({ 
                success: true, 
                data: dummyCollege('E001', { collegeType: CollegeType.GOVERNMENT, established: 2000 }) 
            })
            .mockResolvedValueOnce({ 
                success: true, 
                data: dummyCollege('E002', { collegeType: CollegeType.VTU_PRIVATE, established: 2000 }) 
            });
        
        // Mock empty fees and metrics
        mockListDocuments.mockResolvedValue({ documents: [], total: 0 });

        const res = await request(app)
            .post('/api/colleges/compare')
            .send({
                collegeCodes: ['E001', 'E002'],
                collegeTypePreference: 'government'
            });

        expect(res.status).toBe(200);
        expect(res.body.data[0].collegeCode).toBe('E001'); // E001 (Govt) should be first
        expect(res.body.data[0].typeScore).toBe(100); 
        expect(res.body.data[1].typeScore).toBe(20);  
    });

    it('should favor newer colleges when establishmentYearPreference is newest', async () => {
        // Mock two colleges: one New (2020), one Old (2000)
        mockGetCollegeByCode
            .mockResolvedValueOnce({ 
                success: true, 
                data: dummyCollege('E001', { established: 2020 }) 
            })
            .mockResolvedValueOnce({ 
                success: true, 
                data: dummyCollege('E002', { established: 2000 }) 
            });
        
        mockListDocuments.mockResolvedValue({ documents: [], total: 0 });

        const res = await request(app)
            .post('/api/colleges/compare')
            .send({
                collegeCodes: ['E001', 'E002'],
                establishmentYearPreference: 'newest'
            });

        expect(res.status).toBe(200);
        expect(res.body.data[0].collegeCode).toBe('E001'); // E001 (Newer) should be first
        expect(res.body.data[0].yearScore).toBeGreaterThan(res.body.data[1].yearScore || 0);
    });

    it('should favor older colleges when establishmentYearPreference is oldest', async () => {
        // Mock two colleges: one New (2020), one Old (1980)
        mockGetCollegeByCode
            .mockResolvedValueOnce({ 
                success: true, 
                data: dummyCollege('E001', { established: 2020 }) 
            })
            .mockResolvedValueOnce({ 
                success: true, 
                data: dummyCollege('E002', { established: 1980 }) 
            });
        
        mockListDocuments.mockResolvedValue({ documents: [], total: 0 });

        const res = await request(app)
            .post('/api/colleges/compare')
            .send({
                collegeCodes: ['E001', 'E002'],
                establishmentYearPreference: 'oldest'
            });

        expect(res.status).toBe(200);
        expect(res.body.data[0].collegeCode).toBe('E002'); // E002 (Older) should be first
        expect(res.body.data[0].yearScore).toBeGreaterThan(res.body.data[1].yearScore || 0);
    });
});
