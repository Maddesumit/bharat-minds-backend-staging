import './config/dns.config'; // Must be the first import to apply DNS settings before other modules
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { validateConnection } from './config/appwrite.config';
import { Query } from 'node-appwrite';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import ranksRoutes from './routes/ranks.routes';
import studentRankRoutes from './routes/student-rank.routes';
import collegeRoutes from './routes/college.routes';
import courseRoutes from './routes/course.routes';
import preferenceRoutes from './routes/preferences.routes';
import optionGeneratorRoutes from './routes/option-generator.routes';
import recommendationsRoutes from './routes/recommendations.routes';
import studentsRoutes from './routes/students.routes';
import optionEntryGeneratorRoutes from './routes/option-entry-generator.routes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'BHARAT MINDS - Option Entry Generator API',
        version: '1.0.0',
    });
});

// BHARAT MINDS API routes
app.use('/api/users', userRoutes);
app.use('/api/ranks', ranksRoutes);
app.use('/api/student-ranks', studentRankRoutes);
app.use('/api/colleges', collegeRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/options', optionGeneratorRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/option-entry-generator', optionEntryGeneratorRoutes);

// Legacy routes (backward compatibility)
app.use('/api/auth', authRoutes);

// Root endpoint with API documentation
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        message: 'BHARAT MINDS - Option Entry Generator API',
        version: '1.0.0',
        description: 'Karnataka CET/NEET Career Counselling Platform Backend',
        endpoints: {
            health: '/health',
            users: {
                base: '/api/users',
                register: 'POST /api/users/register',
                getProfile: 'GET /api/users/profile/:userId',
                updateProfile: 'PUT /api/users/profile/:userId',
                calculateEligibility: 'POST /api/users/calculate-eligibility',
            },
            ranks: {
                base: '/api/ranks',
                addRank: 'POST /api/ranks',
                getRanks: 'GET /api/ranks/:userId',
                deleteRank: 'DELETE /api/ranks/:userId/:counsellingType/:courseType',
            },
            colleges: {
                base: '/api/colleges',
                search: 'GET /api/colleges?...filters',
                getByCode: 'GET /api/colleges/:code',
                listCities: 'GET /api/colleges/cities/list',
                listTypes: 'GET /api/colleges/types/list',
            },
            courses: {
                base: '/api/courses',
                getByCollege: 'GET /api/courses/college/:collegeId',
                search: 'GET /api/courses/search?...filters',
                seatTypes: 'GET /api/courses/seat-types/{ugcet|ugneet}',
                courseTypes: 'GET /api/courses/course-types/{ugcet|ugneet}',
            },
            preferences: {
                base: '/api/preferences',
                add: 'POST /api/preferences',
                bulkAdd: 'POST /api/preferences/bulk',
                get: 'GET /api/preferences/:userId/:counsellingType',
                remove: 'DELETE /api/preferences/:userId/:counsellingType/:priority',
                reorder: 'PUT /api/preferences/reorder',
                lock: 'POST /api/preferences/lock',
                unlock: 'POST /api/preferences/unlock',
            },
            options: {
                base: '/api/options',
                courseCategories: 'GET /api/options/course-categories/:counsellingType',
                engineeringBranches: 'GET /api/options/engineering-branches',
                saveRank: 'POST /api/options/ranks',
                getRanks: 'GET /api/options/ranks/:userId',
                generate: 'POST /api/options/generate/:userId',
                requiresDualRanks: 'GET /api/options/requires-dual-ranks/:courseCategory',
            },
        },
        documentation: 'See SERVICES_COMPLETE.md and IMPLEMENTATION_STATUS.md',
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path,
    });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
    try {
        // Validate Appwrite connection
        console.log('Validating Appwrite connection...');
        const isConnected = await validateConnection();

        if (!isConnected) {
            console.error(' Failed to connect to Appwrite');
            console.error('Please check your environment variables');
            process.exit(1);
        }

        console.log(' Appwrite connection validated');

        // Test actual connectivity
        try {
            console.log(' Testing Read Connectivity...');
            const { databases, config } = await import('./config/appwrite.config');
            await databases.listDocuments(config.databaseId, config.collections.collegesInfo, [Query.limit(1)]);
            console.log(' ✅ Read Connectivity Successful');
        } catch (err: any) {
            console.error(' ❌ Read Connectivity Failed:', err.message);
        }

        // Start server
        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(50));
            console.log('Backend Server ');
            console.log('='.repeat(50));
            console.log(`Server running on: http://localhost:${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
            console.log('='.repeat(50) + '\n');

            console.log('Available endpoints:');
            console.log(`  GET  /health                     - Health check`);
            console.log(`  POST /api/auth/register         - Register user`);
            console.log(`  GET  /api/auth/profile/:userId  - Get profile`);
            console.log(`  PUT  /api/auth/profile/:id      - Update profile`);
            console.log(`  DEL  /api/auth/user/:userId/:profileId - Delete user`);
            console.log('\n' + '='.repeat(50) + '\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

export default app;
