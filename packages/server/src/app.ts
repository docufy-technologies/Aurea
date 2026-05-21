import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ApiResponse, ApiErrorResponse } from '@aurea/shared';
import authRouter from './routes/auth-routes';
import { AppError } from './utils/errors';

// Load environment variables
dotenv.config();

const app: Express = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.VITE_API_URL ? [new URL(process.env.VITE_API_URL).origin] : '*',
  credentials: true
}));

app.use(express.json());

// API version prefix: /api/v1
const ROUTE_PREFIX = '/api/v1';

// Mount Authentication Routes
app.use(`${ROUTE_PREFIX}/auth`, authRouter);

// Standard Health check route
app.get(`${ROUTE_PREFIX}/health`, (req, res) => {
  const response: ApiResponse<{ status: string; uptime: number; timestamp: string }> = {
    success: true,
    data: {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  };
  res.status(200).json(response);
});

// Fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`
    }
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
  // Only log detailed stacks for internal server errors
  if (!err.statusCode || err.statusCode === 500) {
    console.error('[Server Unhandled Error]', err);
  }

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred on the server.';
  
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(err.details ? { details: err.details } : {})
    }
  };

  res.status(statusCode).json(response);
});

export default app;
