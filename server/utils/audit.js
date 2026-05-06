const AuditLog = require('../models/AuditLog');

const getRequestIp = (req) => (
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.socket?.remoteAddress ||
  req.ip
);

const logAudit = async ({ req, company, action, entityType, entityId, before, after, metadata }) => {
  try {
    await AuditLog.create({
      company,
      user: req?.user?._id,
      action,
      entityType,
      entityId,
      before,
      after,
      metadata,
      ip: req ? getRequestIp(req) : undefined,
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

module.exports = {
  logAudit,
};
