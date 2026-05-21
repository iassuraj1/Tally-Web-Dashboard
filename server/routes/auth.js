const express = require('express');
const crypto = require('crypto');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User    = require('../models/User');
const Company = require('../models/Company');
const FinancialYear = require('../models/FinancialYear');
const { protect } = require('../middleware/auth');
const { withTransaction } = require('../config/db');
const { ROLE_PERMISSIONS } = require('../services/permissionService');
const { seedDefaultMasters } = require('../utils/seedMasters');
const { logAudit } = require('../utils/audit');
const { getGstState, getGstStateFromGstin } = require('../utils/gstStates');
const {
  createVerificationToken,
  hashToken,
  sendVerificationEmail,
} = require('../services/authMailService');

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  emailVerified: user.emailVerified !== false,
});

const verificationResponse = (emailDelivery = {}) => ({
  requiresEmailVerification: true,
  emailDelivery: {
    sent: Boolean(emailDelivery.sent),
    configured: Boolean(emailDelivery.configured),
    devVerificationUrl: emailDelivery.devVerificationUrl,
  },
});

const requestFrontendUrl = (req) => {
  const origin = req.get('origin');
  if (!origin) return undefined;
  try {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    return origin;
  } catch {
    return undefined;
  }
};

const issueVerificationEmail = async (user, frontendUrl) => {
  const { token, tokenHash, expiresAt } = createVerificationToken();
  user.emailVerificationToken = tokenHash;
  user.emailVerificationExpires = expiresAt;
  user.emailVerificationSentAt = new Date();
  await user.save();
  try {
    return await sendVerificationEmail({ user, token, frontendUrl });
  } catch (error) {
    console.error(`Verification email failed for ${user.email}: ${error.message}`);
    return {
      sent: false,
      configured: Boolean(process.env.SMTP_HOST),
    };
  }
};

const rateLimitVerificationEmail = (user) => {
  if (!user.emailVerificationSentAt) return false;
  return Date.now() - new Date(user.emailVerificationSentAt).getTime() < 60 * 1000;
};

const verificationMessage = (emailDelivery, successText) => {
  if (emailDelivery.sent) return successText;
  if (emailDelivery.configured) return 'Verification email could not be sent. Please check SMTP settings and resend verification.';
  return 'Email verification is required, but SMTP is not configured. Configure SMTP settings or use the development verification link.';
};

const validationErrorResponse = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  const list = errors.array();
  return res.status(400).json({
    success: false,
    message: list.map((item) => item.msg).join(' '),
    errors: list,
  });
};

const trim = (value) => String(value || '').trim();

const readDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const financialYearName = (startDate, endDate) => {
  const startYear = startDate.getFullYear();
  const endYear = String(endDate.getFullYear()).slice(-2);
  return `FY ${startYear}-${endYear}`;
};

const generateUniqueOrganizationProfileId = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `ORG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    if (!await Company.exists({ organizationProfileId: candidate })) return candidate;
  }
  return `ORG-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
};

const auditReqForUser = (req, user) => ({
  user,
  headers: req.headers,
  socket: req.socket,
  ip: req.ip,
});

// POST /api/auth/register
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('company.name').trim().notEmpty().withMessage('Company name is required'),
    body('company.state').trim().notEmpty().withMessage('Company state is required'),
    body('company.address').trim().notEmpty().withMessage('Company address is required'),
    body('company.city').trim().notEmpty().withMessage('Company city is required'),
    body('company.pincode').trim().notEmpty().withMessage('Company pincode is required'),
    body('company.gstin').optional({ checkFalsy: true }).trim().custom((value) => GSTIN_REGEX.test(String(value || '').toUpperCase())).withMessage('Enter a valid GSTIN'),
    body('company.financialYearStartDate').isISO8601().withMessage('Financial year start date is required'),
    body('company.financialYearEndDate').isISO8601().withMessage('Financial year end date is required'),
  ],
  async (req, res) => {
    const validationResponse = validationErrorResponse(req, res);
    if (validationResponse) return validationResponse;
    try {
      const exists = await User.findOne({ email: req.body.email });
      if (exists) {
        if (exists.emailVerified === false) {
          if (rateLimitVerificationEmail(exists)) {
            return res.status(429).json({
              success: false,
              code: 'VERIFICATION_EMAIL_RECENTLY_SENT',
              message: 'Verification email was sent recently. Please wait a minute before requesting another.',
            });
          }
          const emailDelivery = await issueVerificationEmail(exists, requestFrontendUrl(req));
          return res.json({
            success: true,
            message: verificationMessage(emailDelivery, 'Account already exists. Please verify your email before signing in.'),
            ...verificationResponse(emailDelivery),
          });
        }
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const startDate = readDate(req.body.company.financialYearStartDate);
      const endDate = readDate(req.body.company.financialYearEndDate);
      if (!startDate || !endDate || endDate < startDate) {
        return res.status(400).json({ success: false, message: 'Financial year end date must be after start date' });
      }

      const gstin = trim(req.body.company.gstin).toUpperCase();
      const gstState = gstin ? getGstStateFromGstin(gstin) : null;
      const selectedState = getGstState(req.body.company.state);
      if (!selectedState) {
        return res.status(400).json({ success: false, message: 'Select a valid company state / UT' });
      }
      if (gstState && gstState.code !== selectedState.code) {
        return res.status(400).json({
          success: false,
          message: `GSTIN belongs to ${gstState.name}. Please select the matching state / UT.`,
        });
      }

      const { user } = await withTransaction(async () => {
        const createdUser = await User.create({
          name: req.body.name,
          email: req.body.email,
          password: req.body.password,
          emailVerified: false,
        });

        const address = trim(req.body.company.address);
        const organizationProfileId = await generateUniqueOrganizationProfileId();
        const createdCompany = await Company.create({
          name: trim(req.body.company.name),
          legalName: trim(req.body.company.legalName) || trim(req.body.company.name),
          gstin,
          pan: gstin ? gstin.slice(2, 12) : '',
          address,
          city: trim(req.body.company.city),
          state: selectedState.name,
          pincode: trim(req.body.company.pincode),
          country: 'India',
          email: req.body.email,
          organizationProfileId,
          taxIdLabel: 'GSTIN :',
          taxIdValue: gstin,
          financialYearStart: startDate.getMonth() + 1,
          bookBeginning: startDate,
          branches: [{
            name: 'Main',
            code: 'MAIN',
            address,
            state: selectedState.name,
            gstin,
            isDefault: true,
          }],
          currencies: [{ code: 'INR', symbol: 'Rs', exchangeRate: 1, isBase: true }],
          owner: createdUser._id,
          members: [{ user: createdUser._id, role: 'admin', permissions: ROLE_PERMISSIONS.admin, status: 'active' }],
        });

        await seedDefaultMasters(createdCompany._id);

        const financialYear = await FinancialYear.create({
          company: createdCompany._id,
          name: financialYearName(startDate, endDate),
          startDate,
          endDate,
          isActive: true,
        });

        await Company.updateOne({ _id: createdCompany._id }, { activeFinancialYear: financialYear._id });
        await User.updateOne({ _id: createdUser._id }, { $addToSet: { companies: createdCompany._id } });
        createdUser.companies = [createdCompany._id];

        await logAudit({
          req: auditReqForUser(req, createdUser),
          company: createdCompany._id,
          action: 'company.created',
          entityType: 'Company',
          entityId: createdCompany._id,
          after: createdCompany.toObject(),
        });

        return { user: createdUser, company: createdCompany, financialYear };
      }, { isolationLevel: 'SERIALIZABLE' });

      const emailDelivery = await issueVerificationEmail(user, requestFrontendUrl(req));
      res.status(201).json({
        success: true,
        message: verificationMessage(emailDelivery, 'Registration successful. Please verify your email before signing in.'),
        ...verificationResponse(emailDelivery),
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/auth/login
router.post('/login',
  [
    body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const validationResponse = validationErrorResponse(req, res);
    if (validationResponse) return validationResponse;
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user || !(await user.matchPassword(req.body.password)))
        return res.status(401).json({ success: false, message: 'Invalid email or password' });

      if (user.emailVerified === false) {
        return res.status(403).json({
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before signing in.',
          email: user.email,
          ...verificationResponse({ sent: false, configured: Boolean(process.env.SMTP_HOST) }),
        });
      }

      user.lastLoginAt = new Date();
      await user.save();
      res.json({ success: true, token: signToken(user._id), user: sanitizeUser(user) });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/auth/verify-email
router.post('/verify-email',
  [
    body('token').trim().notEmpty().withMessage('Verification token is required'),
    body('email').optional().isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  ],
  async (req, res) => {
    const validationResponse = validationErrorResponse(req, res);
    if (validationResponse) return validationResponse;

    try {
      const tokenHash = hashToken(req.body.token);
      const user = await User.findOne({ emailVerificationToken: tokenHash });
      if (!user) {
        if (req.body.email) {
          const verifiedUser = await User.findOne({ email: req.body.email });
          if (verifiedUser && verifiedUser.emailVerified !== false) {
            return res.json({
              success: true,
              message: 'Email already verified. You can now sign in.',
            });
          }
        }
        return res.status(400).json({ success: false, message: 'Verification link is invalid or has already been used' });
      }

      if (user.emailVerificationExpires && new Date(user.emailVerificationExpires).getTime() < Date.now()) {
        return res.status(400).json({
          success: false,
          code: 'VERIFICATION_LINK_EXPIRED',
          message: 'Verification link has expired. Please request a new one.',
          email: user.email,
        });
      }

      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      delete user.emailVerificationToken;
      delete user.emailVerificationExpires;
      delete user.emailVerificationSentAt;
      await user.save();

      res.json({
        success: true,
        message: 'Email verified successfully. You can now sign in.',
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/auth/resend-verification
router.post('/resend-verification',
  [
    body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  ],
  async (req, res) => {
    const validationResponse = validationErrorResponse(req, res);
    if (validationResponse) return validationResponse;

    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user || user.emailVerified !== false) {
        return res.json({
          success: true,
          message: 'If this email needs verification, a verification email will be sent.',
        });
      }

      if (rateLimitVerificationEmail(user)) {
        return res.status(429).json({
          success: false,
          code: 'VERIFICATION_EMAIL_RECENTLY_SENT',
          message: 'Verification email was sent recently. Please wait a minute before requesting another.',
        });
      }

      const emailDelivery = await issueVerificationEmail(user, requestFrontendUrl(req));
      res.json({
        success: true,
        message: verificationMessage(emailDelivery, 'Verification email sent. Please check your inbox.'),
        ...verificationResponse(emailDelivery),
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

module.exports = router;
