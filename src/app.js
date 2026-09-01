const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const questionRoutes = require('./routes/questionRoutes');
const topicRoutes = require('./routes/topicRoutes');
const attemptRoutes = require('./routes/attemptRoutes');
const authRoutes = require('./routes/authRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');
const ApiResponse = require('./utils/apiResponse');
const { connectDB } = require('./config/db');
const mongoose = require('mongoose');

const app = express();

// Ensure DB is connected for serverless invocations (e.g. on Vercel)
app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    next();
  } catch (err) {
    next(err);
  }
});

// 1. Security Middleware
app.use(helmet());

// 2. CORS Configuration
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// 3. Rate Limiting
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX, 10) || 1000;

const limiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      details: []
    }
  }
});
app.use(limiter);

// 4. Request Parsers with strict size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 5. HTTP Request Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan(':method :url :status :res[content-length] - :response-time ms')
  );
}

// 6. Health Check Endpoint
app.get('/health', (req, res) => {
  return ApiResponse.success(res, 200, 'Aptitude API is healthy', {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/v1/health', (req, res) => {
  return ApiResponse.success(res, 200, 'Aptitude API is healthy', {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 7. Mount Core API Routes
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/topics', topicRoutes);
app.use('/api/v1/attempts', attemptRoutes);
app.use('/api/v1/auth', authRoutes);

// 8. 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
