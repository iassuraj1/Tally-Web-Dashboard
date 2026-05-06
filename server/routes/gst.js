const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, companyAccess, requirePermission } = require('../middleware/auth');
const {
  buildEInvoiceJson,
  exportSheets,
  getGSTR1Report,
  getGSTR3BReport,
  getGstMismatchReport,
  getHSNSummary,
  getMissingGstinReport,
  getReverseChargeReport,
} = require('../services/gstService');
const { sendReportExport } = require('../utils/reportExport');

router.use(protect, companyAccess);

const respondReport = (reportName, getReport) => async (req, res) => {
  try {
    if (!req.companyPermissions?.includes('view_reports')) {
      return res.status(403).json({ success: false, message: 'Permission required: view_reports' });
    }
    const report = await getReport(req.params.companyId, req.query);
    if (['csv', 'xlsx', 'pdf'].includes(req.query.format)) {
      if (!req.companyPermissions?.includes('export_data')) {
        return res.status(403).json({ success: false, message: 'Permission required: export_data' });
      }
      const sheets = exportSheets(reportName, report);
      const filename = `${reportName}_${new Date().toISOString().slice(0, 10)}`;
      return sendReportExport(res, filename, sheets, req.query.format, reportName.toUpperCase());
    }
    return res.json({ success: true, ...report });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.get('/gstr1', respondReport('gstr1', getGSTR1Report));
router.get('/gstr3b', respondReport('gstr3b', getGSTR3BReport));

router.get('/hsn-summary', respondReport('hsn_summary', async (companyId, query) => ({
  data: await getHSNSummary(companyId, query),
})));

router.get('/mismatch-checks', respondReport('gst_mismatch_checks', getGstMismatchReport));
router.get('/missing-gstin', respondReport('missing_gstin', getMissingGstinReport));
router.get('/reverse-charge', respondReport('reverse_charge', getReverseChargeReport));

router.get('/einvoice/:voucherId.json', requirePermission('export_data'), async (req, res) => {
  try {
    const data = await buildEInvoiceJson(req.params.companyId, req.params.voucherId);
    if (!data) return res.status(404).json({ success: false, message: 'Voucher not found' });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="einvoice_${data.DocDtls?.No || req.params.voucherId}.json"`);
    return res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
