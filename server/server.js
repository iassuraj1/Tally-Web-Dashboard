require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const connectDB   = require('./config/db');
const errorHandler= require('./middleware/errorHandler');

const app = express();
connectDB();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
