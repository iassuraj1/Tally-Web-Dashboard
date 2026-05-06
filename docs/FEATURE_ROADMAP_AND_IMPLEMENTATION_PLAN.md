# Feature Roadmap and Implementation Plan

This document lists useful functionality you can add to make Suraj Prime Tally closer to Tally Prime and Zoho Books. It is written as a build plan, not only an idea list.

## Product Direction

Your app can combine two strengths:

- Tally Prime style: fast accounting entry, company-wise books, GST, inventory, payroll, banking, reports.
- Zoho Books style: modern cloud workflows, multi-user collaboration, approvals, invoices, customers, vendors, reminders, attachments, audit trails, and dashboards.

The best direction is not to copy every feature at once. Build a stable accounting core first, then add cloud collaboration and automation.

## Current Foundation

Already present or partially present:

- Login and registration.
- Multiple companies.
- Multi-user company access.
- Company-scoped masters and vouchers.
- Groups, ledgers, vouchers, inventory, GST, payroll, banking, and reports.
- Atomic voucher numbering for multiple users.
- Basic frontend screens.

## Priority 1: Core Accounting Reliability

These features st because everyr module depends on correct books.

### 1. Voucher Validation

Add backend validation before saving vouchers:

- Debit total must equal credit total.
- At least two accounting entries are required for journal-style vouchers.
- Ledger IDs must belong to the same company.
- Party ledger must belong to the same company.
- Stock item IDs must belong to the same company.
- Voucher date must be inside the company financial year if financial-year locking is enabled.

Implementation:

- Create `server/services/voucherValidationService.js`.
- Call it from `server/routes/vouchers.js` before create/update.
- Return clear validation messages to the frontend.

### 2. Financial Year Management

Add proper accounting periods:

- Financial year start and end.
- Active financial year selector.
- Year-wise reports.
- Lock old financial years.
- Prevent editing locked-period vouchers.

Implementation:

- Add `FinancialYear` model.
- Add company route `/api/companies/:companyId/financial-years`.
- Add current financial year to `CompanyContext`.
- Add date filters to all reports.

### 3. Audit Trail

Track every important change:

- Voucher created, edited, cancelled.
- Ledger created or edited.
- Company user added, removed, role changed.
- Login events.

Implementation:

- Add `AuditLog` model with `company`, `user`, `action`, `entityType`, `entityId`, `before`, `after`, `ip`, `createdAt`.
- Add helper `server/utils/audit.js`.
- Write logs from routes after successful changes.
- Add frontend page `/app/audit-trail`.

### 4. Soft Delete and Restore

Avoid permanent deletion for accounting records:

- Mark records as deleted.
- Hide deleted records by default.
- Add restore option for admins.

Implementation:

- Add `isDeleted`, `deletedAt`, `deletedBy` to important models.
- Replace delete routes with update operations.
- Add admin-only restore endpoints.

## Priority 2: Sales and Purchase Workflow

These features make the app feel closer to Zoho Books.

### 5. Customer and Vendor Profiles

Currently ledgers can represent parties, but business apps need richer profiles:

- Customer/vendor code.
- Billing and shipping addresses.
- GST treatment.
- Contact persons.
- Credit limit.
- Payment terms.
- Opening balance.

Implementation:

- Either extend `Ledger` with party fields or add `PartyProfile` linked to a ledger.
- Add screens under Masters: Customers and Vendors.
- Reuse ledgers internally for accounting.

### 6. Estimates, Sales Orders, Delivery Notes, and Invoices

Add sales document flow:

```text
Estimate -> Sales Order -> Delivery Note -> Sales Invoice -> Receipt
```

Implementation:

- Extend `Voucher` or create `Document` model for non-accounting documents.
- Add conversion endpoints like `/convert-to-invoice`.
- Track document status: draft, sent, accepted, invoiced, cancelled.

### 7. Purchase Orders, Bills, and Payments

Add purchase workflow:

```text
Purchase Order -> Receipt Note -> Purchase Bill -> Payment
```

Implementation:

- Add purchase order screens.
- Link purchase bill to inventory receipt.
- Add vendor outstanding reports.

### 8. PDF Invoice Templates

Add printable professional invoices:

- Company logo.
- GST invoice format.
- HSN/SAC details.
- Bank details.
- Terms and conditions.
- Customer shipping address.

Implementation:

- Add server-side PDF generation or frontend print templates.
- Create template settings per company.
- Store invoice PDF metadata.

## Priority 3: Inventory Like Tally Prime

### 9. Inventory Valuation

Add valuation methods:

- FIFO.
- Weighted average.
- Standard cost.

Implementation:

- Add stock movement service.
- Calculate movement from vouchers.
- Store optional valuation snapshots for performance.

### 10. Batch, Expiry, and Serial Number Tracking

Useful for medicine, electronics, spare parts, and wholesale businesses.

Implementation:

- Extend voucher item lines with batch and serial fields.
- Add batch stock report.
- Add expiry report.

### 11. Reorder Level and Low Stock Alerts

Implementation:

- Add `reorderLevel`, `minimumStock`, `maximumStock` to `StockItem`.
- Add dashboard widget for low stock.
- Add report `/inventory/reorder`.

## Priority 4: Banking and Payments

### 12. Bank Import

Import bank statements:

- CSV upload.
- Excel upload.
- Auto-match by date, amount, and narration.
- Manual reconciliation.

Implementation:

- Add upload endpoint.
- Add `BankStatementLine` model.
- Add matching service.
- Add reconciliation UI.

### 13. Payment Reminders

Zoho-style reminders:

- Due date based on payment terms.
- Reminder templates.
- Email reminders.
- Reminder history.

Implementation:

- Add `PaymentReminder` model.
- Add scheduled job or manual send first.
- Use existing `nodemailer` dependency.

## Priority 5: GST and Compliance

### 14. Better GST Reports

Add:

- GSTR-1 sections.
- GSTR-3B summary.
- HSN summary.
- GST mismatch checks.
- Missing GSTIN report.
- Reverse charge report.

Implementation:

- Move GST calculations to `server/services/gstService.js`.
- Add export to Excel/CSV.
- Add validations while saving invoices.

### 15. E-Invoice and E-Way Bill Ready Data

Even if direct portal integration comes later, prepare the data:

- IRN field.
- Ack number/date.
- Transport details.
- Vehicle number.
- Distance.
- E-way bill number.

Implementation:

- Extend voucher invoice fields.
- Add JSON export format for integration later.

## Priority 6: Collaboration and Controls

### 16. Role Permissions Matrix

Current roles are basic. Add detailed permissions:

- View reports.
- Create vouchers.
- Edit vouchers.
- Cancel vouchers.
- Manage users.
- Manage company settings.
- Export data.

Implementation:

- Add `permissions` to company members or create `Role` model.
- Add middleware `requirePermission(permissionName)`.
- Add role management screen.

### 17. Approval Workflow

Add approval before posting:

- Draft voucher.
- Submitted voucher.
- Approved voucher.
- Rejected voucher.

Implementation:

- Add `status` to `Voucher`.
- Only approved vouchers affect final reports.
- Add approval queue page.

### 18. Comments and Attachments

Implementation:

- Add `Attachment` model.
- Store file metadata and path/cloud URL.
- Add comments on vouchers and parties.
- Add upload UI.

## Priority 7: Dashboards and User Experience

### 19. Business Dashboard

Add:

- Cash and bank balance.
- Receivables and payables.
- Sales this month.
- Purchases this month.
- Profit estimate.
- Low stock.
- GST payable.
- Pending approvals.

Implementation:

- Add `/api/companies/:companyId/dashboard/summary`.
- Compute from vouchers and ledgers.
- Cache if performance becomes slow.

### 20. Command Menu and Fast Entry

Tally users like keyboard speed.

Add:

- Global search.
- Command menu.
- Keyboard shortcuts.
- Fast ledger creation inside voucher entry.

Implementation:

- Add `Ctrl+K` command palette.
- Add search endpoint across ledgers, vouchers, stock items, reports.

## Priority 8: Data Import, Export, and Backup

### 21. Import Masters

Import from CSV/Excel:

- Ledgers.
- Stock items.
- Customers.
- Vendors.
- Opening balances.

Implementation:

- Add upload and preview step.
- Validate rows before final import.
- Show failed rows with reasons.

### 22. Export Reports

Add export to:

- PDF.
- Excel.
- CSV.

Implementation:

- Existing `printExport.js` can be expanded.
- Add backend CSV export for large reports.

### 23. Backup and Restore

Add company-wise export:

- Company profile.
- Masters.
- Vouchers.
- Inventory.
- Payroll.

Implementation:

- Add admin-only `/backup` endpoint.
- Export JSON archive.
- Add restore endpoint with validation.

## Suggested Build Phases

### Phase 1: Make the Accounting Core Strong

Build:

- Voucher validation.
- Financial years.
- Audit trail.
- Soft delete.
- Better error messages in frontend.

Why:

These reduce wrong accounting entries and make multi-user use safer.

### Phase 2: Add Real Sales and Purchase Workflows

Build:

- Customers and vendors.
- Sales invoice template.
- Sales order to invoice.
- Purchase order to bill.
- Receivables/payables improvements.

Why:

This makes the app useful for daily business operations, not just accounting entry.

### Phase 3: Improve Inventory

Build:

- Stock movement service.
- FIFO or weighted-average valuation.
- Batch/expiry tracking.
- Low-stock dashboard.

Why:

Inventory is a major Tally Prime feature and needs reliable calculations.

### Phase 4: Add Compliance and Exports

Build:

- GST validations.
- Better GSTR reports.
- Excel/PDF export.
- E-invoice-ready fields.

Why:

Businesses need clean tax and reporting outputs.

### Phase 5: Add Zoho-Style Automation

Build:

- Payment reminders.
- Bank import and auto-match.
- Attachments.
- Approval workflows.
- Role permission matrix.

Why:

These features make the app feel modern and cloud-friendly.

## Recommended Next Implementation Sprint

Start with these 5 tasks:

1. Add voucher validation service.
2. Add audit trail model and helper.
3. Add financial year model and company setting.
4. Add customers and vendors pages linked to ledgers.
5. Add professional GST invoice print template.

This sprint gives the biggest improvement without touching every part of the app at once.

## Technical Notes

Keep these rules while adding features:

- Never query accounting data without `company`.
- Never trust frontend company IDs without backend membership checks.
- Keep accounting calculations in backend services, not scattered across routes.
- Add indexes for large reports.
- Use atomic counters for all generated numbers.
- Add audit logs before adding complex approvals.
- Prefer soft delete for accounting records.

## Future Advanced Features

After the core is stable:

- Mobile-friendly voucher entry.
- WhatsApp invoice sharing.
- Email invoice sending.
- Recurring invoices.
- Subscription billing.
- Multi-branch accounting.
- Multi-currency accounting.
- TDS/TCS.
- Budgeting.
- Cost center profitability.
- Project accounting.
- API keys for integrations.
- Webhooks.
- Cloud storage for attachments.
- AI assistant for asking business questions from reports.
