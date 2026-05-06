const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, companyAccess, requirePermission } = require('../middleware/auth');
const { buildCompanyBackup, restoreCompanyBackup } = require('../services/backupService');

router.use(protect, companyAccess);
router.use(requirePermission('manage_company_settings'));

router.get('/export', async (req, res) => {
  try {
    if (!req.companyPermissions?.includes('export_data')) {
      return res.status(403).json({ success: false, message: 'Permission required: export_data' });
    }
    const backup = await buildCompanyBackup(req.params.companyId);
    const filename = `${String(backup.company?.name || 'company').replace(/[^a-z0-9_-]+/gi, '_').toLowerCase()}_backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/restore', async (req, res) => {
  try {
    let backup = req.body.backup;
    if (!backup && req.body.fileData) {
      const json = Buffer.from(String(req.body.fileData).replace(/^data:.*;base64,/, ''), 'base64').toString('utf8');
      backup = JSON.parse(json);
    }
    if (typeof backup === 'string') backup = JSON.parse(backup);
    const data = await restoreCompanyBackup(req.params.companyId, backup, {
      dryRun: req.body.dryRun !== false,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
