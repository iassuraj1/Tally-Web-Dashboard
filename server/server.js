require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const { connectDB } = require('./config/db');
const errorHandler= require('./middleware/errorHandler');

const app = express();

const parseOrigins = (value = '') => value
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...parseOrigins(process.env.FRONTEND_ORIGINS),
]);
const corsAllowAll = process.env.CORS_ALLOW_ALL === 'true' || process.env.FRONTEND_ORIGINS === '*';

const isPrivateNetworkFrontend = (origin) => {
  try {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (url.port !== '5173') return false;
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(url.hostname)
    );
  } catch {
    return false;
  }
};

app.use(helmet());
app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || corsAllowAll || allowedOrigins.has(origin) || isPrivateNetworkFrontend(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

const apiRateLimitMax = Number(process.env.API_RATE_LIMIT || (process.env.NODE_ENV === 'production' ? 300 : 5000));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: apiRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    success: false,
    message: 'Too many requests. Please wait a minute and try again.',
  }),
});
app.use('/api', limiter);

// Public routes (marketing site)
app.use('/api/contact',    require('./routes/contact'));
app.use('/api/newsletter', require('./routes/newsletter'));

// Auth
app.use('/api/auth', require('./routes/auth'));

// Company-scoped routes  (/api/companies/:companyId/...)
app.use('/api/companies',  require('./routes/companies'));
app.use('/api/companies/:companyId/groups',       require('./routes/groups'));
app.use('/api/companies/:companyId/ledgers',      require('./routes/ledgers'));
app.use('/api/companies/:companyId/vouchers',     require('./routes/vouchers'));
app.use('/api/companies/:companyId/documents',    require('./routes/workflowDocuments'));
app.use('/api/companies/:companyId/inventory',    require('./routes/inventory'));
app.use('/api/companies/:companyId/dashboard',    require('./routes/dashboard'));
app.use('/api/companies/:companyId/import',       require('./routes/import'));
app.use('/api/companies/:companyId/backup',       require('./routes/backup'));
app.use('/api/companies/:companyId/reports',      require('./routes/reports'));
app.use('/api/companies/:companyId/payroll',      require('./routes/payroll'));
app.use('/api/companies/:companyId/gst',          require('./routes/gst'));
app.use('/api/companies/:companyId/banking',      require('./routes/banking'));
app.use('/api/companies/:companyId/cost-centres', require('./routes/costcentres'));
app.use('/api/companies/:companyId/collaboration', require('./routes/collaboration'));
app.use('/api/companies/:companyId/advanced',     require('./routes/advanced'));

app.use(errorHandler);

const start = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
      console.error(`Find it with: netstat -ano | findstr :${PORT}`);
      console.error('Stop it with: taskkill /PID <PID> /F');
      console.error('Or set a different PORT in server/.env and update client/vite.config.js to match.');
      process.exit(1);
    }

    throw error;
  });
};

start().catch((error) => {
  console.error(`Server startup failed: ${error.message}`);
  process.exit(1);
});
