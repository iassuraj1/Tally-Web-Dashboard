const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, companyAccess, requirePermission } = require('../middleware/auth');
const { commitMasterImport, previewMasterImport } = require('../services/masterImportService');

router.use(protect, companyAccess);
router.use(requirePermission('manage_company_settings'));

router.post('/masters/preview', async (req, res) => {
  try {
    const { type, text, fileData, fileName } = req.body;
    const data = await previewMasterImport(req.params.companyId, type, { text, fileData, fileName });
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/masters/commit', async (req, res) => {
  try {
    const data = await commitMasterImport(req.params.companyId, req.body.type, req.body.rows || []);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/masters/template/:type', (req, res) => {
  const templates = {
    ledgers: [
      ['Ledger Name', 'Group', 'Opening Balance', 'Opening Balance Type', 'GSTIN', 'Phone', 'Email'],
      ['Example Customer', 'Sundry Debtors', '1000', 'Dr', '', '', 'customer@example.com'],
    ],
    customers: [
      ['Name', 'Opening Balance', 'Opening Balance Type', 'GSTIN', 'Phone', 'Email', 'Credit Days'],
      ['Customer A', '0', 'Dr', '', '', 'customer@example.com', '30'],
    ],
    vendors: [
      ['Name', 'Opening Balance', 'Opening Balance Type', 'GSTIN', 'Phone', 'Email', 'Credit Days'],
      ['Vendor A', '0', 'Cr', '', '', 'vendor@example.com', '30'],
    ],
    stock_items: [
      ['Item Name', 'Stock Group', 'Unit', 'HSN Code', 'GST Rate', 'Opening Qty', 'Opening Rate', 'Selling Price', 'Reorder Level'],
      ['Sample Item', '', 'Nos', '1001', '18', '10', '50', '75', '5'],
    ],
    opening_balances: [
      ['Ledger Name', 'Opening Balance', 'Opening Balance Type', 'Stock Item', 'Opening Qty', 'Opening Rate'],
      ['Example Customer', '1000', 'Dr', '', '', ''],
    ],
  };
  const rows = templates[req.params.type] || templates.ledgers;
  const esc = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(esc).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}_import_template.csv"`);
  res.send(`\uFEFF${csv}`);
});

module.exports = router;
