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

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
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
app.use('/api/companies/:companyId/inventory',    require('./routes/inventory'));
app.use('/api/companies/:companyId/reports',      require('./routes/reports'));
app.use('/api/companies/:companyId/payroll',      require('./routes/payroll'));
app.use('/api/companies/:companyId/gst',          require('./routes/gst'));
app.use('/api/companies/:companyId/banking',      require('./routes/banking'));
app.use('/api/companies/:companyId/cost-centres', require('./routes/costcentres'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
