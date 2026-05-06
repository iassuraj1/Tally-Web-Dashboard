import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArchive,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiBriefcase,
  FiCheckCircle,
  FiCreditCard,
  FiDatabase,
  FiDownloadCloud,
  FiEdit3,
  FiFileText,
  FiHash,
  FiLock,
  FiMail,
  FiMapPin,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiRepeat,
  FiSearch,
  FiSettings,
  FiShield,
  FiSliders,
  FiTrash2,
  FiUploadCloud,
  FiUserPlus,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';
import Modal from '../../../components/app/Modal';
import { useCompany } from '../../../context/useCompany';
import api, { getApiError } from '../../../utils/api';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const DEFAULT_BRANCH = { name: '', code: '', address: '', gstin: '', isDefault: false };
const DEFAULT_CURRENCY = { code: 'INR', symbol: 'Rs', exchangeRate: 1, isBase: false };

const panelTitles = {
  profile: 'Organization Profile',
  branding: 'Branding',
  branches: 'Locations',
  general: 'General Setup',
  currencies: 'Currencies',
  tax: 'Taxes and Compliance',
  users: 'Users and Roles',
};

const settingsSections = [
  {
    title: 'Organization Settings',
    cards: [
      {
        title: 'Organization',
        icon: FiBriefcase,
        iconClass: 'text-emerald-600 bg-emerald-50',
        items: [
          { label: 'Profile', panel: 'profile' },
          { label: 'Branding', panel: 'branding' },
          { label: 'Locations', panel: 'branches' },
          { label: 'Company Directory', href: '/app/companies' },
        ],
      },
      {
        title: 'Users and Roles',
        icon: FiUsers,
        iconClass: 'text-rose-600 bg-rose-50',
        items: [
          { label: 'Users', panel: 'users' },
          { label: 'Roles and Permissions', panel: 'users' },
          { label: 'Audit Trail', href: '/app/settings/accounting-controls' },
        ],
      },
      {
        title: 'Setup and Configurations',
        icon: FiSliders,
        iconClass: 'text-orange-600 bg-orange-50',
        items: [
          { label: 'General', panel: 'general' },
          { label: 'Currencies', panel: 'currencies' },
          { label: 'Financial Years', href: '/app/settings/accounting-controls' },
          { label: 'Opening Balances', href: '/app/settings/accounting-controls' },
        ],
      },
      {
        title: 'Taxes and Compliance',
        icon: FiShield,
        iconClass: 'text-blue-600 bg-blue-50',
        items: [
          { label: 'GST and PAN', panel: 'tax' },
          { label: 'TDS and TCS', panel: 'tax' },
          { label: 'Voucher Date Guard', href: '/app/settings/accounting-controls' },
          { label: 'Audit Controls', href: '/app/settings/accounting-controls' },
        ],
      },
      {
        title: 'Automation',
        icon: FiZap,
        iconClass: 'text-red-600 bg-red-50',
        items: [
          { label: 'Approval Queue', href: '/app/vouchers/approvals' },
          { label: 'Sales Workflow', href: '/app/sales-workflow' },
          { label: 'Purchase Workflow', href: '/app/purchase-workflow' },
          { label: 'Payment Reminders', href: '/app/banking/reminders' },
        ],
      },
    ],
  },
  {
    title: 'Module Settings',
    cards: [
      {
        title: 'Tally Controls',
        icon: FiBookOpen,
        iconClass: 'text-indigo-600 bg-indigo-50',
        items: [
          { label: 'Accounting Controls', href: '/app/settings/accounting-controls' },
          { label: 'Tally Shortcuts', href: '/app/tools/tally-shortcuts' },
          { label: 'Import Masters', href: '/app/tools/import-masters' },
          { label: 'Backup and Restore', href: '/app/tools/backup' },
        ],
      },
      {
        title: 'GST',
        icon: FiFileText,
        iconClass: 'text-sky-600 bg-sky-50',
        items: [
          { label: 'GSTR-1', href: '/app/gst/gstr1' },
          { label: 'GSTR-3B', href: '/app/gst/gstr3b' },
          { label: 'HSN Summary', href: '/app/gst/hsn-summary' },
          { label: 'Mismatch Checks', href: '/app/gst/mismatch-checks' },
        ],
      },
      {
        title: 'Inventory',
        icon: FiPackage,
        iconClass: 'text-teal-600 bg-teal-50',
        items: [
          { label: 'Stock Summary', href: '/app/inventory/stock-summary' },
          { label: 'Valuation', href: '/app/inventory/valuation' },
          { label: 'Batch Stock', href: '/app/inventory/batches' },
          { label: 'Reorder Alerts', href: '/app/inventory/reorder' },
        ],
      },
      {
        title: 'Payroll',
        icon: FiCreditCard,
        iconClass: 'text-purple-600 bg-purple-50',
        items: [
          { label: 'Employees', href: '/app/payroll/employees' },
          { label: 'Pay Heads', href: '/app/payroll/pay-heads' },
          { label: 'Process Payroll', href: '/app/payroll/process' },
          { label: 'Payslips', href: '/app/payroll/payslips' },
        ],
      },
      {
        title: 'Data Tools',
        icon: FiDatabase,
        iconClass: 'text-slate-600 bg-slate-100',
        items: [
          { label: 'Advanced Features', href: '/app/tools/advanced' },
          { label: 'Master Import', href: '/app/tools/import-masters' },
          { label: 'Cloud Backup', href: '/app/tools/backup' },
          { label: 'Reports', href: '/app/reports/daybook' },
        ],
      },
    ],
  },
];

const quickTiles = [
  { label: 'Profile', icon: FiEdit3, panel: 'profile' },
  { label: 'Users', icon: FiUserPlus, panel: 'users' },
  { label: 'Controls', icon: FiLock, href: '/app/settings/accounting-controls' },
  { label: 'Backup', icon: FiDownloadCloud, href: '/app/tools/backup' },
  { label: 'Import', icon: FiUploadCloud, href: '/app/tools/import-masters' },
  { label: 'Shortcuts', icon: FiHash, href: '/app/tools/tally-shortcuts' },
];

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0b57d0] focus:ring-2 focus:ring-[#0b57d0]/15';

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const companyDraft = (company, panel) => {
  if (!company) return {};
  if (panel === 'branches') {
    return { branches: company.branches?.length ? company.branches : [{ ...DEFAULT_BRANCH, isDefault: true }] };
  }
  if (panel === 'currencies') {
    return { currencies: company.currencies?.length ? company.currencies : [{ ...DEFAULT_CURRENCY, symbol: company.currencySymbol || 'Rs', isBase: true }] };
  }
  return {
    name: company.name || '',
    legalName: company.legalName || '',
    gstin: company.gstin || '',
    pan: company.pan || '',
    cin: company.cin || '',
    address: company.address || '',
    city: company.city || '',
    state: company.state || '',
    pincode: company.pincode || '',
    country: company.country || 'India',
    phone: company.phone || '',
    email: company.email || '',
    website: company.website || '',
    logo: company.logo || '',
    currency: company.currency || 'INR',
    currencySymbol: company.currencySymbol || 'Rs',
    financialYearStart: company.financialYearStart || 4,
    bookBeginning: toDateInput(company.bookBeginning),
    tdsTcsEnabled: Boolean(company.tdsTcsEnabled),
    defaultTdsRate: company.defaultTdsRate || 0,
    defaultTcsRate: company.defaultTcsRate || 0,
  };
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function TextField({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return (
    <Field label={label}>
      <input
        type={type}
        required={required}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </Field>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <Field label={label}>
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {children}
      </select>
    </Field>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#0b57d0]" />
    </label>
  );
}

function SettingsCard({ card, onSelect }) {
  const Icon = card.icon;
  return (
    <section className="min-h-[300px] rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 pb-2 pt-4">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${card.iconClass}`}>
          <Icon size={18} />
        </span>
        <h3 className="text-base font-bold text-gray-950">{card.title}</h3>
      </div>
      <div className="px-3 pb-4 pt-2">
        {card.items.map((item) => (
          <button
            key={`${card.title}-${item.label}`}
            type="button"
            onClick={() => onSelect(item)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-blue-50 hover:text-[#0b57d0]"
          >
            <span>{item.label}</span>
            <span className="text-xs text-gray-300">/</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProfilePanel({ draft, updateDraft }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField label="Company Name" required value={draft.name} onChange={(value) => updateDraft('name', value)} />
      <TextField label="Legal Name" value={draft.legalName} onChange={(value) => updateDraft('legalName', value)} />
      <TextField label="GSTIN" value={draft.gstin} onChange={(value) => updateDraft('gstin', value.toUpperCase())} />
      <TextField label="PAN" value={draft.pan} onChange={(value) => updateDraft('pan', value.toUpperCase())} />
      <TextField label="CIN" value={draft.cin} onChange={(value) => updateDraft('cin', value.toUpperCase())} />
      <TextField label="Phone" value={draft.phone} onChange={(value) => updateDraft('phone', value)} />
      <TextField label="Email" type="email" value={draft.email} onChange={(value) => updateDraft('email', value)} />
      <TextField label="Website" value={draft.website} onChange={(value) => updateDraft('website', value)} />
      <div className="md:col-span-2">
        <TextField label="Address" value={draft.address} onChange={(value) => updateDraft('address', value)} />
      </div>
      <TextField label="City" value={draft.city} onChange={(value) => updateDraft('city', value)} />
      <TextField label="State" value={draft.state} onChange={(value) => updateDraft('state', value)} />
      <TextField label="Pincode" value={draft.pincode} onChange={(value) => updateDraft('pincode', value)} />
      <TextField label="Country" value={draft.country} onChange={(value) => updateDraft('country', value)} />
    </div>
  );
}

function BrandingPanel({ draft, updateDraft }) {
  return (
    <div className="grid gap-4 md:grid-cols-[180px_1fr]">
      <div className="grid h-36 place-items-center rounded-lg border border-gray-200 bg-gray-50">
        {draft.logo ? (
          <img src={draft.logo} alt="" className="max-h-24 max-w-32 object-contain" />
        ) : (
          <FiArchive className="text-gray-300" size={42} />
        )}
      </div>
      <div className="space-y-4">
        <TextField label="Logo URL" value={draft.logo} onChange={(value) => updateDraft('logo', value)} />
        <TextField label="Public Website" value={draft.website} onChange={(value) => updateDraft('website', value)} />
        <TextField label="Support Email" type="email" value={draft.email} onChange={(value) => updateDraft('email', value)} />
      </div>
    </div>
  );
}

function GeneralPanel({ draft, updateDraft }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SelectField label="Base Currency" value={draft.currency} onChange={(value) => updateDraft('currency', value)}>
        {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'].map((code) => <option key={code} value={code}>{code}</option>)}
      </SelectField>
      <TextField label="Currency Symbol" value={draft.currencySymbol} onChange={(value) => updateDraft('currencySymbol', value)} />
      <SelectField label="Financial Year Starts" value={draft.financialYearStart} onChange={(value) => updateDraft('financialYearStart', Number(value))}>
        {MONTHS.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
      </SelectField>
      <TextField label="Books Beginning From" type="date" value={draft.bookBeginning} onChange={(value) => updateDraft('bookBeginning', value)} />
      <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase text-blue-700">Tally Mode</div>
          <div className="mt-1 text-sm font-bold text-gray-900">F11 and F12 controls</div>
        </div>
        <div className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase text-orange-700">Zoho Mode</div>
          <div className="mt-1 text-sm font-bold text-gray-900">Search-first setup</div>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase text-emerald-700">Books</div>
          <div className="mt-1 text-sm font-bold text-gray-900">Company scoped</div>
        </div>
      </div>
    </div>
  );
}

function TaxPanel({ draft, updateDraft }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="GSTIN" value={draft.gstin} onChange={(value) => updateDraft('gstin', value.toUpperCase())} />
        <TextField label="PAN" value={draft.pan} onChange={(value) => updateDraft('pan', value.toUpperCase())} />
        <TextField label="Default TDS Rate" type="number" value={draft.defaultTdsRate} onChange={(value) => updateDraft('defaultTdsRate', Number(value))} />
        <TextField label="Default TCS Rate" type="number" value={draft.defaultTcsRate} onChange={(value) => updateDraft('defaultTcsRate', Number(value))} />
      </div>
      <ToggleRow label="Enable TDS and TCS" checked={Boolean(draft.tdsTcsEnabled)} onChange={(value) => updateDraft('tdsTcsEnabled', value)} />
    </div>
  );
}

function BranchesPanel({ draft, setDraft }) {
  const branches = draft.branches || [];
  const updateBranch = (index, key, value) => {
    setDraft((current) => ({
      ...current,
      branches: (current.branches || []).map((branch, i) => (i === index ? { ...branch, [key]: value } : branch)),
    }));
  };
  const setDefault = (index) => {
    setDraft((current) => ({
      ...current,
      branches: (current.branches || []).map((branch, i) => ({ ...branch, isDefault: i === index })),
    }));
  };
  const addBranch = () => setDraft((current) => ({ ...current, branches: [...(current.branches || []), DEFAULT_BRANCH] }));
  const removeBranch = (index) => {
    setDraft((current) => ({ ...current, branches: (current.branches || []).filter((_, i) => i !== index) }));
  };

  return (
    <div className="space-y-3">
      {branches.map((branch, index) => (
        <div key={branch._id || index} className="rounded-lg border border-gray-200 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <FiMapPin className="text-[#0b57d0]" /> Location {index + 1}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setDefault(index)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${branch.isDefault ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {branch.isDefault ? 'Default' : 'Set Default'}
              </button>
              <button type="button" onClick={() => removeBranch(index)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                <FiTrash2 size={15} />
              </button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Name" value={branch.name} onChange={(value) => updateBranch(index, 'name', value)} />
            <TextField label="Code" value={branch.code} onChange={(value) => updateBranch(index, 'code', value)} />
            <TextField label="GSTIN" value={branch.gstin} onChange={(value) => updateBranch(index, 'gstin', value.toUpperCase())} />
            <TextField label="Address" value={branch.address} onChange={(value) => updateBranch(index, 'address', value)} />
          </div>
        </div>
      ))}
      <button type="button" onClick={addBranch} className="inline-flex items-center gap-2 rounded-lg border border-[#0b57d0] px-3 py-2 text-sm font-semibold text-[#0b57d0] hover:bg-blue-50">
        <FiPlus size={14} /> Add Location
      </button>
    </div>
  );
}

function CurrenciesPanel({ draft, setDraft }) {
  const currencies = draft.currencies || [];
  const updateCurrency = (index, key, value) => {
    setDraft((current) => ({
      ...current,
      currencies: (current.currencies || []).map((currency, i) => (i === index ? { ...currency, [key]: value } : currency)),
    }));
  };
  const setBase = (index) => {
    setDraft((current) => ({
      ...current,
      currencies: (current.currencies || []).map((currency, i) => ({ ...currency, isBase: i === index })),
    }));
  };
  const addCurrency = () => setDraft((current) => ({ ...current, currencies: [...(current.currencies || []), DEFAULT_CURRENCY] }));
  const removeCurrency = (index) => {
    setDraft((current) => ({ ...current, currencies: (current.currencies || []).filter((_, i) => i !== index) }));
  };

  return (
    <div className="space-y-3">
      {currencies.map((currency, index) => (
        <div key={currency._id || index} className="grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <TextField label="Code" value={currency.code} onChange={(value) => updateCurrency(index, 'code', value.toUpperCase())} />
          <TextField label="Symbol" value={currency.symbol} onChange={(value) => updateCurrency(index, 'symbol', value)} />
          <TextField label="Exchange Rate" type="number" value={currency.exchangeRate} onChange={(value) => updateCurrency(index, 'exchangeRate', Number(value))} />
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => setBase(index)} className={`rounded-lg px-2.5 py-2 text-xs font-semibold ${currency.isBase ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {currency.isBase ? 'Base' : 'Set Base'}
            </button>
            <button type="button" onClick={() => removeCurrency(index)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
              <FiTrash2 size={15} />
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addCurrency} className="inline-flex items-center gap-2 rounded-lg border border-[#0b57d0] px-3 py-2 text-sm font-semibold text-[#0b57d0] hover:bg-blue-50">
        <FiPlus size={14} /> Add Currency
      </button>
    </div>
  );
}

function UsersPanel({
  users,
  usersLoading,
  permissionDefs,
  userForm,
  saving,
  roleDefaults,
  setUserForm,
  addUser,
  updateUser,
  toggleUserPermission,
  removeUser,
}) {
  const setRole = (role) => setUserForm((current) => ({ ...current, role, permissions: roleDefaults[role] || [] }));
  const toggleFormPermission = (permission) => {
    setUserForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  };

  return (
    <div className="space-y-5">
      <form onSubmit={addUser} className="space-y-3 rounded-lg border border-gray-200 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <input
            type="email"
            required
            placeholder="registered-user@example.com"
            value={userForm.email}
            onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
            className={inputClass}
          />
          <select value={userForm.role} onChange={(event) => setRole(event.target.value)} className={inputClass}>
            <option value="admin">Admin</option>
            <option value="accountant">Accountant</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit" disabled={saving} className="rounded-lg bg-[#0b57d0] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            Add User
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {permissionDefs.map((permission) => (
            <label key={permission.key} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-xs font-medium text-gray-600">
              <input type="checkbox" checked={userForm.permissions.includes(permission.key)} onChange={() => toggleFormPermission(permission.key)} />
              {permission.label}
            </label>
          ))}
        </div>
      </form>

      {usersLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading users...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                {permissionDefs.map((permission) => <th key={permission.key} className="px-3 py-3 text-center text-xs font-semibold uppercase text-gray-500">{permission.label}</th>)}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {user.role === 'owner' ? (
                      <span className="font-semibold text-[#0b57d0]">Owner</span>
                    ) : (
                      <select value={user.role} onChange={(event) => updateUser(user._id, { role: event.target.value })} className="rounded-lg border border-gray-200 px-2 py-1.5">
                        <option value="admin">Admin</option>
                        <option value="accountant">Accountant</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.role === 'owner' ? (
                      <span className="text-green-700">active</span>
                    ) : (
                      <select value={user.status} onChange={(event) => updateUser(user._id, { status: event.target.value })} className="rounded-lg border border-gray-200 px-2 py-1.5">
                        <option value="active">active</option>
                        <option value="disabled">disabled</option>
                      </select>
                    )}
                  </td>
                  {permissionDefs.map((permission) => (
                    <td key={`${user._id}-${permission.key}`} className="px-3 py-3 text-center">
                      {user.role === 'owner' ? (
                        <span className="font-semibold text-green-600">Yes</span>
                      ) : (
                        <input type="checkbox" checked={(user.permissions || []).includes(permission.key)} onChange={() => toggleUserPermission(user, permission.key)} />
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    {user.role !== 'owner' && (
                      <button type="button" onClick={() => removeUser(user._id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <FiTrash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={permissionDefs.length + 4} className="py-12 text-center text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const { company, setCompany, refreshFinancialYears } = useCompany();
  const [query, setQuery] = useState('');
  const [activePanel, setActivePanel] = useState(null);
  const [draft, setDraft] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [permissionDefs, setPermissionDefs] = useState([]);
  const [roleDefaults, setRoleDefaults] = useState({});
  const [userForm, setUserForm] = useState({ email: '', role: 'accountant', permissions: [] });

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      const isEditable = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;
      if (isEditable) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filteredSections = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return settingsSections;

    return settingsSections
      .map((section) => {
        const cards = section.cards
          .map((card) => {
            const cardMatches = card.title.toLowerCase().includes(term);
            const items = cardMatches
              ? card.items
              : card.items.filter((item) => item.label.toLowerCase().includes(term));
            return items.length ? { ...card, items } : null;
          })
          .filter(Boolean);
        return cards.length ? { ...section, cards } : null;
      })
      .filter(Boolean);
  }, [query]);

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const openPanel = (panel) => {
    setMessage('');
    setDraft(companyDraft(company, panel));
    setActivePanel(panel);
  };

  const handleSelect = (item) => {
    if (item.href) {
      navigate(item.href);
      return;
    }
    openPanel(item.panel);
  };

  const refreshCompany = useCallback(async () => {
    if (!company?._id) return;
    setRefreshing(true);
    setMessage('');
    try {
      const res = await api.get(`/companies/${company._id}`);
      setCompany(res.data.data);
      await refreshFinancialYears();
      setMessage('Settings refreshed.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not refresh settings'));
    } finally {
      setRefreshing(false);
    }
  }, [company, refreshFinancialYears, setCompany]);

  const loadUsers = useCallback(async () => {
    if (!company?._id) return;
    setUsersLoading(true);
    setMessage('');
    try {
      const [usersRes, permissionsRes] = await Promise.all([
        api.get(`/companies/${company._id}/users`),
        api.get(`/companies/${company._id}/permissions`),
      ]);
      const permissions = permissionsRes.data.data?.permissions || [];
      const defaults = permissionsRes.data.data?.roleDefaults || {};
      setUsers(usersRes.data.data || []);
      setPermissionDefs(permissions);
      setRoleDefaults(defaults);
      setUserForm((current) => ({
        ...current,
        permissions: current.permissions.length ? current.permissions : defaults[current.role] || [],
      }));
    } catch (err) {
      setMessage(getApiError(err, 'Could not load users'));
    } finally {
      setUsersLoading(false);
    }
  }, [company]);

  useEffect(() => {
    if (activePanel !== 'users') return undefined;
    const id = setTimeout(loadUsers, 0);
    return () => clearTimeout(id);
  }, [activePanel, loadUsers]);

  const saveCompanyPatch = async (patch, successMessage) => {
    if (!company?._id) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await api.put(`/companies/${company._id}`, patch);
      setCompany(res.data.data);
      setActivePanel(null);
      setMessage(successMessage);
    } catch (err) {
      setMessage(getApiError(err, 'Could not save settings'));
    } finally {
      setSaving(false);
    }
  };

  const submitPanel = async (event) => {
    event.preventDefault();
    if (activePanel === 'profile') {
      await saveCompanyPatch({
        name: draft.name,
        legalName: draft.legalName,
        gstin: draft.gstin,
        pan: draft.pan,
        cin: draft.cin,
        address: draft.address,
        city: draft.city,
        state: draft.state,
        pincode: draft.pincode,
        country: draft.country,
        phone: draft.phone,
        email: draft.email,
        website: draft.website,
      }, 'Organization profile saved.');
      return;
    }
    if (activePanel === 'branding') {
      await saveCompanyPatch({ logo: draft.logo, website: draft.website, email: draft.email }, 'Branding saved.');
      return;
    }
    if (activePanel === 'general') {
      await saveCompanyPatch({
        currency: draft.currency,
        currencySymbol: draft.currencySymbol,
        financialYearStart: Number(draft.financialYearStart || 4),
        bookBeginning: draft.bookBeginning || null,
      }, 'General setup saved.');
      return;
    }
    if (activePanel === 'tax') {
      await saveCompanyPatch({
        gstin: draft.gstin,
        pan: draft.pan,
        tdsTcsEnabled: Boolean(draft.tdsTcsEnabled),
        defaultTdsRate: Number(draft.defaultTdsRate || 0),
        defaultTcsRate: Number(draft.defaultTcsRate || 0),
      }, 'Tax settings saved.');
      return;
    }
    if (activePanel === 'branches') {
      await saveCompanyPatch({ branches: draft.branches || [] }, 'Locations saved.');
      return;
    }
    if (activePanel === 'currencies') {
      await saveCompanyPatch({ currencies: draft.currencies || [] }, 'Currencies saved.');
    }
  };

  const addUser = async (event) => {
    event.preventDefault();
    if (!company?._id) return;
    setSaving(true);
    setMessage('');
    try {
      await api.post(`/companies/${company._id}/users`, userForm);
      setUserForm({ email: '', role: 'accountant', permissions: roleDefaults.accountant || [] });
      await loadUsers();
      setMessage('User added.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not add user'));
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (userId, patch) => {
    if (!company?._id) return;
    setMessage('');
    try {
      await api.patch(`/companies/${company._id}/users/${userId}`, patch);
      await loadUsers();
      setMessage('User updated.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not update user'));
    }
  };

  const toggleUserPermission = async (user, permission) => {
    const permissions = (user.permissions || []).includes(permission)
      ? user.permissions.filter((item) => item !== permission)
      : [...(user.permissions || []), permission];
    await updateUser(user._id, { permissions });
  };

  const removeUser = async (userId) => {
    if (!confirm('Remove this user from the company?')) return;
    if (!company?._id) return;
    setMessage('');
    try {
      await api.delete(`/companies/${company._id}/users/${userId}`);
      await loadUsers();
      setMessage('User removed.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not remove user'));
    }
  };

  const renderPanel = () => {
    if (activePanel === 'profile') return <ProfilePanel draft={draft} updateDraft={updateDraft} />;
    if (activePanel === 'branding') return <BrandingPanel draft={draft} updateDraft={updateDraft} />;
    if (activePanel === 'general') return <GeneralPanel draft={draft} updateDraft={updateDraft} />;
    if (activePanel === 'tax') return <TaxPanel draft={draft} updateDraft={updateDraft} />;
    if (activePanel === 'branches') return <BranchesPanel draft={draft} setDraft={setDraft} />;
    if (activePanel === 'currencies') return <CurrenciesPanel draft={draft} setDraft={setDraft} />;
    if (activePanel === 'users') {
      return (
        <UsersPanel
          users={users}
          usersLoading={usersLoading}
          permissionDefs={permissionDefs}
          userForm={userForm}
          saving={saving}
          roleDefaults={roleDefaults}
          setUserForm={setUserForm}
          addUser={addUser}
          updateUser={updateUser}
          toggleUserPermission={toggleUserPermission}
          removeUser={removeUser}
        />
      );
    }
    return null;
  };

  if (!company) return null;

  return (
    <div className="-m-4 min-h-full bg-[#f7f8fb] sm:-m-6">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900">
        Settings tuned for a Zoho-style setup center with Tally-style accounting controls.
      </div>

      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-[#0b57d0]">
              <FiSettings size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-gray-950">All Settings</h1>
              <p className="truncate text-sm font-medium text-gray-500">{company.name}</p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg xl:flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0b57d0]" size={16} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search settings ( / )"
              className="h-12 w-full rounded-xl border border-[#0b57d0]/60 bg-white pl-11 pr-4 text-sm shadow-[0_0_0_4px_rgba(11,87,208,0.10)] outline-none focus:border-[#0b57d0]"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={refreshCompany}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0b57d0] px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={refreshing}
            >
              <FiRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200"
            >
              Close Settings <FiX className="text-red-500" size={15} />
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1680px] px-4 py-8 sm:px-8">
        {message && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm">
            <FiCheckCircle className="text-[#0b57d0]" size={16} />
            {message}
          </div>
        )}

        <div className="mb-8 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {quickTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.label}
                type="button"
                onClick={() => handleSelect(tile)}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:border-[#0b57d0]/30 hover:bg-blue-50"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 text-[#0b57d0]">
                  <Icon size={17} />
                </span>
                <span className="text-sm font-bold text-gray-900">{tile.label}</span>
              </button>
            );
          })}
        </div>

        {filteredSections.length ? (
          filteredSections.map((section) => (
            <section key={section.title} className="mb-12">
              <h2 className="mb-5 text-xl font-bold text-gray-950">{section.title}</h2>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                {section.cards.map((card) => (
                  <SettingsCard key={card.title} card={card} onSelect={handleSelect} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white py-16 text-center text-sm font-medium text-gray-400">
            No settings found
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-4">
          {[
            { label: 'Email Notifications', icon: FiMail, href: '/app/tools/advanced' },
            { label: 'Schedules', icon: FiBell, href: '/app/tools/advanced' },
            { label: 'Recurring Vouchers', icon: FiRepeat, href: '/app/tools/advanced' },
            { label: 'Management Reports', icon: FiBarChart2, href: '/app/reports/daybook' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.href)}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-4 text-left shadow-sm hover:border-[#0b57d0]/30 hover:bg-blue-50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-gray-100 text-gray-600">
                  <Icon size={18} />
                </span>
                <span className="font-bold text-gray-900">{item.label}</span>
              </button>
            );
          })}
        </div>
      </main>

      <Modal isOpen={Boolean(activePanel)} onClose={() => setActivePanel(null)} title={panelTitles[activePanel] || 'Settings'} size="xl">
        {activePanel === 'users' ? (
          renderPanel()
        ) : (
          <form onSubmit={submitPanel} className="space-y-5">
            {renderPanel()}
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button type="button" onClick={() => setActivePanel(null)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-[#0b57d0] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
