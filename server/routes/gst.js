const express = require('express');
const router  = express.Router({ mergeParams: true });
const Voucher = require('../models/Voucher');
const { protect, companyAccess } = require('../middleware/auth');

router.use(protect, companyAccess);

// GSTR-1: Outward supplies (Sales)
router.get('/gstr1', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {
      company: req.params.companyId,
      voucherType: { $in: ['Sales', 'CreditNote'] },
      isCancelled: false,
    };
    if (from) filter.date = { $gte: new Date(from) };
    if (to)   filter.date = { ...filter.date, $lte: new Date(to) };

    const vouchers = await Voucher.find(filter).populate('party', 'name gstin').sort({ date: 1 });

    const b2b = [], b2c = [], cdn = [];
    let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0;

    for (const v of vouchers) {
      const entry = {
        date: v.date, voucherNo: v.voucherNo, party: v.party?.name,
        gstin: v.partyGstin, placeOfSupply: v.placeOfSupply,
        taxable: v.subtotal, cgst: v.totalCGST, sgst: v.totalSGST,
        igst: v.totalIGST, total: v.total, reverseCharge: v.reverseCharge,
      };
      totalTaxable += v.subtotal || 0;
      totalCGST    += v.totalCGST || 0;
      totalSGST    += v.totalSGST || 0;
      totalIGST    += v.totalIGST || 0;

      if (v.voucherType === 'CreditNote') cdn.push(entry);
      else if (v.partyGstin) b2b.push(entry);
      else b2c.push(entry);
    }

    res.json({
      success: true,
      data: { b2b, b2c, cdn },
      summary: { totalTaxable, totalCGST, totalSGST, totalIGST, totalTax: totalCGST + totalSGST + totalIGST },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GSTR-3B: Summary return
router.get('/gstr3b', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { company: req.params.companyId, isCancelled: false };
    if (from) filter.date = { $gte: new Date(from) };
    if (to)   filter.date = { ...filter.date, $lte: new Date(to) };

    const sales    = await Voucher.find({ ...filter, voucherType: { $in: ['Sales', 'CreditNote'] } });
    const purchase = await Voucher.find({ ...filter, voucherType: { $in: ['Purchase', 'DebitNote'] } });

    const sumVouchers = (vs) => vs.reduce((acc, v) => ({
      taxable: acc.taxable + (v.subtotal    || 0),
      cgst:    acc.cgst    + (v.totalCGST   || 0),
      sgst:    acc.sgst    + (v.totalSGST   || 0),
      igst:    acc.igst    + (v.totalIGST   || 0),
    }), { taxable: 0, cgst: 0, sgst: 0, igst: 0 });

    const outward  = sumVouchers(sales);
    const inward   = sumVouchers(purchase);
    const taxPayable = {
      cgst: Math.max(0, outward.cgst  - inward.cgst),
      sgst: Math.max(0, outward.sgst  - inward.sgst),
      igst: Math.max(0, outward.igst  - inward.igst),
    };

    res.json({
      success: true,
      data: {
        '3.1': { outward },
        '4':   { inward  },
        '6.1': { taxPayable, total: taxPayable.cgst + taxPayable.sgst + taxPayable.igst },
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// HSN-wise summary
router.get('/hsn-summary', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {
      company: req.params.companyId,
      voucherType: { $in: ['Sales', 'Purchase'] },
      isCancelled: false,
    };
    if (from) filter.date = { $gte: new Date(from) };
    if (to)   filter.date = { ...filter.date, $lte: new Date(to) };

    const vouchers = await Voucher.find(filter).select('items voucherType');
    const hsnMap   = {};
    for (const v of vouchers) {
      for (const item of v.items) {
        const hsn = item.hsnCode || 'N/A';
        if (!hsnMap[hsn]) hsnMap[hsn] = { hsnCode: hsn, qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
        hsnMap[hsn].qty     += item.qty;
        hsnMap[hsn].taxable += item.amount;
        hsnMap[hsn].cgst    += item.cgst;
        hsnMap[hsn].sgst    += item.sgst;
        hsnMap[hsn].igst    += item.igst;
        hsnMap[hsn].total   += item.amount + item.cgst + item.sgst + item.igst;
      }
    }
    res.json({ success: true, data: Object.values(hsnMap) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
