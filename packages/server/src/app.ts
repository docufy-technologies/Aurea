import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ApiResponse } from '@aurea/shared';

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

export default app;
