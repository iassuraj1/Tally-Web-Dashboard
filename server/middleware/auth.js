const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const { memberPermissions } = require('../services/permissionService');

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
  const company = await Company.findOne({
    _id: companyId,
    isActive: true,
    $or: [
      { owner: req.user._id },
      { members: { $elemMatch: { user: req.user._id, status: 'active' } } },
    ],
  });
  if (!company) return res.status(403).json({ success: false, message: 'Access denied to this company' });
  const isOwner = company.owner.equals(req.user._id);
  const member = company.members.find((m) => m.user.equals(req.user._id) && m.status === 'active');
  req.company = company;
  req.companyRole = isOwner ? 'owner' : member?.role || 'viewer';
  req.companyPermissions = memberPermissions(company, req.user._id);
  if (req.companyRole === 'viewer' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return res.status(403).json({ success: false, message: 'Viewers can only read company data' });
  }
  next();
};

const requireCompanyRole = (...roles) => (req, res, next) => {
  if (roles.includes(req.companyRole)) return next();
  res.status(403).json({ success: false, message: 'You do not have permission for this action' });
};

const requirePermission = (permissionName) => (req, res, next) => {
  if (req.companyPermissions?.includes(permissionName)) return next();
  return res.status(403).json({ success: false, message: `Permission required: ${permissionName}` });
};

module.exports = { protect, companyAccess, requireCompanyRole, requirePermission };
