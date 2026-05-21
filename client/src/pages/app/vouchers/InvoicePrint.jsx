import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';
import { FiArrowLeft, FiPrinter } from 'react-icons/fi';

const GST_STATE_CODES = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  punjab: '03',
  chandigarh: '04',
  uttarakhand: '05',
  haryana: '06',
  delhi: '07',
  rajasthan: '08',
  'uttar pradesh': '09',
  bihar: '10',
  sikkim: '11',
  'arunachal pradesh': '12',
  nagaland: '13',
  manipur: '14',
  mizoram: '15',
  tripura: '16',
  meghalaya: '17',
  assam: '18',
  'west bengal': '19',
  jharkhand: '20',
  odisha: '21',
  chhattisgarh: '22',
  'madhya pradesh': '23',
  gujarat: '24',
  'dadra and nagar haveli and daman and diu': '26',
  maharashtra: '27',
  'andhra pradesh': '37',
  karnataka: '29',
  goa: '30',
  lakshadweep: '31',
  kerala: '32',
  'tamil nadu': '33',
  puducherry: '34',
  'andaman and nicobar islands': '35',
  telangana: '36',
  ladakh: '38',
};

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const displayText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return '';
};

const text = (...values) => values.map(displayText).find(Boolean) || '';

const fmtMoney = (value) => asNumber(value).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtQty = (value) => {
  const number = asNumber(value);
  return number.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
    maximumFractionDigits: 3,
  });
};

const fmtDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }).replaceAll(' ', '-');
};

const normaliseState = (value = '') => String(value).trim().toLowerCase().replace(/\s+/g, ' ');

const getStateCode = (state, gstin) => {
  const fromGstin = String(gstin || '').match(/^\d{2}/)?.[0];
  if (fromGstin) return fromGstin;
  return GST_STATE_CODES[normaliseState(state)] || '';
};

const stateLine = (state, gstin) => {
  if (!state && !gstin) return '';
  const code = getStateCode(state, gstin);
  return `State Name :  ${state || '-'}${code ? `, Code : ${code}` : ''}`;
};

const addressLines = (...parts) => parts
  .flatMap((part) => String(part || '').split(/\r?\n/))
  .map((part) => part.trim())
  .filter(Boolean);

const twoDigitWords = (number) => {
  if (number < 20) return ONES[number];
  return [TENS[Math.floor(number / 10)], ONES[number % 10]].filter(Boolean).join(' ');
};

const threeDigitWords = (number) => {
  const hundred = Math.floor(number / 100);
  const rest = number % 100;
  return [
    hundred ? `${ONES[hundred]} Hundred` : '',
    rest ? twoDigitWords(rest) : '',
  ].filter(Boolean).join(' ');
};

const integerToIndianWords = (value) => {
  let number = Math.floor(Math.abs(asNumber(value)));
  if (!number) return 'Zero';

  const parts = [];
  const groups = [
    ['Crore', 10000000],
    ['Lakh', 100000],
    ['Thousand', 1000],
    ['Hundred', 100],
  ];

  groups.forEach(([label, divisor]) => {
    const chunk = Math.floor(number / divisor);
    if (chunk) {
      parts.push(`${chunk < 100 ? twoDigitWords(chunk) : threeDigitWords(chunk)} ${label}`);
      number %= divisor;
    }
  });

  if (number) parts.push(twoDigitWords(number));
  return parts.join(' ');
};

const amountInWords = (amount, currency = 'INR') => {
  const value = asNumber(amount);
  const whole = Math.floor(Math.abs(value));
  const paise = Math.round((Math.abs(value) - whole) * 100);
  const prefix = value < 0 ? 'Minus ' : '';
  const paiseText = paise ? ` and ${integerToIndianWords(paise)} Paise` : '';
  return `${prefix}${currency || 'INR'} ${integerToIndianWords(whole)}${paiseText} Only`;
};

const taxFromEntries = (entries = [], pattern) => entries.reduce((sum, entry) => {
  const name = entry.ledger?.name || '';
  return pattern.test(name) ? sum + asNumber(entry.amount) : sum;
}, 0);

const entryLooksLikeTax = (entry) => /cgst|sgst|utgst|igst|cess|tax|round|tds|tcs/i.test(entry.ledger?.name || '');

function MetaCell({ label, value }) {
  return (
    <div className="tally-meta-cell">
      <div className="tally-muted">{label}</div>
      {value ? <div className="tally-strong tally-meta-value">{value}</div> : null}
    </div>
  );
}

function PartyBlock({ title, party, lines, state, gstin }) {
  return (
    <section className="tally-party-block">
      <div className="tally-muted">{title}</div>
      <div className="tally-strong tally-mt-1">{party || '-'}</div>
      {lines.map((line) => <div key={line}>{line}</div>)}
      {gstin ? <div>GSTIN/UIN : {gstin}</div> : null}
      {stateLine(state, gstin) ? <div>{stateLine(state, gstin)}</div> : null}
    </section>
  );
}

export default function InvoicePrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { company } = useCompany();
  const [voucherResult, setVoucherResult] = useState({ key: '', voucher: null, error: '' });
  const requestKey = company?._id && id ? `${company._id}:${id}` : '';
  const voucher = voucherResult.key === requestKey ? voucherResult.voucher : null;
  const error = voucherResult.key === requestKey ? voucherResult.error : '';
  const loading = Boolean(requestKey) && voucherResult.key !== requestKey;

  useEffect(() => {
    if (!requestKey) return undefined;

    let active = true;
    api.get(`/companies/${company._id}/vouchers/${id}`)
      .then((res) => {
        if (active) setVoucherResult({ key: requestKey, voucher: res.data.data, error: '' });
      })
      .catch((err) => {
        if (active) {
          setVoucherResult({
            key: requestKey,
            voucher: null,
            error: err.response?.data?.message || 'Invoice not found',
          });
        }
      })
    return () => {
      active = false;
    };
  }, [company?._id, id, requestKey]);

  const invoice = useMemo(() => {
    if (!voucher) return null;

    const party = voucher.party || {};
    const entries = voucher.entries || [];
    const sourceItems = Array.isArray(voucher.items) && voucher.items.length > 0
      ? voucher.items
      : entries
        .filter((entry) => entry.type === 'Cr' && !entryLooksLikeTax(entry) && String(entry.ledger?._id || entry.ledger) !== String(party._id || party))
        .map((entry) => ({
          description: entry.ledger?.name || 'Sales',
          amount: entry.amount,
          rate: entry.amount,
          qty: '',
          unit: null,
          hsnCode: '',
          cgst: 0,
          sgst: 0,
          utgst: 0,
          igst: 0,
          cess: 0,
        }));

    const items = sourceItems.map((line) => {
      const qty = line.qty === '' ? '' : asNumber(line.qty);
      const unit = text(line.unit?.symbol, line.item?.unit?.symbol, line.unit);
      const taxable = asNumber(text(line.amount, qty && line.rate ? qty * asNumber(line.rate) : 0));
      return {
        name: text(line.item?.name, line.description, line.name, 'Sales'),
        hsn: text(line.hsnCode, line.item?.hsnCode),
        qty,
        unit,
        rate: asNumber(line.rate),
        taxable,
        cgst: asNumber(line.cgst),
        sgst: asNumber(line.sgst),
        utgst: asNumber(line.utgst),
        igst: asNumber(line.igst),
        cess: asNumber(line.cess),
        gstRate: asNumber(text(line.gstRate, line.item?.gstRate)),
        discount: asNumber(line.discount),
      };
    });

    const itemSum = (key) => items.reduce((sum, line) => sum + asNumber(line[key]), 0);
    const totalCGST = asNumber(voucher.totalCGST) || itemSum('cgst') || taxFromEntries(entries, /cgst/i);
    const totalSGST = asNumber(voucher.totalSGST) || itemSum('sgst') || taxFromEntries(entries, /sgst/i);
    const totalUTGST = asNumber(voucher.totalUTGST) || itemSum('utgst') || taxFromEntries(entries, /utgst/i);
    const totalIGST = asNumber(voucher.totalIGST) || itemSum('igst') || taxFromEntries(entries, /igst/i);
    const totalCess = asNumber(voucher.totalCess) || itemSum('cess') || taxFromEntries(entries, /cess/i);
    const subtotal = asNumber(voucher.subtotal) || itemSum('taxable');
    const total = asNumber(voucher.total) || subtotal + totalCGST + totalSGST + totalUTGST + totalIGST + totalCess + asNumber(voucher.roundOff) + asNumber(voucher.tcsAmount) - asNumber(voucher.tdsAmount);

    const units = [...new Set(items.map((line) => line.unit).filter(Boolean))];
    const totalQty = items.reduce((sum, line) => sum + (line.qty === '' ? 0 : asNumber(line.qty)), 0);
    const totalQtyText = units.length === 1 && totalQty ? `${fmtQty(totalQty)} ${units[0]}` : '';
    const bankLedger = entries.find((entry) => /bank|cash/i.test(entry.ledger?.name || ''))?.ledger;

    return {
      party,
      items,
      entries,
      subtotal,
      totalCGST,
      totalSGST,
      totalUTGST,
      totalIGST,
      totalCess,
      total,
      totalQtyText,
      bankLedger,
    };
  }, [voucher]);

  if (loading) return <div className="py-16 text-center text-gray-400">Loading invoice...</div>;

  if (!company?._id) {
    return (
      <div className="py-16 text-center text-gray-500">
        Select a company before printing an invoice.
        <div className="mt-4">
          <Link to="/app/companies" className="text-[#003087] font-semibold">Go to Companies</Link>
        </div>
      </div>
    );
  }

  if (!voucher || !invoice) {
    return <div className="py-16 text-center text-gray-400">{error || 'Invoice not found'}</div>;
  }

  const party = invoice.party;
  const qp = (key, fallback = '') => {
    const value = searchParams.get(key);
    return value === null ? fallback : value;
  };

  const defaultTitleByType = {
    Sales: 'INVOICE',
    Purchase: 'PURCHASE INVOICE',
    CreditNote: 'CREDIT NOTE',
    DebitNote: 'DEBIT NOTE',
  };
  const title = qp('title', defaultTitleByType[voucher.voucherType] || `${voucher.voucherType || 'Invoice'} INVOICE`).toUpperCase();
  const copyLabels = {
    original: 'Original for Recipient',
    duplicate: 'Duplicate for Transporter',
    triplicate: 'Triplicate for Supplier',
    office: 'Office Copy',
  };
  const copyText = copyLabels[String(searchParams.get('copy') || '').toLowerCase()] || qp('copyText', '');
  const fixedRows = Math.min(Math.max(parseInt(qp('rows', '12'), 10) || 12, 8), 20);
  const showBank = qp('bank', '1') !== '0';

  const companyName = text(company.legalName, company.name);
  const companyAddress = addressLines(company.address, company.addressLine2, [company.city, company.state, company.pincode].filter(Boolean).join(', '));
  const partyAddress = addressLines(party.billingAddress, party.address);
  const shipAddress = addressLines(party.shippingAddress, party.address, qp('shipTo', ''));
  const partyName = text(party.name, 'Party');
  const partyGstin = text(voucher.partyGstin, party.gstin);
  const partyState = text(party.state, voucher.placeOfSupply);
  const companyState = text(company.state, voucher.placeOfSupply);

  const taxRows = [
    ['CGST TAX', invoice.totalCGST],
    ['SGST TAX', invoice.totalSGST],
    ['UTGST TAX', invoice.totalUTGST],
    ['IGST TAX', invoice.totalIGST],
    ['CESS', invoice.totalCess],
    ['TCS', voucher.tcsAmount],
    ['ROUND OFF', voucher.roundOff],
  ].filter(([, value]) => Math.abs(asNumber(value)) > 0.0001);

  const itemRowsUsed = invoice.items.length + taxRows.length;
  const fillerRows = Array.from({ length: Math.max(fixedRows - itemRowsUsed, 0) });
  const invoiceCurrency = text(voucher.currency, company.currency, 'INR');
  const dispatchThrough = qp('dispatchedThrough', text(voucher.transporterName, voucher.transportMode));
  const destination = qp('destination', text(voucher.placeOfSupply, partyState));
  const terms = qp('terms', text(voucher.terms, voucher.narration));
  const bankName = text(invoice.bankLedger?.bankName, company.bankName);
  const accountNo = text(invoice.bankLedger?.accountNo, company.accountNo);
  const ifscCode = text(invoice.bankLedger?.ifscCode, company.ifscCode);

  return (
    <div className="tally-print-screen">
      <div className="tally-toolbar no-print">
        <Link to="/app/vouchers" className="tally-toolbar-link"><FiArrowLeft /> Back to vouchers</Link>
        <button onClick={() => window.print()} className="tally-toolbar-button"><FiPrinter /> Print Invoice</button>
      </div>

      <article className="tally-page">
        <header className="tally-invoice-heading">
          <div>{title}</div>
          {copyText ? <span>{copyText}</span> : null}
        </header>

        <div className="tally-frame">
          <section className="tally-top-grid">
            <div className="tally-left-stack">
              <section className="tally-seller-block">
                <div className="tally-company-name">{companyName}</div>
                {companyAddress.map((line) => <div key={line}>{line}</div>)}
                {company.gstin ? <div>GSTIN/UIN : {company.gstin}</div> : null}
                {company.pan ? <div>PAN/IT No : {company.pan}</div> : null}
                {stateLine(companyState, company.gstin) ? <div>{stateLine(companyState, company.gstin)}</div> : null}
              </section>

              <PartyBlock
                title="Consignee (Ship to)"
                party={partyName}
                lines={shipAddress}
                state={partyState}
                gstin={partyGstin}
              />

              <PartyBlock
                title="Buyer (Bill to)"
                party={partyName}
                lines={partyAddress}
                state={partyState}
                gstin={partyGstin}
              />
            </div>

            <div className="tally-right-stack">
              <div className="tally-meta-grid">
                <MetaCell label="Invoice No." value={voucher.voucherNo} />
                <MetaCell label="Dated" value={fmtDate(voucher.date)} />
                <MetaCell label="Delivery Note" value={qp('deliveryNote', text(voucher.deliveryNote, voucher.deliveryNoteNo))} />
                <MetaCell label="Mode/Terms of Payment" value={qp('paymentTerms', text(voucher.paymentTerms, voucher.creditPeriod))} />
                <MetaCell label="Reference No. & Date." value={qp('reference', voucher.reference)} />
                <MetaCell label="Other References" value={qp('otherReferences', text(voucher.otherReferences, voucher.irn ? `IRN: ${voucher.irn}` : ''))} />
                <MetaCell label="Buyer's Order No." value={qp('buyerOrderNo', voucher.buyerOrderNo)} />
                <MetaCell label="Dated" value={qp('buyerOrderDate', fmtDate(voucher.buyerOrderDate))} />
                <MetaCell label="Dispatch Doc No." value={qp('dispatchDocNo', text(voucher.transporterDocNo, voucher.ewayBillNo, voucher.ewaybill))} />
                <MetaCell label="Delivery Note Date" value={qp('deliveryNoteDate', fmtDate(voucher.transporterDocDate))} />
                <MetaCell label="Dispatched through" value={dispatchThrough} />
                <MetaCell label="Destination" value={destination} />
              </div>
              <section className="tally-terms-block">
                <div className="tally-muted">Terms of Delivery</div>
                <div className="tally-terms-text">{terms}</div>
              </section>
            </div>
          </section>

          <table className="tally-items-table">
            <colgroup>
              <col className="col-sl" />
              <col className="col-desc" />
              <col className="col-hsn" />
              <col className="col-qty" />
              <col className="col-rate" />
              <col className="col-per" />
              <col className="col-amount" />
            </colgroup>
            <thead>
              <tr>
                <th>Sl<br />No.</th>
                <th>Description of Goods</th>
                <th>HSN/SAC</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>per</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((line, index) => (
                <tr key={`${line.name}-${index}`} className="tally-item-row">
                  <td className="center">{index + 1}</td>
                  <td>
                    <div className="tally-strong">{line.name}</div>
                    {line.gstRate ? <div className="tally-line-note">GST {line.gstRate}%</div> : null}
                    {line.discount ? <div className="tally-line-note">Less: Discount {fmtMoney(line.discount)}</div> : null}
                  </td>
                  <td className="center">{line.hsn}</td>
                  <td className="right">{line.qty === '' ? '' : `${fmtQty(line.qty)} ${line.unit}`}</td>
                  <td className="right">{line.rate ? fmtMoney(line.rate) : ''}</td>
                  <td className="center">{line.unit}</td>
                  <td className="right tally-strong">{fmtMoney(line.taxable)}</td>
                </tr>
              ))}

              {taxRows.map(([label, value]) => (
                <tr key={label} className="tally-tax-row">
                  <td />
                  <td className="center tally-italic">{label}</td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td className="right tally-strong">{fmtMoney(value)}</td>
                </tr>
              ))}

              {fillerRows.map((_, index) => (
                <tr key={`blank-${index}`} className="tally-blank-row">
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                  <td />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td />
                <td className="right tally-muted">Total</td>
                <td />
                <td className="right tally-strong">{invoice.totalQtyText}</td>
                <td />
                <td />
                <td className="right tally-grand-total">{fmtMoney(invoice.total)}</td>
              </tr>
            </tfoot>
          </table>

          <section className="tally-amount-words">
            <div>
              <div className="tally-muted">Amount Chargeable (in words)</div>
              <div className="tally-strong tally-mt-1">{amountInWords(invoice.total, invoiceCurrency)}</div>
            </div>
            <div className="tally-eoe">E. &amp; O.E</div>
          </section>

          <section className="tally-footer-grid">
            <div className="tally-declaration">
              <div className="tally-muted tally-underlined">Declaration</div>
              <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
            </div>
            <div className="tally-signature">
              <div className="tally-bank-box">
                {showBank && (bankName || accountNo || ifscCode) ? (
                  <>
                    <div className="tally-muted">Company's Bank Details</div>
                    {bankName ? <div>Bank Name : {bankName}</div> : null}
                    {accountNo ? <div>A/c No. : {accountNo}</div> : null}
                    {ifscCode ? <div>IFSC : {ifscCode}</div> : null}
                  </>
                ) : null}
              </div>
              <div className="tally-sign-box">
                <div className="tally-strong">for {companyName}</div>
                <div className="tally-muted">Authorised Signatory</div>
              </div>
            </div>
          </section>
        </div>

        <div className="tally-generated-note">This is a Computer Generated Invoice</div>
      </article>

      <style>{`
        .tally-print-screen {
          min-height: 100%;
          background: #f3f4f6;
          color: #000;
          padding: 24px;
          overflow-x: auto;
        }

        .tally-toolbar {
          width: 210mm;
          max-width: calc(100vw - 48px);
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .tally-toolbar-link,
        .tally-toolbar-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .tally-toolbar-link {
          color: #4b5563;
        }

        .tally-toolbar-button {
          background: #003087;
          color: white;
          padding: 10px 14px;
          border: 0;
        }

        .tally-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 24px;
          background: white;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.14);
          padding: 10mm;
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          line-height: 1.22;
        }

        .tally-invoice-heading {
          height: 10mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0;
        }

        .tally-invoice-heading span {
          margin-top: 1px;
          font-size: 9px;
          font-weight: 400;
        }

        .tally-frame {
          border: 1px solid #111;
        }

        .tally-top-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #111;
        }

        .tally-left-stack {
          border-right: 1px solid #111;
          min-width: 0;
        }

        .tally-seller-block {
          height: 29mm;
          padding: 3mm;
          border-bottom: 1px solid #111;
          overflow: hidden;
        }

        .tally-party-block {
          height: 35mm;
          padding: 2.5mm 3mm;
          border-bottom: 1px solid #111;
          overflow: hidden;
        }

        .tally-party-block:last-child {
          border-bottom: 0;
        }

        .tally-right-stack {
          min-width: 0;
        }

        .tally-meta-grid {
          height: 55mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: repeat(6, 1fr);
          border-bottom: 1px solid #111;
        }

        .tally-meta-cell {
          padding: 1.4mm 2mm;
          border-bottom: 1px solid #111;
          overflow: hidden;
        }

        .tally-meta-cell:nth-child(odd) {
          border-right: 1px solid #111;
        }

        .tally-meta-cell:nth-last-child(-n + 2) {
          border-bottom: 0;
        }

        .tally-meta-value {
          margin-top: 1.5mm;
          word-break: break-word;
        }

        .tally-terms-block {
          height: 44mm;
          padding: 2.5mm 3mm;
          overflow: hidden;
        }

        .tally-terms-text {
          margin-top: 2mm;
          white-space: pre-line;
        }

        .tally-company-name {
          font-weight: 700;
          font-size: 11px;
        }

        .tally-strong {
          font-weight: 700;
        }

        .tally-muted {
          color: #111;
          font-size: 9px;
        }

        .tally-italic {
          font-style: italic;
        }

        .tally-underlined {
          display: inline-block;
          border-bottom: 1px solid #111;
          margin-bottom: 1mm;
        }

        .tally-mt-1 {
          margin-top: 1.5mm;
        }

        .tally-items-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 10px;
        }

        .tally-items-table th,
        .tally-items-table td {
          border-right: 1px solid #111;
          padding: 1.3mm 1.6mm;
          vertical-align: top;
        }

        .tally-items-table th:last-child,
        .tally-items-table td:last-child {
          border-right: 0;
        }

        .tally-items-table thead th {
          height: 12mm;
          border-bottom: 1px solid #111;
          text-align: center;
          font-weight: 400;
        }

        .tally-item-row,
        .tally-tax-row,
        .tally-blank-row {
          height: 6.2mm;
        }

        .tally-line-note {
          margin-top: 0.8mm;
          font-size: 8.5px;
        }

        .tally-items-table tfoot td {
          height: 7mm;
          border-top: 1px solid #111;
          border-bottom: 1px solid #111;
          vertical-align: middle;
        }

        .tally-grand-total {
          font-size: 12px;
          font-weight: 700;
        }

        .col-sl { width: 4%; }
        .col-desc { width: 42%; }
        .col-hsn { width: 11%; }
        .col-qty { width: 12%; }
        .col-rate { width: 11%; }
        .col-per { width: 5%; }
        .col-amount { width: 15%; }

        .center {
          text-align: center;
        }

        .right {
          text-align: right;
        }

        .tally-amount-words {
          min-height: 24mm;
          display: grid;
          grid-template-columns: 1fr 34mm;
          border-bottom: 1px solid #111;
        }

        .tally-amount-words > div {
          padding: 2.5mm 3mm;
        }

        .tally-eoe {
          text-align: right;
          font-style: italic;
        }

        .tally-footer-grid {
          min-height: 38mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .tally-declaration {
          border-right: 1px solid #111;
          padding: 3mm;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }

        .tally-signature {
          display: grid;
          grid-template-rows: 1fr 17mm;
        }

        .tally-bank-box {
          padding: 2.5mm 3mm;
          overflow: hidden;
        }

        .tally-sign-box {
          border-top: 1px solid #111;
          padding: 2mm 3mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
        }

        .tally-generated-note {
          height: 10mm;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
        }

        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          html,
          body {
            background: white !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print,
          aside,
          header:not(.tally-invoice-heading) {
            display: none !important;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
          }

          .tally-print-screen {
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }

          .tally-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 10mm;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
