const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const list = errors.array();
      return res.status(400).json({
        success: false,
        message: list.map((item) => item.msg).join(' '),
        errors: list,
      });
    }
    try {
      const exists = await User.findOne({ email: req.body.email });
      if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });
      const user = await User.create({ name: req.body.name, email: req.body.email, password: req.body.password });
      res.status(201).json({ success: true, token: signToken(user._id), user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const list = errors.array();
      return res.status(400).json({
        success: false,
        message: list.map((item) => item.msg).join(' '),
        errors: list,
      });
    }
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user || !(await user.matchPassword(req.body.password)))
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      res.json({ success: true, token: signToken(user._id), user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
