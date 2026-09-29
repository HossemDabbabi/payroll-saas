const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const { ensureSingleAdmin } = require('./utils/adminGuard');
const authRoutes = require('./routes/auth.routes');
const payrollRoutes = require('./routes/payroll.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const reportRoutes = require('./routes/report.routes');
const copilotRoutes = require('./routes/copilot.routes');
const adminRoutes = require('./routes/admin.routes');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app = express();

// Connect to MongoDB, then run the single-admin integrity check
connectDB().then(() => ensureSingleAdmin());

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/admin', adminRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Payroll SaaS API is running', timestamp: new Date().toISOString() });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;
