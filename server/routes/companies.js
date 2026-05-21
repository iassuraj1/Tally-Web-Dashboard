const express = require('express');
const crypto = require('crypto');
const router  = express.Router();
const Company = require('../models/Company');
const User    = require('../models/User');
const FinancialYear = require('../models/FinancialYear');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
const { seedDefaultMasters } = require('../utils/seedMasters');
const { logAudit } = require('../utils/audit');
const { PERMISSIONS, ROLE_PERMISSIONS, can, permissionsForRole, uniquePermissions } = require('../services/permissionService');
const { withTransaction } = require('../config/db');

router.use(protect);

const normalizeOrganizationProfileId = (value) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/\s+/g, '-')
  .replace(/[^A-Z0-9-_]/g, '')
  .slice(0, 32);

const generateUniqueOrganizationProfileId = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `ORG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const exists = await Company.exists({ organizationProfileId: candidate });
    if (!exists) return candidate;
  }
  return `ORG-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
};

const ensureOrganizationProfileId = async (company) => {
  if (!company || company.organizationProfileId) return company;
  const organizationProfileId = await generateUniqueOrganizationProfileId();
  await Company.updateOne({ _id: company._id }, { organizationProfileId });
  company.organizationProfileId = organizationProfileId;
  return company;
};

const prepareOrganizationProfileIdPatch = async (body, companyId) => {
  if (!Object.prototype.hasOwnProperty.call(body, 'organizationProfileId')) return { patch: body };

  const organizationProfileId = normalizeOrganizationProfileId(body.organizationProfileId);
  if (!organizationProfileId) {
    return { error: { status: 400, message: 'Organization Profile ID is required' } };
  }

  const existing = await Company.exists({
    _id: { $ne: companyId },
    organizationProfileId,
  });
  if (existing) {
    return { error: { status: 409, message: 'Organization Profile ID already exists' } };
  }

  return { patch: { ...body, organizationProfileId } };
};

router.get('/', async (req, res) => {
  try {
    let companies = await Company.find({
      isActive: true,
      $or: [
        { owner: req.user._id },
        { members: { $elemMatch: { user: req.user._id, status: 'active' } } },
      ],
    }).populate('owner', 'name email').populate('members.user', 'name email');
    companies = await Promise.all(companies.map(ensureOrganizationProfileId));
    res.json({ success: true, data: companies });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const hasProfileId = Object.prototype.hasOwnProperty.call(req.body, 'organizationProfileId');
    const requestedProfileId = normalizeOrganizationProfileId(req.body.organizationProfileId);
    if (hasProfileId && !requestedProfileId) {
      return res.status(400).json({ success: false, message: 'Organization Profile ID is required' });
    }
    const organizationProfileId = requestedProfileId || await generateUniqueOrganizationProfileId();
    if (requestedProfileId && await Company.exists({ organizationProfileId })) {
      return res.status(409).json({ success: false, message: 'Organization Profile ID already exists' });
    }

    const company = await withTransaction(async () => {
      const created = await Company.create({
        ...req.body,
        organizationProfileId,
        owner: req.user._id,
        members: [{ user: req.user._id, role: 'admin', permissions: ROLE_PERMISSIONS.admin, status: 'active' }],
      });
      await User.updateOne({ _id: req.user._id }, { $addToSet: { companies: created._id } });
      // Seed default Tally groups + ledgers for this company
      await seedDefaultMasters(created._id);
      await logAudit({
        req,
        company: created._id,
        action: 'company.created',
        entityType: 'Company',
        entityId: created._id,
        after: created.toObject(),
      });
      return created;
    }, { isolationLevel: 'SERIALIZABLE' });
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.organizationProfileId) {
      return res.status(409).json({ success: false, message: 'Organization Profile ID already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/financial-years', async (req, res) => {
  try {
    const company = await findAccessibleCompany(req.params.id, req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const financialYears = await FinancialYear.find({ company: company._id }).sort({ startDate: -1 });
    res.json({ success: true, data: financialYears });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id/permissions', async (req, res) => {
  try {
    const company = await findAccessibleCompany(req.params.id, req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: { permissions: PERMISSIONS, roleDefaults: ROLE_PERMISSIONS } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/:id/financial-years', async (req, res) => {
  try {
    const company = await findAccessibleCompany(req.params.id, req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    if (!canManage(company, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only owners and admins can manage financial years' });
    }

    const financialYear = await FinancialYear.create({
      company: company._id,
      name: req.body.name,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      isActive: Boolean(req.body.isActive),
      isLocked: Boolean(req.body.isLocked),
      lockReason: req.body.lockReason,
      lockedAt: req.body.isLocked ? new Date() : undefined,
      lockedBy: req.body.isLocked ? req.user._id : undefined,
    });

    if (financialYear.isActive) {
      await setActiveFinancialYear(company._id, financialYear._id);
    }

    await logAudit({
      req,
      company: company._id,
      action: 'financial_year.created',
      entityType: 'FinancialYear',
      entityId: financialYear._id,
      after: financialYear.toObject(),
    });
    res.status(201).json({ success: true, data: financialYear });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/:id/financial-years/:financialYearId', async (req, res) => {
  try {
    const company = await findAccessibleCompany(req.params.id, req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    if (!canManage(company, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only owners and admins can manage financial years' });
    }

    const before = await FinancialYear.findOne({
      _id: req.params.financialYearId,
      company: company._id,
    }).lean();
    if (!before) return res.status(404).json({ success: false, message: 'Financial year not found' });

    const update = { ...req.body };
    if (req.body.isLocked === true && !before.isLocked) {
      update.lockedAt = new Date();
      update.lockedBy = req.user._id;
    }
    if (req.body.isLocked === false) {
      update.$unset = { lockedAt: '', lockedBy: '', lockReason: '' };
      delete update.lockedAt;
      delete update.lockedBy;
      delete update.lockReason;
    }

    const financialYear = await FinancialYear.findOneAndUpdate(
      { _id: req.params.financialYearId, company: company._id },
      update,
      { new: true, runValidators: true }
    );

    if (financialYear.isActive) {
      await setActiveFinancialYear(company._id, financialYear._id);
    } else if (String(company.activeFinancialYear || '') === String(financialYear._id)) {
      await Company.updateOne({ _id: company._id }, { $unset: { activeFinancialYear: '' } });
    }

    await logAudit({
      req,
      company: company._id,
      action: 'financial_year.updated',
      entityType: 'FinancialYear',
      entityId: financialYear._id,
      before,
      after: financialYear.toObject(),
    });
    res.json({ success: true, data: financialYear });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id/audit-trail', async (req, res) => {
  try {
    const company = await findAccessibleCompany(req.params.id, req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const filter = { company: company._id };
    if (req.query.entityType) filter.entityType = req.query.entityType;
    if (req.query.entityId) filter.entityId = req.query.entityId;

    const logs = await AuditLog.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(req.query.limit, 10) || 100, 500));
    res.json({ success: true, data: logs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const company = await Company.findOne({
      _id: req.params.id,
      isActive: true,
      $or: [
        { owner: req.user._id },
        { members: { $elemMatch: { user: req.user._id, status: 'active' } } },
      ],
    }).populate('owner', 'name email').populate('members.user', 'name email');
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    await ensureOrganizationProfileId(company);
    res.json({ success: true, data: company });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

const canManage = (company, userId) => (
  can(company, userId, 'manage_company_settings')
);

const canManageUsers = (company, userId) => (
  can(company, userId, 'manage_users')
);

const findAccessibleCompany = (companyId, userId) => Company.findOne({
  _id: companyId,
  isActive: true,
  $or: [
    { owner: userId },
    { members: { $elemMatch: { user: userId, status: 'active' } } },
  ],
});

const setActiveFinancialYear = async (companyId, financialYearId) => {
  await withTransaction(async () => {
    await FinancialYear.updateMany(
      { company: companyId, _id: { $ne: financialYearId } },
      { isActive: false }
    );
    await Company.updateOne({ _id: companyId }, { activeFinancialYear: financialYearId });
  }, { isolationLevel: 'SERIALIZABLE' });
};

router.put('/:id', async (req, res) => {
  try {
    const current = await Company.findOne({
      _id: req.params.id,
      isActive: true,
      $or: [
        { owner: req.user._id },
        { members: { $elemMatch: { user: req.user._id, status: 'active' } } },
      ],
    });
    if (!current) return res.status(404).json({ success: false, message: 'Company not found' });
    if (!canManage(current, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Permission required: manage_company_settings' });
    }
    await ensureOrganizationProfileId(current);

    const { patch, error } = await prepareOrganizationProfileIdPatch(req.body, current._id);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      patch,
      { new: true, runValidators: true }
    );
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    await logAudit({
      req,
      company: company._id,
      action: 'company.updated',
      entityType: 'Company',
      entityId: company._id,
      before: current.toObject(),
      after: company.toObject(),
    });
    res.json({ success: true, data: company });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.organizationProfileId) {
      return res.status(409).json({ success: false, message: 'Organization Profile ID already exists' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, isActive: true },
      { isActive: false },
      { new: true }
    );
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    await logAudit({
      req,
      company: company._id,
      action: 'company.deactivated',
      entityType: 'Company',
      entityId: company._id,
      after: company.toObject(),
    });
    res.json({ success: true, message: 'Company deactivated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id/users', async (req, res) => {
  try {
    const company = await Company.findOne({
      _id: req.params.id,
      isActive: true,
      $or: [
        { owner: req.user._id },
        { members: { $elemMatch: { user: req.user._id, status: 'active' } } },
      ],
    }).populate('owner', 'name email').populate('members.user', 'name email');
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const memberUsers = company.members
      .filter((m) => m.user)
      .map((m) => ({
        _id: m.user._id,
        name: m.user.name,
        email: m.user.email,
        role: company.owner.equals(m.user._id) ? 'owner' : m.role,
        permissions: company.owner.equals(m.user._id)
          ? ROLE_PERMISSIONS.owner
          : uniquePermissions(m.permissions?.length ? m.permissions : permissionsForRole(m.role)),
        status: m.status,
        joinedAt: m.joinedAt,
      }));
    const users = [
      {
        _id: company.owner._id,
        name: company.owner.name,
        email: company.owner.email,
        role: 'owner',
        permissions: ROLE_PERMISSIONS.owner,
        status: 'active',
        joinedAt: company.createdAt,
      },
      ...memberUsers.filter((m) => String(m._id) !== String(company.owner._id)),
    ];
    res.json({ success: true, data: users });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/:id/users', async (req, res) => {
  try {
    const { email, role = 'accountant' } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'User email is required' });
    if (!['admin', 'accountant', 'viewer'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
    const permissions = uniquePermissions(req.body.permissions?.length ? req.body.permissions : permissionsForRole(role));

    const company = await findAccessibleCompany(req.params.id, req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    if (!canManageUsers(company, req.user._id)) return res.status(403).json({ success: false, message: 'Permission required: manage_users' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: 'User must register before being added' });
    if (company.owner.equals(user._id)) return res.status(400).json({ success: false, message: 'Owner already has access' });

    const existing = company.members.find((m) => m.user.equals(user._id));
    const before = existing ? existing.toObject() : undefined;
    if (existing) {
      existing.role = role;
      existing.permissions = permissions;
      existing.status = 'active';
    } else {
      company.members.push({ user: user._id, role, permissions, status: 'active' });
    }
    await company.save();
    await User.updateOne({ _id: user._id }, { $addToSet: { companies: company._id } });
    await logAudit({
      req,
      company: company._id,
      action: 'company_user.upserted',
      entityType: 'User',
      entityId: user._id,
      before,
      after: { email: user.email, role, permissions, status: 'active' },
    });
    res.status(201).json({ success: true, message: 'User added to company' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/:id/users/:userId', async (req, res) => {
  try {
    const { role, status } = req.body;
    if (role && !['admin', 'accountant', 'viewer'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
    if (status && !['active', 'disabled'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const permissions = req.body.permissions ? uniquePermissions(req.body.permissions) : undefined;

    const company = await findAccessibleCompany(req.params.id, req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    if (!canManageUsers(company, req.user._id)) return res.status(403).json({ success: false, message: 'Permission required: manage_users' });
    if (company.owner.equals(req.params.userId)) return res.status(400).json({ success: false, message: 'Owner role cannot be changed' });

    const member = company.members.find((m) => m.user.equals(req.params.userId));
    if (!member) return res.status(404).json({ success: false, message: 'User is not a company member' });
    const before = member.toObject();
    if (role) {
      member.role = role;
      if (!permissions) member.permissions = permissionsForRole(role);
    }
    if (permissions) member.permissions = permissions;
    if (status) member.status = status;
    await company.save();
    await logAudit({
      req,
      company: company._id,
      action: 'company_user.updated',
      entityType: 'User',
      entityId: req.params.userId,
      before,
      after: member.toObject(),
    });
    res.json({ success: true, data: member });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id/users/:userId', async (req, res) => {
  try {
    const company = await findAccessibleCompany(req.params.id, req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    if (!canManageUsers(company, req.user._id)) return res.status(403).json({ success: false, message: 'Permission required: manage_users' });
    if (company.owner.equals(req.params.userId)) return res.status(400).json({ success: false, message: 'Owner cannot be removed' });

    const before = company.members.find((m) => m.user.equals(req.params.userId));
    company.members = company.members.filter((m) => !m.user.equals(req.params.userId));
    await company.save();
    await User.updateOne({ _id: req.params.userId }, { $pull: { companies: company._id } });
    await logAudit({
      req,
      company: company._id,
      action: 'company_user.removed',
      entityType: 'User',
      entityId: req.params.userId,
      before: before?.toObject(),
    });
    res.json({ success: true, message: 'User removed from company' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
