const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Not authorised' });
  try {
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// Verify user has access to the company
const companyAccess = async (req, res, next) => {
  const companyId = req.params.companyId || req.body.company || req.query.company;
  if (!companyId) return res.status(400).json({ success: false, message: 'Company ID required' });
  const Company = require('../models/Company');
  const company = await Company.findOne({ _id: companyId, owner: req.user._id });
  if (!company) return res.status(403).json({ success: false, message: 'Access denied to this company' });
  req.company = company;
  next();
};

module.exports = { protect, companyAccess };
