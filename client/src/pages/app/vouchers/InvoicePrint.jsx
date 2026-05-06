import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCompany } from '../../../context/useCompany';
import api from '../../../utils/api';
import { FiPrinter, FiArrowLeft } from 'react-icons/fi';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const date = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function InvoicePrint() {
  const { id } = useParams();
  const { company } = useCompany();
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?._id || !id) return;
    api.get(`/companies/${company._id}/vouchers/${id}`)
      .then((res) => setVoucher(res.data.data))
      .finally(() => setLoading(false));
  }, [company?._id, id]);

  if (loading) return <div className="py-16 text-center text-gray-400">Loading invoice...</div>;
  if (!voucher) return <div className="py-16 text-center text-gray-400">Invoice not found</div>;

  const party = voucher.party || {};
  const bankLedger = voucher.entries?.find((entry) => /bank|cash/i.test(entry.ledger?.name || ''))?.ledger;
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex justify-between items-center no-print">
        <Link to="/app/vouchers" className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#003087]"><FiArrowLeft /> Back to vouchers</Link>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-[#003087] text-white text-sm font-semibold rounded-lg"><FiPrinter /> Print Invoice</button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 print:shadow-none print:border-gray-300">
        <div className="border-b-2 border-[#003087] pb-5 flex justify-between gap-6">
          <div>
            <div className="text-2xl font-extrabold text-[#003087]">{company?.legalName || company?.name}</div>
            <div className="text-sm text-gray-600 mt-1 whitespace-pre-line">{company?.address}</div>
            <div className="text-sm text-gray-600">{[company?.city, company?.state, company?.pincode].filter(Boolean).join(', ')}</div>
            <div className="text-sm text-gray-600">{company?.phone} {company?.email ? `| ${company.email}` : ''}</div>
            {company?.gstin && <div className="text-sm font-semibold text-gray-800 mt-1">GSTIN: {company.gstin}</div>}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">TAX INVOICE</div>
            <div className="text-sm text-gray-500 mt-2">Invoice No</div>
            <div className="text-lg font-bold text-gray-900">{voucher.voucherNo}</div>
            <div className="text-sm text-gray-500 mt-2">Invoice Date</div>
            <div className="font-semibold">{date(voucher.date)}</div>
            {voucher.reference && <div className="text-sm text-gray-600 mt-2">Ref: {voucher.reference}</div>}
            {voucher.irn && <div className="text-xs text-gray-500 mt-2 max-w-xs break-all">IRN: {voucher.irn}</div>}
            {voucher.ackNo && <div className="text-xs text-gray-500">Ack: {voucher.ackNo} {voucher.ackDate ? `| ${date(voucher.ackDate)}` : ''}</div>}
            {(voucher.ewayBillNo || voucher.ewaybill) && <div className="text-xs text-gray-500">E-Way Bill: {voucher.ewayBillNo || voucher.ewaybill}</div>}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 py-6 border-b border-gray-200">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-2">Bill To</div>
            <div className="font-bold text-gray-900">{party.name}</div>
            <div className="text-sm text-gray-600 whitespace-pre-line">{party.billingAddress || party.address}</div>
            {party.gstin && <div className="text-sm text-gray-800 mt-1">GSTIN: {party.gstin}</div>}
            {party.email && <div className="text-sm text-gray-600">{party.email}</div>}
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-2">Ship To</div>
            <div className="text-sm text-gray-600 whitespace-pre-line">{party.shippingAddress || party.address || voucher.placeOfSupply}</div>
            <div className="text-sm text-gray-600 mt-2">Place of Supply: <span className="font-semibold text-gray-800">{voucher.placeOfSupply || '-'}</span></div>
            <div className="text-sm text-gray-600">Tax Type: <span className="font-semibold text-gray-800">{voucher.isIGST ? 'IGST' : 'CGST + SGST'}</span></div>
            {voucher.vehicleNo && <div className="text-sm text-gray-600">Vehicle No: <span className="font-semibold text-gray-800">{voucher.vehicleNo}</span></div>}
          </div>
        </div>

        <table className="w-full text-sm mt-6">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-200">
              {['#', 'Item', 'HSN/SAC', 'Qty', 'Rate', 'Taxable', 'GST', 'Total'].map((h, i) => (
                <th key={h} className={`px-3 py-3 text-xs font-bold text-gray-500 uppercase ${i > 2 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {voucher.items?.map((line, index) => {
              const lineTax = Number(line.cgst || 0) + Number(line.sgst || 0) + Number(line.igst || 0);
              return (
                <tr key={index}>
                  <td className="px-3 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-3 py-3 font-semibold text-gray-900">{line.item?.name || line.description || '-'}</td>
                  <td className="px-3 py-3 text-gray-500">{line.hsnCode || line.item?.hsnCode || '-'}</td>
                  <td className="px-3 py-3 text-right">{fmt(line.qty)} {line.unit?.symbol || ''}</td>
                  <td className="px-3 py-3 text-right">{fmt(line.rate)}</td>
                  <td className="px-3 py-3 text-right">{fmt(line.amount)}</td>
                  <td className="px-3 py-3 text-right">{fmt(lineTax)}<div className="text-xs text-gray-400">{line.gstRate || 0}%</div></td>
                  <td className="px-3 py-3 text-right font-semibold">{fmt(Number(line.amount || 0) + lineTax)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end mt-6">
          <div className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt(voucher.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{fmt(voucher.totalCGST)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{fmt(voucher.totalSGST)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{fmt(voucher.totalIGST)}</span></div>
            {Number(voucher.roundOff || 0) !== 0 && <div className="flex justify-between"><span className="text-gray-500">Round Off</span><span>{fmt(voucher.roundOff)}</span></div>}
            <div className="flex justify-between border-t-2 border-gray-900 pt-3 text-lg font-extrabold"><span>Total</span><span>Rs {fmt(voucher.total)}</span></div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-10 pt-6 border-t border-gray-200">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-2">Bank Details</div>
            <div className="text-sm text-gray-600">
              <div>Bank: {bankLedger?.bankName || company?.bankName || '-'}</div>
              <div>Account No: {bankLedger?.accountNo || '-'}</div>
              <div>IFSC: {bankLedger?.ifscCode || '-'}</div>
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase mt-5 mb-2">Terms and Conditions</div>
            <div className="text-sm text-gray-600 whitespace-pre-line">{voucher.terms || 'Payment is due as per agreed terms. Goods once sold are subject to the applicable return policy.'}</div>
          </div>
          <div className="text-right flex flex-col justify-end">
            <div className="h-16" />
            <div className="border-t border-gray-400 pt-2 text-sm font-semibold text-gray-800">Authorised Signatory</div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .no-print, aside, header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
        }
      `}</style>
    </div>
  );
}
