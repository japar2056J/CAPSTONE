const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: [
    'http://localhost:1000',
    'http://localhost:3000',
    'http://127.0.0.1:1000',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Parse cookies so we can read session cookie set by Firebase
app.use(cookieParser());

// Global rate limiter (e.g., 100 requests per 15 minutes per IP)
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// ========== LOGGING MIDDLEWARE ==========
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========== ROUTES ==========
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const productRoutes = require('./routes/productRoutes');
const componentRoutes = require('./routes/componentRoutes');
const estimationRoutes = require('./routes/estimationRoutes');
const riwayatRoutes = require('./routes/riwayatRoutes');
const kursRoutes = require('./routes/kursRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditRoutes = require('./routes/auditRoutes');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/estimations', estimationRoutes);
app.use('/api/riwayat', riwayatRoutes);
app.use('/api/kurs', kursRoutes);
app.use('/api/audit', auditRoutes);

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

module.exports = app;
