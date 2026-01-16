import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import { validateConnection } from './config/appwrite.config';

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
        service: 'BharatMinds AI Backend',
    });
});

// API routes
app.use('/api/auth', authRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        message: 'BharatMinds AI Backend API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
        },
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
            console.error('❌ Failed to connect to Appwrite');
            console.error('Please check your environment variables');
            process.exit(1);
        }

        console.log('✅ Appwrite connection validated');

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
