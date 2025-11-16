import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.set('trust proxy', 1);

// Security middleware для Leaflet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:", "https://*.tile.openstreetmap.org"],
      connectSrc: ["'self'", "https://*.tile.openstreetmap.org", "https://*.render.com"]
    }
  }
}));

// Compression middleware
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Слишком много запросов с этого IP, попробуйте позже',
  trustProxy: true 
});
app.use('/api/', limiter);

// CORS configuration для Render
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://nko-map-frontend.onrender.com',
      'https://nko-map.onrender.com',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173'
    ];
    
    // Разрешаем запросы без origin (нужно для некоторых клиентов)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// API Routes
import authRoutes from './routes/auth.js';
import npoRoutes from './routes/npo.js';
import profileRoutes from './routes/profile.js';
import adminRoutes from './routes/admin.js';

app.use('/api/auth', authRoutes);
app.use('/api/npo', npoRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'NKO Map API is running on Render!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    render: true
  });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Доступ запрещен политикой CORS'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка сервера' : err.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Render.com deployment ready`);
});