import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBookOpen,
  FiBriefcase,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiDatabase,
  FiFileText,
  FiGlobe,
  FiInfo,
  FiLock,
  FiMapPin,
  FiMonitor,
  FiMoon,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiShield,
  FiSliders,
  FiSun,
  FiTrash2,
  FiUploadCloud,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';
import { useCompany } from '../../../context/useCompany';
import api, { getApiError } from '../../../utils/api';
import { GST_STATES, getGstStateFromGstin } from '../../../data/gstStates';

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

const DEFAULT_BRANCH = { name: '', code: '', address: '', state: '', gstin: '', isDefault: false };
const DEFAULT_CURRENCY = { code: 'INR', symbol: 'Rs', exchangeRate: 1, isBase: false };

const panelTitles = {
  profile: 'Organization Profile',
  branding: 'Branding',
  branches: 'Locations',
  general: 'General Setup',
  currencies: 'Currencies',
  tax: 'Taxes and Compliance',
  items: 'Items',
  users: 'All Users',
  roles: 'Roles',
  userPreferences: 'User Preferences',
  subscription: 'Manage Subscription',
};

const industries = [
  'Agency or Sales House',
  'Accounting and Finance',
  'Retail',
  'Manufacturing',
  'Services',
  'Software and IT',
];

const languages = ['English', 'Hindi', 'Gujarati', 'Tamil', 'Telugu', 'Marathi'];
const timeZones = [
  '(GMT 5:30) India Standard Time (Asia/Kolkata)',
  '(GMT 0:00) Greenwich Mean Time',
  '(GMT -5:00) Eastern Time',
  '(GMT -8:00) Pacific Time',
];
const dateFormats = [
  'dd/MM/yyyy [ 17/10/2025 ]',
  'MM/dd/yyyy [ 10/17/2025 ]',
  'yyyy-MM-dd [ 2025-10-17 ]',
  'dd-MMM-yyyy [ 17-Oct-2025 ]',
];
const dateSeparators = ['/', '-', '.'];
const companyIdLabels = ['Company ID :', 'CIN :', 'Registration No :'];
const taxIdLabels = ['Tax ID :', 'GSTIN :', 'PAN :'];
const appearanceModes = [
  {
    value: 'light',
    label: 'Light',
    description: 'Bright workspace for daytime use.',
    icon: FiSun,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow this device theme.',
    icon: FiMonitor,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Low-light workspace with dark surfaces.',
    icon: FiMoon,
  },
];
const subscriptionPlans = [
  {
    value: 'free',
    label: 'Free',
    monthly: 0,
    yearly: 0,
    includedSeats: 1,
    extraSeatMonthly: 0,
    description: 'Basic books for a single user.',
    features: ['Invoicing', 'Expense tracking', 'Simple reports'],
  },
  {
    value: 'standard',
    label: 'Standard',
    monthly: 899,
    yearly: 749,
    includedSeats: 3,
    extraSeatMonthly: 199,
    description: 'Core accounting and compliance for small teams.',
    features: ['Bank import', 'GST reports', 'Customer and vendor ledgers'],
  },
  {
    value: 'professional',
    label: 'Professional',
    monthly: 1799,
    yearly: 1499,
    includedSeats: 10,
    extraSeatMonthly: 249,
    description: 'Inventory, approvals and reminders for growing teams.',
    features: ['Inventory control', 'Approvals', 'Payment reminders'],
  },
  {
    value: 'premium',
    label: 'Premium',
    monthly: 3599,
    yearly: 2999,
    includedSeats: 25,
    extraSeatMonthly: 299,
    description: 'Advanced controls, exports and support.',
    features: ['Backup and restore', 'Role permissions', 'Priority support'],
  },
];
const subscriptionPlanOrder = subscriptionPlans.reduce((order, plan, index) => ({ ...order, [plan.value]: index }), {});
const subscriptionBillingCycles = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];
const subscriptionStatuses = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'cancelled', label: 'Cancelled' },
];
const subscriptionPaymentMethods = [
  { value: 'none', label: 'No payment method' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];
const userInviteGuidePath = '/docs/user-invite-guide/';

const settingsNavigation = [
  {
    title: 'ORGANIZATION SETTINGS',
    groups: [
      {
        title: 'Organization',
        icon: FiBriefcase,
        items: [
          { label: 'Profile', panel: 'profile' },
          { label: 'Branding', panel: 'branding' },
          { label: 'Custom Domain', href: '/app/tools/advanced' },
          { label: 'Locations', panel: 'branches', badge: 'NEW' },
          { label: 'Manage Subscription', panel: 'subscription' },
          { label: 'Company Directory', href: '/app/companies' },
        ],
      },
      {
        title: 'Users & Roles',
        icon: FiUsers,
        items: [
          { label: 'Users', panel: 'users' },
          { label: 'Roles', panel: 'roles' },
          { label: 'User Preferences', panel: 'userPreferences' },
        ],
      },
      {
        title: 'Taxes & Compliance',
        icon: FiShield,
        items: [
          { label: 'Taxes', panel: 'tax' },
          { label: 'Direct Taxes', panel: 'tax' },
          { label: 'MSME Settings', panel: 'tax' },
        ],
      },
      {
        title: 'Setup & Configurations',
        icon: FiSliders,
        items: [
          { label: 'General', panel: 'general' },
          { label: 'Currencies', panel: 'currencies' },
          { label: 'Financial Years', href: '/app/settings/accounting-controls' },
          { label: 'Opening Balances', href: '/app/settings/accounting-controls' },
        ],
      },
      {
        title: 'Customization',
        icon: FiSettings,
        items: [
          { label: 'Transaction Number Series', href: '/app/settings/accounting-controls' },
          { label: 'PDF Templates', href: '/app/tools/advanced' },
          { label: 'Email Notifications', href: '/app/tools/advanced' },
          { label: 'Reporting Tags', href: '/app/tools/advanced' },
        ],
      },
      {
        title: 'Automation',
        icon: FiZap,
        items: [
          { label: 'Workflow Rules', href: '/app/tools/advanced' },
          { label: 'Workflow Actions', href: '/app/tools/advanced' },
          { label: 'Workflow Logs', href: '/app/tools/advanced' },
          { label: 'Schedules', href: '/app/tools/advanced' },
        ],
      },
    ],
  },
  {
    title: 'MODULE SETTINGS',
    groups: [
      {
        title: 'General',
        icon: FiBookOpen,
        items: [
          { label: 'Customers and Vendors', href: '/app/masters/customers' },
          { label: 'Items', panel: 'items' },
          { label: 'Accountant', href: '/app/masters/ledgers' },
          { label: 'Projects', href: '/app/tools/advanced' },
          { label: 'Timesheet', href: '/app/tools/advanced' },
        ],
      },
      {
        title: 'Inventory',
        icon: FiPackage,
        items: [
          { label: 'Stock Groups', href: '/app/masters/stock-groups' },
          { label: 'Units', href: '/app/masters/units' },
          { label: 'Godowns', href: '/app/masters/godowns' },
          { label: 'Reorder Alerts', href: '/app/inventory/reorder' },
        ],
      },
      {
        title: 'Sales',
        icon: FiFileText,
        items: [
          { label: 'Quotes', href: '/app/sales-workflow' },
          { label: 'Sales Orders', href: '/app/sales-workflow' },
          { label: 'Invoices', href: '/app/vouchers/sales' },
          { label: 'Payments Received', href: '/app/vouchers/receipt' },
          { label: 'Credit Notes', href: '/app/vouchers/credit-note' },
        ],
      },
      {
        title: 'Purchases',
        icon: FiPackage,
        items: [
          { label: 'Expenses', href: '/app/vouchers/payment' },
          { label: 'Purchase Orders', href: '/app/purchase-workflow' },
          { label: 'Bills', href: '/app/vouchers/purchase' },
          { label: 'Payments Made', href: '/app/vouchers/payment' },
          { label: 'Vendor Credits', href: '/app/vouchers/debit-note' },
        ],
      },
      {
        title: 'Online Payments',
        icon: FiCreditCard,
        items: [
          { label: 'Customer Payments', href: '/app/banking/reminders' },
          { label: 'Vendor Payments', href: '/app/banking/reminders' },
        ],
      },
      {
        title: 'Custom Modules',
        icon: FiDatabase,
        items: [
          { label: 'Overview', href: '/app/tools/advanced' },
        ],
      },
    ],
  },
  {
    title: 'EXTENSION AND DEVELOPER',
    groups: [
      {
        title: 'Data Tools',
        icon: FiLock,
        items: [
          { label: 'Integrations & Marketplace', href: '/app/tools/advanced' },
          { label: 'Developer Space', href: '/app/tools/advanced' },
          { label: 'Backup & Restore', href: '/app/tools/backup' },
        ],
      },
    ],
  },
];

const settingsOverviewSections = [
  {
    title: 'Organization Settings',
    cards: [
      {
        tone: 'emerald',
        icon: FiBriefcase,
        blocks: [
          {
            title: 'Organization',
            items: [
              { label: 'Profile', panel: 'profile' },
              { label: 'Branding', panel: 'branding' },
              { label: 'Custom Domain', href: '/app/tools/advanced' },
              { label: 'Locations', panel: 'branches' },
              { label: 'AI Preferences', href: '/app/tools/advanced' },
              { label: 'Manage Subscription', panel: 'subscription' },
            ],
          },
        ],
      },
      {
        tone: 'rose',
        icon: FiUsers,
        blocks: [
          {
            title: 'Users & Roles',
            items: [
              { label: 'Users', panel: 'users' },
              { label: 'Roles', panel: 'roles' },
              { label: 'User Preferences', panel: 'userPreferences' },
            ],
          },
          {
            title: 'Taxes & Compliance',
            icon: FiShield,
            items: [
              { label: 'Taxes', panel: 'tax' },
              { label: 'Direct Taxes', panel: 'tax' },
              { label: 'MSME Settings', panel: 'tax' },
            ],
          },
        ],
      },
      {
        tone: 'amber',
        icon: FiSliders,
        blocks: [
          {
            title: 'Setup & Configurations',
            items: [
              { label: 'General', panel: 'general' },
              { label: 'Currencies', panel: 'currencies' },
              { label: 'Opening Balances', href: '/app/settings/accounting-controls' },
              { label: 'Reminders', href: '/app/banking/reminders' },
              { label: 'Customer Portal', href: '/app/tools/advanced' },
              { label: 'Vendor Portal', href: '/app/tools/advanced' },
            ],
          },
        ],
      },
      {
        tone: 'orange',
        icon: FiSettings,
        blocks: [
          {
            title: 'Customization',
            items: [
              { label: 'Transaction Number Series', href: '/app/settings/accounting-controls' },
              { label: 'PDF Templates', href: '/app/tools/advanced' },
              { label: 'Email Notifications', href: '/app/tools/advanced' },
              { label: 'SMS Notifications', href: '/app/tools/advanced' },
              { label: 'Reporting Tags', href: '/app/tools/advanced' },
              { label: 'Web Tabs', href: '/app/tools/advanced' },
            ],
          },
        ],
      },
      {
        tone: 'red',
        icon: FiZap,
        blocks: [
          {
            title: 'Automation',
            items: [
              { label: 'Workflow Rules', href: '/app/tools/advanced' },
              { label: 'Workflow Actions', href: '/app/tools/advanced' },
              { label: 'Workflow Logs', href: '/app/tools/advanced' },
              { label: 'Schedules', href: '/app/tools/advanced' },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Module Settings',
    cards: [
      {
        tone: 'emerald',
        icon: FiBookOpen,
        blocks: [
          {
            title: 'General',
            items: [
              { label: 'Customers and Vendors', href: '/app/masters/customers' },
              { label: 'Items', panel: 'items' },
              { label: 'Accountant', href: '/app/masters/ledgers' },
              { label: 'Projects', href: '/app/tools/advanced' },
              { label: 'Timesheet', href: '/app/tools/advanced' },
            ],
          },
        ],
      },
      {
        tone: 'rose',
        icon: FiPackage,
        blocks: [
          {
            title: 'Inventory',
            items: [
              { label: 'Embedded Barcodes', panel: 'items' },
              { label: 'Stock Groups', href: '/app/masters/stock-groups' },
              { label: 'Units', href: '/app/masters/units' },
            ],
          },
          {
            title: 'Online Payments',
            icon: FiCreditCard,
            items: [
              { label: 'Customer Payments', href: '/app/banking/reminders' },
              { label: 'Vendor Payments', href: '/app/banking/reminders' },
            ],
          },
        ],
      },
      {
        tone: 'emerald',
        icon: FiFileText,
        blocks: [
          {
            title: 'Sales',
            items: [
              { label: 'Quotes', href: '/app/sales-workflow' },
              { label: 'Sales Orders', href: '/app/sales-workflow' },
              { label: 'Delivery Challans', href: '/app/sales-workflow' },
              { label: 'Invoices', href: '/app/vouchers/sales' },
              { label: 'Recurring Invoices', href: '/app/tools/advanced' },
              { label: 'Payments Received', href: '/app/vouchers/receipt' },
              { label: 'Credit Notes', href: '/app/vouchers/credit-note' },
            ],
          },
        ],
      },
      {
        tone: 'teal',
        icon: FiPackage,
        blocks: [
          {
            title: 'Purchases',
            items: [
              { label: 'Expenses', href: '/app/vouchers/payment' },
              { label: 'Recurring Expenses', href: '/app/tools/advanced' },
              { label: 'Purchase Orders', href: '/app/purchase-workflow' },
              { label: 'Bills', href: '/app/vouchers/purchase' },
              { label: 'Recurring Bills', href: '/app/tools/advanced' },
              { label: 'Payments Made', href: '/app/vouchers/payment' },
              { label: 'Vendor Credits', href: '/app/vouchers/debit-note' },
            ],
          },
        ],
      },
      {
        tone: 'blue',
        icon: FiDatabase,
        blocks: [
          {
            title: 'Custom Modules',
            items: [
              { label: 'Overview', href: '/app/tools/advanced' },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Extension and Developer Data',
    cards: [
      {
        tone: 'blue',
        icon: FiLock,
        blocks: [
          {
            title: 'Developer Data',
            items: [
              { label: 'Integrations & Marketplace', href: '/app/tools/advanced' },
              { label: 'Developer Space', href: '/app/tools/advanced' },
              { label: 'Backup & Restore', href: '/app/tools/backup' },
            ],
          },
        ],
      },
    ],
  },
];

const overviewTones = {
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  rose: 'bg-rose-50 text-rose-600',
  teal: 'bg-teal-50 text-teal-600',
};

const editablePanels = new Set(['profile', 'branding', 'subscription', 'general', 'tax', 'branches', 'currencies', 'userPreferences']);
const usersRolePanels = new Set(['users', 'roles']);
const fullBleedPanels = new Set(['users', 'roles', 'userPreferences']);
const DEFAULT_USER_CUSTOM_FIELD_LIMIT = 135;
const DEFAULT_USER_CUSTOM_FIELD = { fieldName: '', dataType: 'Text', mandatory: false, status: 'Active' };
const userCustomFieldTypes = ['Text', 'Email', 'Phone', 'Number', 'Date', 'URL'];
const userCustomFieldStatuses = ['Active', 'Inactive'];

const titleize = (value = '') => value
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());
const normalizeProfileIdInput = (value = '') => value
  .toUpperCase()
  .replace(/\s+/g, '-')
  .replace(/[^A-Z0-9-_]/g, '')
  .slice(0, 32);
const fallbackOrganizationProfileId = (company) => (
  company?._id ? `ORG-${String(company._id).slice(-8).toUpperCase()}` : ''
);

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#0b57d0] focus:ring-2 focus:ring-[#0b57d0]/15';

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const todayDateInput = () => new Date().toISOString().slice(0, 10);
const addDaysDateInput = (value, days) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const nextRenewalDateInput = (billingCycle) => {
  const date = new Date();
  if (billingCycle === 'yearly') date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
};
const createPaymentReference = () => `PAY-${Date.now().toString(36).toUpperCase()}`;
const formatPlanPrice = (value) => (Number(value || 0) ? `Rs. ${Number(value).toLocaleString('en-IN')}` : 'Free');
const planCycleAmount = (plan, billingCycle, seats = 1) => {
  const baseMonthly = Number(plan?.[billingCycle] ?? plan?.monthly ?? 0);
  const includedSeats = Number(plan?.includedSeats || 1);
  const extraSeatMonthly = Number(plan?.extraSeatMonthly || 0);
  const paidSeats = Math.max(Number(seats || 1), includedSeats);
  const months = billingCycle === 'yearly' ? 12 : 1;
  return (baseMonthly + Math.max(0, paidSeats - includedSeats) * extraSeatMonthly) * months;
};
const formatDateText = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const companyDraft = (company, panel) => {
  if (!company) return {};
  if (panel === 'branches') {
    return { branches: company.branches?.length ? company.branches : [{ ...DEFAULT_BRANCH, isDefault: true }] };
  }
  if (panel === 'currencies') {
    return { currencies: company.currencies?.length ? company.currencies : [{ ...DEFAULT_CURRENCY, symbol: company.currencySymbol || 'Rs', isBase: true }] };
  }
  const activeUserCount = Math.max(1, company.members?.filter((member) => member.status !== 'disabled').length || 1);
  return {
    name: company.name || '',
    organizationProfileId: company.organizationProfileId || fallbackOrganizationProfileId(company),
    legalName: company.legalName || '',
    industry: company.industry || industries[0],
    gstin: company.gstin || '',
    pan: company.pan || '',
    cin: company.cin || '',
    address: company.address || '',
    addressLine2: company.addressLine2 || '',
    city: company.city || '',
    state: company.state || '',
    pincode: company.pincode || '',
    country: company.country || 'India',
    phone: company.phone || '',
    email: company.email || '',
    website: company.website || '',
    logo: company.logo || '',
    appearanceMode: company.appearanceMode || 'system',
    subscriptionPlan: company.subscriptionPlan || 'free',
    subscriptionCurrentPlan: company.subscriptionPlan || 'free',
    subscriptionStatus: company.subscriptionStatus || 'trial',
    subscriptionBillingCycle: company.subscriptionBillingCycle || 'monthly',
    subscriptionCurrentBillingCycle: company.subscriptionBillingCycle || 'monthly',
    subscriptionSeats: Math.max(activeUserCount, Number(company.subscriptionSeats || activeUserCount || 1)),
    subscriptionTrialEndsAt: toDateInput(company.subscriptionTrialEndsAt) || addDaysDateInput(company.createdAt, 14),
    subscriptionRenewalDate: toDateInput(company.subscriptionRenewalDate),
    subscriptionBillingEmail: company.subscriptionBillingEmail || company.email || '',
    subscriptionPaymentMethod: company.subscriptionPaymentMethod || 'none',
    subscriptionReference: company.subscriptionReference || '',
    subscriptionLastPaymentStatus: company.subscriptionLastPaymentStatus || 'none',
    subscriptionLastPaymentAmount: company.subscriptionLastPaymentAmount || 0,
    subscriptionLastPaymentDate: toDateInput(company.subscriptionLastPaymentDate),
    subscriptionCardLast4: company.subscriptionCardLast4 || '',
    subscriptionUserCount: activeUserCount,
    organizationLanguage: company.organizationLanguage || 'English',
    communicationLanguage: company.communicationLanguage || 'English',
    timeZone: company.timeZone || timeZones[0],
    dateFormat: company.dateFormat || dateFormats[0],
    dateSeparator: company.dateSeparator || '/',
    companyIdLabel: company.companyIdLabel || 'Company ID :',
    companyIdValue: company.companyIdValue || company.organizationProfileId || company.cin || '',
    taxIdLabel: company.taxIdLabel || 'Tax ID :',
    taxIdValue: company.taxIdValue || company.gstin || '',
    taxBasis: company.taxBasis || 'cash',
    additionalFields: company.additionalFields?.length ? company.additionalFields : [{ label: '', value: '' }],
    userCustomFields: company.userCustomFields?.length ? company.userCustomFields : [],
    userCustomFieldLimit: company.userCustomFieldLimit || DEFAULT_USER_CUSTOM_FIELD_LIMIT,
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

function SettingsOverview({ sections, onSelect }) {
  if (!sections.length) {
    return (
      <div className="grid min-h-[320px] place-items-center rounded-lg border border-dashed border-gray-200 bg-white text-sm font-medium text-gray-400">
        No settings found
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-5 text-[22px] font-semibold text-gray-950">{section.title}</h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            {section.cards.map((card) => (
              <div key={card.blocks.map((block) => block.title).join('-')} className="min-h-[250px] rounded-lg border border-gray-100 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <div className="space-y-5">
                  {card.blocks.map((block) => {
                    const Icon = block.icon || card.icon;
                    const toneClass = overviewTones[card.tone] || overviewTones.blue;
                    return (
                      <div key={block.title}>
                        <div className={`mb-3 flex items-center gap-2 rounded-md px-3 py-2 ${toneClass}`}>
                          <Icon size={18} className="shrink-0" />
                          <h3 className="min-w-0 truncate text-[15px] font-semibold text-gray-950">{block.title}</h3>
                        </div>
                        <div className="space-y-1">
                          {block.items.map((item) => (
                            <button
                              key={`${block.title}-${item.label}`}
                              type="button"
                              onClick={() => onSelect(item)}
                              className="group flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[14px] font-medium text-gray-800 hover:bg-gray-50 hover:text-[#2f8df7]"
                            >
                              <span className="min-w-0 truncate">{item.label}</span>
                              <FiChevronRight size={14} className="shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const settingsGroupKey = (sectionTitle, groupTitle) => `${sectionTitle}::${groupTitle}`;

function SettingsSidebar({ sections, activePanel, onSelect }) {
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    sections.forEach((section) => {
      section.groups.forEach((group) => {
        if (!group.items?.length) return;
        const groupActive = group.items.some((item) => item.panel === activePanel);
        if (groupActive || group.title === 'Organization') {
          initial[settingsGroupKey(section.title, group.title)] = true;
        }
      });
    });
    return initial;
  });

  const toggleGroup = (groupKey) => {
    setOpenGroups((current) => ({ ...current, [groupKey]: !current[groupKey] }));
  };

  return (
    <aside className="shrink-0 border-b border-gray-200 bg-[#fbfbfc] lg:w-[248px] lg:self-stretch lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="py-4">
        {sections.length ? sections.map((section) => (
          <div key={section.title} className="mb-5">
            <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {section.title}
            </div>
            <div>
              {section.groups.map((group) => {
                const Icon = group.icon;
                const groupActive = group.panel === activePanel || group.items?.some((item) => item.panel === activePanel);
                const rowClass = `flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] font-medium ${
                  groupActive ? 'text-gray-950' : 'text-gray-700 hover:bg-gray-100'
                }`;

                if (group.items?.length) {
                  const groupKey = settingsGroupKey(section.title, group.title);
                  const isOpen = openGroups[groupKey] ?? (groupActive || sections !== settingsNavigation);
                  return (
                    <div key={groupKey}>
                      <button type="button" onClick={() => toggleGroup(groupKey)} className={rowClass} aria-expanded={isOpen}>
                        {isOpen ? (
                          <FiChevronDown size={13} className="shrink-0 text-gray-500" />
                        ) : (
                          <FiChevronRight size={13} className="shrink-0 text-gray-500" />
                        )}
                        <Icon size={15} className="shrink-0 text-gray-500" />
                        <span className="min-w-0 flex-1 truncate">{group.title}</span>
                      </button>
                      {isOpen && (
                        <div className="space-y-0.5 pb-1 pl-9 pr-3">
                          {group.items.map((item) => {
                            const active = item.panel === activePanel;
                            return (
                              <button
                                key={`${group.title}-${item.label}`}
                                type="button"
                                onClick={() => onSelect(item)}
                                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium ${
                                  active ? 'bg-[#2f8df7] text-white' : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                {item.badge && (
                                  <span className={`rounded-sm px-1.5 py-0.5 text-[9px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'}`}>
                                    {item.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <button key={group.title} type="button" onClick={() => onSelect(group)} className={rowClass}>
                    <FiChevronRight size={13} className="shrink-0 text-gray-400" />
                    <Icon size={15} className="shrink-0 text-gray-500" />
                    <span className="min-w-0 flex-1 truncate">{group.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )) : (
          <div className="px-4 py-10 text-center text-sm font-medium text-gray-400">No settings found</div>
        )}
      </div>
    </aside>
  );
}

const profileControlClass = 'h-8 w-full rounded-md border border-gray-300 bg-white px-3 text-[13px] text-gray-800 outline-none focus:border-[#2f8df7] focus:ring-1 focus:ring-[#2f8df7]';

function HelpMark() {
  return (
    <span className="inline-grid h-3.5 w-3.5 place-items-center rounded-sm bg-gray-300 text-[10px] font-bold text-white">
      ?
    </span>
  );
}

function ProfileRow({ label, required = false, help = false, children, align = 'center' }) {
  return (
    <div className={`grid gap-2 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-8 ${align === 'start' ? 'lg:items-start' : 'lg:items-center'}`}>
      <div className="flex min-h-8 items-center gap-1.5 text-[13px] font-medium text-gray-700">
        <span className={required ? 'text-[#a23a3a]' : ''}>{label}{required ? '*' : ''}</span>
        {help && <HelpMark />}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ProfileInput({ value, onChange, placeholder = '', type = 'text', className = '' }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`${profileControlClass} ${className}`}
    />
  );
}

function ProfileSelect({ value, onChange, children, className = '' }) {
  return (
    <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={`${profileControlClass} ${className}`}>
      {children}
    </select>
  );
}

function LogoUploadControl({ value, onChange, compact = false }) {
  const inputId = useId();
  const [error, setError] = useState('');
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];

  const readFile = (file) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtension = allowedExtensions.includes(extension);
    const validMime = file.type.startsWith('image/') || file.type === '';

    if (!validExtension || !validMime) {
      setError('Upload a jpg, jpeg, png, gif or bmp image.');
      return;
    }

    if (file.size > 1024 * 1024) {
      setError('Logo must be 1MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(String(reader.result || ''));
      setError('');
    };
    reader.onerror = () => setError('Could not read the selected image.');
    reader.readAsDataURL(file);
  };

  const onFileChange = (event) => {
    readFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const onDrop = (event) => {
    event.preventDefault();
    readFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className={compact ? 'space-y-2' : ''}>
      <input
        id={inputId}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.bmp,image/jpeg,image/png,image/gif,image/bmp"
        onChange={onFileChange}
        className="sr-only"
      />
      <label
        htmlFor={inputId}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className={`flex w-full cursor-pointer items-center justify-center rounded-sm border border-dashed border-gray-300 bg-white px-4 text-[13px] font-medium text-gray-600 hover:border-[#2f8df7] hover:bg-blue-50/40 ${
          compact ? 'h-36' : 'h-[74px]'
        }`}
      >
        {value ? (
          <img src={value} alt="Organization logo" className={compact ? 'max-h-24 max-w-32 object-contain' : 'max-h-14 max-w-[190px] object-contain'} />
        ) : (
          <span className="inline-flex items-center gap-2">
            <FiUploadCloud size={16} className="text-gray-500" />
            Upload Your Organization Logo
          </span>
        )}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setError('');
            }}
            className="text-[12px] font-semibold text-red-500 hover:text-red-600"
          >
            Remove logo
          </button>
        )}
        {error && <span className="text-[12px] font-semibold text-red-500">{error}</span>}
      </div>
    </div>
  );
}

function ProfilePanel({ draft, updateDraft }) {
  const additionalFields = draft.additionalFields?.length ? draft.additionalFields : [{ label: '', value: '' }];
  const updateAdditionalField = (index, key, value) => {
    updateDraft('additionalFields', additionalFields.map((field, fieldIndex) => (
      fieldIndex === index ? { ...field, [key]: value } : field
    )));
  };
  const addAdditionalField = () => updateDraft('additionalFields', [...additionalFields, { label: '', value: '' }]);

  return (
    <div className="max-w-[880px] px-6 py-5">
      <section className="border-b border-gray-200 pb-7">
        <h3 className="mb-4 text-[15px] font-medium text-gray-700">Organization Logo</h3>
        <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
          <LogoUploadControl value={draft.logo} onChange={(value) => updateDraft('logo', value)} />
          <div className="max-w-[520px] text-[13px] leading-6 text-gray-500">
            <p className="font-semibold text-gray-700">This logo will be displayed in transaction PDFs and email notifications.</p>
            <p>Preferred Image Dimensions: 240 x 240 pixels @ 72 DPI</p>
            <p>Supported Files: jpg, jpeg, png, gif, bmp</p>
            <p>Maximum File Size: 1MB</p>
            <ProfileInput value={draft.logo} onChange={(value) => updateDraft('logo', value)} placeholder="Paste logo URL" className="mt-2 max-w-[370px]" />
          </div>
        </div>
      </section>

      <div className="space-y-5 border-b border-gray-100 py-7">
        <ProfileRow label="Organization Profile ID" required help>
          <div className="max-w-[370px]">
            <ProfileInput
              value={draft.organizationProfileId}
              onChange={(value) => updateDraft('organizationProfileId', normalizeProfileIdInput(value))}
              placeholder="ORG-XXXXXXXX"
            />
            <p className="mt-1 text-[11px] leading-4 text-gray-500">Unique ID for this organization. Use letters, numbers, hyphen or underscore.</p>
          </div>
        </ProfileRow>

        <ProfileRow label="Organization Name" required>
          <ProfileInput value={draft.name} onChange={(value) => updateDraft('name', value)} className="max-w-[370px]" />
        </ProfileRow>

        <ProfileRow label="Industry" required help>
          <ProfileSelect value={draft.industry} onChange={(value) => updateDraft('industry', value)} className="max-w-[370px]">
            {industries.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
          </ProfileSelect>
        </ProfileRow>

        <ProfileRow label="Organization Location" required>
          <ProfileSelect value={draft.country} onChange={(value) => updateDraft('country', value)} className="max-w-[370px]">
            {['India', 'United States', 'United Kingdom', 'United Arab Emirates', 'Singapore'].map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </ProfileSelect>
        </ProfileRow>

        <ProfileRow label="Organization Address" help align="start">
          <div className="max-w-[370px] space-y-2">
            <ProfileInput value={draft.address} onChange={(value) => updateDraft('address', value)} placeholder="Street 1" />
            <ProfileInput value={draft.addressLine2} onChange={(value) => updateDraft('addressLine2', value)} placeholder="Street 2" />
            <div className="grid grid-cols-2 gap-2">
              <ProfileInput value={draft.city} onChange={(value) => updateDraft('city', value)} placeholder="City" />
              <ProfileInput value={draft.pincode} onChange={(value) => updateDraft('pincode', value)} placeholder="Pin Code" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ProfileSelect value={draft.state} onChange={(value) => updateDraft('state', value)}>
                <option value="">Select state / UT</option>
                {GST_STATES.map((state) => <option key={state.code} value={state.name}>{state.code} - {state.name}</option>)}
              </ProfileSelect>
              <ProfileInput value={draft.phone} onChange={(value) => updateDraft('phone', value)} placeholder="Phone" />
            </div>
            <ProfileInput value={draft.cin} onChange={(value) => updateDraft('cin', value.toUpperCase())} placeholder="Fax Number / CIN" />
            <button type="button" className="inline-flex items-center gap-1 pt-1 text-[12px] font-semibold text-gray-600 hover:text-[#2f8df7]">
              Organization Address Format <FiChevronRight size={12} />
            </button>
          </div>
        </ProfileRow>

        <ProfileRow label="Website URL">
          <ProfileInput value={draft.website} onChange={(value) => updateDraft('website', value)} placeholder="Website URL" className="max-w-[370px]" />
        </ProfileRow>

        <ProfileRow label="Tax Basis">
          <div className="space-y-2 text-[13px] text-gray-700">
            <label className="flex items-center gap-2">
              <input type="radio" checked={draft.taxBasis === 'accrual'} onChange={() => updateDraft('taxBasis', 'accrual')} className="accent-[#2f8df7]" />
              Accrual - You owe tax when invoice is raised
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={draft.taxBasis === 'cash'} onChange={() => updateDraft('taxBasis', 'cash')} className="accent-[#2f8df7]" />
              Cash - You owe tax upon payment receipt
            </label>
          </div>
        </ProfileRow>
      </div>

      <div className="space-y-5 py-7">
        <ProfileRow label="Organization Language" help>
          <ProfileSelect value={draft.organizationLanguage} onChange={(value) => updateDraft('organizationLanguage', value)} className="max-w-[370px]">
            {languages.map((language) => <option key={language} value={language}>{language}</option>)}
          </ProfileSelect>
        </ProfileRow>

        <ProfileRow label="Communication Languages" help>
          <ProfileSelect value={draft.communicationLanguage} onChange={(value) => updateDraft('communicationLanguage', value)} className="max-w-[370px]">
            {languages.map((language) => <option key={language} value={language}>{language}</option>)}
          </ProfileSelect>
        </ProfileRow>

        <ProfileRow label="Time Zone">
          <ProfileSelect value={draft.timeZone} onChange={(value) => updateDraft('timeZone', value)} className="max-w-[370px]">
            {timeZones.map((timeZone) => <option key={timeZone} value={timeZone}>{timeZone}</option>)}
          </ProfileSelect>
        </ProfileRow>

        <ProfileRow label="Date Format">
          <div className="grid max-w-[370px] grid-cols-[1fr_104px] gap-3">
            <ProfileSelect value={draft.dateFormat} onChange={(value) => updateDraft('dateFormat', value)}>
              {dateFormats.map((format) => <option key={format} value={format}>{format}</option>)}
            </ProfileSelect>
            <ProfileSelect value={draft.dateSeparator} onChange={(value) => updateDraft('dateSeparator', value)}>
              {dateSeparators.map((separator) => <option key={separator} value={separator}>{separator}</option>)}
            </ProfileSelect>
          </div>
        </ProfileRow>

        <ProfileRow label="Company ID">
          <div className="grid max-w-[370px] grid-cols-[170px_1fr] gap-3">
            <ProfileSelect value={draft.companyIdLabel} onChange={(value) => updateDraft('companyIdLabel', value)}>
              {companyIdLabels.map((label) => <option key={label} value={label}>{label}</option>)}
            </ProfileSelect>
            <ProfileInput value={draft.companyIdValue} onChange={(value) => updateDraft('companyIdValue', value)} />
          </div>
        </ProfileRow>

        <ProfileRow label="Tax ID">
          <div className="grid max-w-[370px] grid-cols-[170px_1fr] gap-3">
            <ProfileSelect value={draft.taxIdLabel} onChange={(value) => updateDraft('taxIdLabel', value)}>
              {taxIdLabels.map((label) => <option key={label} value={label}>{label}</option>)}
            </ProfileSelect>
            <ProfileInput value={draft.taxIdValue} onChange={(value) => updateDraft('taxIdValue', value.toUpperCase())} />
          </div>
        </ProfileRow>
      </div>

      <section className="border-t border-gray-100 pb-8 pt-6">
        <h3 className="mb-3 text-[15px] font-semibold text-gray-700">Additional Fields</h3>
        <div className="max-w-[590px] overflow-hidden rounded-md border border-gray-200">
          <div className="grid grid-cols-2 bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            <div className="border-r border-gray-200 px-3 py-2">Label Name</div>
            <div className="px-3 py-2">Value</div>
          </div>
          {additionalFields.map((field, index) => (
            <div key={index} className="grid grid-cols-2 border-t border-gray-100">
              <input
                value={field.label ?? ''}
                onChange={(event) => updateAdditionalField(index, 'label', event.target.value)}
                placeholder="Label"
                className="h-8 border-r border-gray-100 px-3 text-[13px] outline-none focus:bg-blue-50/40"
              />
              <input
                value={field.value ?? ''}
                onChange={(event) => updateAdditionalField(index, 'value', event.target.value)}
                placeholder="Value"
                className="h-8 px-3 text-[13px] outline-none focus:bg-blue-50/40"
              />
            </div>
          ))}
        </div>
        <button type="button" onClick={addAdditionalField} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 hover:text-[#2f8df7]">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-[#2f8df7] text-white"><FiPlus size={11} /></span>
          New Field
        </button>
        <div className="mt-5 flex max-w-[590px] gap-2 rounded-md bg-[#eaf5ff] px-4 py-3 text-[13px] leading-5 text-gray-600">
          <FiInfo className="mt-0.5 shrink-0 text-[#2f8df7]" size={15} />
          <p>
            You can include the Company ID, Tax ID and additional fields in your organization address which will be displayed in your transaction PDFs. Configure this by selecting the required placeholders in your Organization Address Format.
          </p>
        </div>
      </section>
    </div>
  );
}

function BrandingPanel({ draft, updateDraft }) {
  const selectedMode = appearanceModes.find((mode) => mode.value === draft.appearanceMode) || appearanceModes[1];
  const SelectedIcon = selectedMode.icon;
  const previewDark = selectedMode.value === 'dark';

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-[180px_1fr]">
        <LogoUploadControl value={draft.logo} onChange={(value) => updateDraft('logo', value)} compact />
        <div className="space-y-4">
          <TextField label="Logo URL" value={draft.logo} onChange={(value) => updateDraft('logo', value)} />
          <TextField label="Public Website" value={draft.website} onChange={(value) => updateDraft('website', value)} />
          <TextField label="Support Email" type="email" value={draft.email} onChange={(value) => updateDraft('email', value)} />
        </div>
      </section>

      <section className="border-t border-gray-100 pt-6">
        <div className="mb-4">
          <h3 className="text-[15px] font-semibold text-gray-900">Appearance</h3>
          <p className="mt-1 text-[13px] text-gray-500">Choose how this organization workspace should look.</p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-3 md:grid-cols-3">
            {appearanceModes.map((mode) => {
              const Icon = mode.icon;
              const active = draft.appearanceMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => updateDraft('appearanceMode', mode.value)}
                  className={`min-h-[118px] rounded-lg border p-4 text-left transition-colors ${
                    active
                      ? 'border-[#2f8df7] bg-blue-50 shadow-[0_0_0_1px_rgba(47,141,247,0.18)]'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className={`mb-3 grid h-9 w-9 place-items-center rounded-md ${active ? 'bg-[#2f8df7] text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Icon size={17} />
                  </span>
                  <span className="block text-[14px] font-semibold text-gray-950">{mode.label}</span>
                  <span className="mt-1 block text-[12px] leading-5 text-gray-500">{mode.description}</span>
                </button>
              );
            })}
          </div>

          <div className={`rounded-lg border p-4 ${previewDark ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className={`text-[13px] font-semibold ${previewDark ? 'text-white' : 'text-gray-950'}`}>{selectedMode.label} Preview</div>
                <div className={`text-[11px] ${previewDark ? 'text-gray-400' : 'text-gray-500'}`}>{draft.name || 'Organization'}</div>
              </div>
              <span className={`grid h-8 w-8 place-items-center rounded-full ${previewDark ? 'bg-gray-800 text-blue-300' : 'bg-blue-50 text-[#2f8df7]'}`}>
                <SelectedIcon size={15} />
              </span>
            </div>
            <div className={`rounded-md border p-3 ${previewDark ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-gray-50'}`}>
              <div className="mb-3 flex gap-2">
                <span className={`h-2 w-10 rounded-full ${previewDark ? 'bg-blue-400' : 'bg-[#2f8df7]'}`} />
                <span className={`h-2 w-16 rounded-full ${previewDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
              </div>
              <div className="space-y-2">
                <span className={`block h-8 rounded-md ${previewDark ? 'bg-gray-800' : 'bg-white'}`} />
                <span className={`block h-8 rounded-md ${previewDark ? 'bg-gray-800' : 'bg-white'}`} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SubscriptionPanel({ draft, updateDraft, onPayUpgrade, saving }) {
  const [paymentDraft, setPaymentDraft] = useState({
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    upiId: '',
    bankReference: '',
  });
  const [paymentError, setPaymentError] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');
  const selectedPlan = subscriptionPlans.find((plan) => plan.value === draft.subscriptionPlan) || subscriptionPlans[0];
  const billingCycle = subscriptionBillingCycles.find((cycle) => cycle.value === draft.subscriptionBillingCycle) || subscriptionBillingCycles[0];
  const status = subscriptionStatuses.find((item) => item.value === draft.subscriptionStatus) || subscriptionStatuses[0];
  const seats = Math.max(1, Number(draft.subscriptionSeats || 1));
  const activeUsers = Math.max(1, Number(draft.subscriptionUserCount || 1));
  const currentPrice = selectedPlan[billingCycle.value] ?? selectedPlan.monthly;
  const checkoutAmount = planCycleAmount(selectedPlan, draft.subscriptionBillingCycle, seats);
  const extraSeats = Math.max(0, seats - Number(selectedPlan.includedSeats || 1));
  const currentPlanIndex = subscriptionPlanOrder[draft.subscriptionCurrentPlan] ?? 0;
  const selectedPlanIndex = subscriptionPlanOrder[draft.subscriptionPlan] ?? 0;
  const isUpgrade = selectedPlanIndex > currentPlanIndex;
  const isPlanChange = draft.subscriptionPlan !== draft.subscriptionCurrentPlan || draft.subscriptionBillingCycle !== draft.subscriptionCurrentBillingCycle;
  const paymentMethod = checkoutAmount > 0 && (!draft.subscriptionPaymentMethod || draft.subscriptionPaymentMethod === 'none')
    ? 'card'
    : draft.subscriptionPaymentMethod || 'none';
  const seatGap = Math.max(0, activeUsers - seats);
  const statusClass = draft.subscriptionStatus === 'active'
    ? 'bg-emerald-100 text-emerald-700'
    : draft.subscriptionStatus === 'past_due'
      ? 'bg-amber-100 text-amber-700'
      : draft.subscriptionStatus === 'cancelled'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-blue-100 text-blue-700';
  const lastPaymentText = draft.subscriptionLastPaymentStatus === 'paid'
    ? `${formatPlanPrice(draft.subscriptionLastPaymentAmount)} on ${formatDateText(draft.subscriptionLastPaymentDate)}`
    : 'No completed payment';

  const choosePlan = (plan) => {
    updateDraft('subscriptionPlan', plan.value);
    updateDraft('subscriptionSeats', Math.max(activeUsers, seats, Number(plan.includedSeats || 1)));
    if (plan.monthly > 0 && draft.subscriptionPaymentMethod === 'none') updateDraft('subscriptionPaymentMethod', 'card');
  };

  const updatePaymentDraft = (key, value) => {
    setPaymentDraft((current) => ({ ...current, [key]: value }));
    setPaymentError('');
    setPaymentNotice('');
  };

  const recordUpgradePayment = async () => {
    setPaymentError('');
    setPaymentNotice('');
    if (!onPayUpgrade) return;

    if (seatGap > 0) {
      setPaymentError(`Increase purchased seats to at least ${activeUsers} before upgrading.`);
      return;
    }

    if (checkoutAmount > 0 && paymentMethod === 'none') {
      setPaymentError('Select a payment method to continue.');
      return;
    }

    const cardDigits = paymentDraft.cardNumber.replace(/\D/g, '');
    if (paymentMethod === 'card' && checkoutAmount > 0) {
      if (!paymentDraft.cardName.trim() || cardDigits.length < 12 || !paymentDraft.cardExpiry.trim() || paymentDraft.cardCvv.trim().length < 3) {
        setPaymentError('Enter valid card holder, card number, expiry and CVV details.');
        return;
      }
    }

    if (paymentMethod === 'upi' && checkoutAmount > 0 && !/^[\w.-]+@[\w.-]+$/.test(paymentDraft.upiId.trim())) {
      setPaymentError('Enter a valid UPI ID.');
      return;
    }

    if (paymentMethod === 'bank_transfer' && checkoutAmount > 0 && paymentDraft.bankReference.trim().length < 4) {
      setPaymentError('Enter the bank transfer UTR/reference number.');
      return;
    }

    const generatedReference = createPaymentReference();
    const paymentReference = paymentMethod === 'bank_transfer'
      ? paymentDraft.bankReference.trim()
      : generatedReference;
    const patch = {
      subscriptionPlan: draft.subscriptionPlan || 'free',
      subscriptionStatus: 'active',
      subscriptionBillingCycle: draft.subscriptionBillingCycle || 'monthly',
      subscriptionSeats: seats,
      subscriptionTrialEndsAt: draft.subscriptionTrialEndsAt || null,
      subscriptionRenewalDate: nextRenewalDateInput(draft.subscriptionBillingCycle),
      subscriptionBillingEmail: draft.subscriptionBillingEmail || '',
      subscriptionPaymentMethod: checkoutAmount > 0 ? paymentMethod : 'none',
      subscriptionReference: checkoutAmount > 0 ? paymentReference : 'FREE-ACTIVATION',
      subscriptionLastPaymentStatus: checkoutAmount > 0 ? 'paid' : 'none',
      subscriptionLastPaymentAmount: checkoutAmount,
      subscriptionLastPaymentDate: todayDateInput(),
      subscriptionCardLast4: paymentMethod === 'card' ? cardDigits.slice(-4) : '',
    };

    const saved = await onPayUpgrade(patch);
    if (saved) {
      setPaymentNotice(checkoutAmount > 0 ? 'Payment recorded and subscription upgraded.' : 'Free plan activated.');
      setPaymentDraft({ cardName: '', cardNumber: '', cardExpiry: '', cardCvv: '', upiId: '', bankReference: '' });
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase text-blue-700">Current Subscription</div>
              <h3 className="mt-2 text-2xl font-semibold text-gray-950">{selectedPlan.label}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">{selectedPlan.description}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>{status.label}</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-blue-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase text-gray-500">Amount</div>
              <div className="mt-1 text-lg font-semibold text-gray-950">
                {formatPlanPrice(currentPrice)}
                {currentPrice > 0 && <span className="ml-1 text-xs font-medium text-gray-500">/ month</span>}
              </div>
              <div className="mt-1 text-xs text-gray-500">{billingCycle.label} billing</div>
            </div>
            <div className="rounded-md border border-blue-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase text-gray-500">Seats</div>
              <div className="mt-1 text-lg font-semibold text-gray-950">{activeUsers}/{seats} used</div>
              <div className="mt-1 text-xs text-gray-500">{selectedPlan.includedSeats} included in {selectedPlan.label}</div>
            </div>
            <div className="rounded-md border border-blue-100 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase text-gray-500">Renewal</div>
              <div className="mt-1 text-lg font-semibold text-gray-950">{formatDateText(draft.subscriptionRenewalDate)}</div>
              <div className="mt-1 text-xs text-gray-500">Trial ends {formatDateText(draft.subscriptionTrialEndsAt)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-950">
            <FiCreditCard className="text-[#2f8df7]" size={17} />
            Billing Summary
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Billing cycle</span>
              <span className="font-semibold text-gray-900">{billingCycle.label}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Payment method</span>
              <span className="font-semibold text-gray-900">
                {subscriptionPaymentMethods.find((method) => method.value === draft.subscriptionPaymentMethod)?.label || 'No payment method'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Billing contact</span>
              <span className="max-w-[170px] truncate font-semibold text-gray-900">{draft.subscriptionBillingEmail || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Last payment</span>
              <span className="max-w-[170px] truncate font-semibold text-gray-900">{lastPaymentText}</span>
            </div>
          </div>
          {seatGap > 0 && (
            <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-gray-700">
              Active users exceed purchased seats by {seatGap}. Increase seats before saving subscription changes.
            </div>
          )}
        </div>
      </section>

      <section id="subscription-plans" className="scroll-mt-20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-950">Plan</h3>
            <p className="mt-1 text-[13px] text-gray-500">Select the plan for this organization.</p>
          </div>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            {subscriptionBillingCycles.map((cycle) => {
              const active = draft.subscriptionBillingCycle === cycle.value;
              return (
                <button
                  key={cycle.value}
                  type="button"
                  onClick={() => updateDraft('subscriptionBillingCycle', cycle.value)}
                  className={`rounded-md px-4 py-2 text-[13px] font-semibold ${active ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  {cycle.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          {subscriptionPlans.map((plan) => {
            const active = draft.subscriptionPlan === plan.value;
            const price = plan[draft.subscriptionBillingCycle] ?? plan.monthly;
            const relation = plan.value === draft.subscriptionCurrentPlan
              ? 'Current'
              : (subscriptionPlanOrder[plan.value] ?? 0) > currentPlanIndex
                ? 'Upgrade'
                : 'Switch';
            return (
              <button
                key={plan.value}
                type="button"
                onClick={() => choosePlan(plan)}
                className={`flex min-h-[230px] flex-col rounded-lg border p-4 text-left transition-colors ${
                  active
                    ? 'border-[#2f8df7] bg-blue-50 shadow-[0_0_0_1px_rgba(47,141,247,0.18)]'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-gray-950">{plan.label}</div>
                    <div className="mt-1 text-[12px] leading-5 text-gray-500">{plan.description}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                    active ? 'bg-[#2f8df7] text-white' : relation === 'Upgrade' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {active ? 'Selected' : relation}
                  </span>
                </div>
                <div className="mt-4">
                  <span className="text-[22px] font-semibold text-gray-950">{formatPlanPrice(price)}</span>
                  {price > 0 && <span className="ml-1 text-xs text-gray-500">/ mo</span>}
                </div>
                <div className="mt-2 text-xs font-medium text-gray-500">{plan.includedSeats} seats included</div>
                {plan.extraSeatMonthly > 0 && (
                  <div className="mt-1 text-xs font-medium text-gray-500">Extra seat: {formatPlanPrice(plan.extraSeatMonthly)}/mo</div>
                )}
                <div className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-[12px] font-medium text-gray-600">
                      <FiCheckCircle className="shrink-0 text-emerald-600" size={13} />
                      {feature}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section id="subscription-checkout" className="scroll-mt-20 grid gap-4 rounded-lg border border-gray-200 bg-white p-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-950">Upgrade and Payment</h3>
              <p className="mt-1 text-[13px] text-gray-500">
                {isUpgrade ? 'Upgrade to a higher plan and activate it after payment.' : isPlanChange ? 'Switch the subscription and collect payment.' : 'Renew or record payment for the current subscription.'}
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
              {checkoutAmount > 0 ? 'Payment Required' : 'No Charge'}
            </span>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase text-gray-500">Plan Amount</div>
              <div className="mt-1 text-lg font-semibold text-gray-950">{formatPlanPrice(currentPrice)}</div>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase text-gray-500">Extra Seats</div>
              <div className="mt-1 text-lg font-semibold text-gray-950">{extraSeats}</div>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase text-gray-500">Payable Now</div>
              <div className="mt-1 text-lg font-semibold text-gray-950">{formatPlanPrice(checkoutAmount)}</div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {subscriptionPaymentMethods
              .filter((method) => checkoutAmount === 0 || method.value !== 'none')
              .map((method) => {
                const active = paymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => updateDraft('subscriptionPaymentMethod', method.value)}
                    className={`rounded-md border px-3 py-2 text-[13px] font-semibold ${
                      active ? 'border-[#2f8df7] bg-blue-50 text-[#0b57d0]' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {method.label}
                  </button>
                );
              })}
          </div>

          {checkoutAmount > 0 && paymentMethod === 'card' && (
            <div className="grid gap-3 md:grid-cols-2">
              <input value={paymentDraft.cardName} onChange={(event) => updatePaymentDraft('cardName', event.target.value)} className={inputClass} placeholder="Card holder name" />
              <input value={paymentDraft.cardNumber} onChange={(event) => updatePaymentDraft('cardNumber', event.target.value)} className={inputClass} inputMode="numeric" placeholder="Card number" />
              <input value={paymentDraft.cardExpiry} onChange={(event) => updatePaymentDraft('cardExpiry', event.target.value)} className={inputClass} placeholder="MM/YY" />
              <input value={paymentDraft.cardCvv} onChange={(event) => updatePaymentDraft('cardCvv', event.target.value)} className={inputClass} inputMode="numeric" placeholder="CVV" />
            </div>
          )}

          {checkoutAmount > 0 && paymentMethod === 'upi' && (
            <input value={paymentDraft.upiId} onChange={(event) => updatePaymentDraft('upiId', event.target.value)} className={inputClass} placeholder="name@upi" />
          )}

          {checkoutAmount > 0 && paymentMethod === 'bank_transfer' && (
            <input value={paymentDraft.bankReference} onChange={(event) => updatePaymentDraft('bankReference', event.target.value)} className={inputClass} placeholder="Bank UTR / transaction reference" />
          )}

          {paymentError && <div className="mt-3 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-red-700">{paymentError}</div>}
          {paymentNotice && <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{paymentNotice}</div>}
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="text-xs font-semibold uppercase text-gray-500">Order Summary</div>
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Plan</span>
              <span className="font-semibold text-gray-950">{selectedPlan.label}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Cycle</span>
              <span className="font-semibold text-gray-950">{billingCycle.label}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Seats</span>
              <span className="font-semibold text-gray-950">{seats}</span>
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between gap-4">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="text-xl font-semibold text-gray-950">{formatPlanPrice(checkoutAmount)}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">Next renewal: {formatDateText(nextRenewalDateInput(draft.subscriptionBillingCycle))}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={recordUpgradePayment}
            disabled={saving || seatGap > 0}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2f8df7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e75d6] disabled:opacity-60"
          >
            <FiCreditCard size={15} />
            {saving ? 'Processing...' : checkoutAmount > 0 ? 'Pay and Upgrade' : 'Activate Plan'}
          </button>
          <p className="mt-3 text-[11px] leading-5 text-gray-500">
            Card numbers, CVV and UPI IDs are used only for this demo checkout screen and are not saved to the company record.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SelectField label="Subscription Status" value={draft.subscriptionStatus} onChange={(value) => updateDraft('subscriptionStatus', value)}>
          {subscriptionStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </SelectField>
        <TextField label="Purchased Seats" type="number" value={seats} onChange={(value) => updateDraft('subscriptionSeats', Math.max(activeUsers, Number(value || 1)))} />
        <TextField label="Trial Ends On" type="date" value={draft.subscriptionTrialEndsAt} onChange={(value) => updateDraft('subscriptionTrialEndsAt', value)} />
        <TextField label="Renews On" type="date" value={draft.subscriptionRenewalDate} onChange={(value) => updateDraft('subscriptionRenewalDate', value)} />
        <TextField label="Billing Email" type="email" value={draft.subscriptionBillingEmail} onChange={(value) => updateDraft('subscriptionBillingEmail', value)} />
        <SelectField label="Payment Method" value={draft.subscriptionPaymentMethod} onChange={(value) => updateDraft('subscriptionPaymentMethod', value)}>
          {subscriptionPaymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
        </SelectField>
        <div className="lg:col-span-2">
          <TextField label="Subscription Reference" value={draft.subscriptionReference} onChange={(value) => updateDraft('subscriptionReference', value)} placeholder="Invoice, gateway or internal reference" />
        </div>
        <TextField label="Last Payment Amount" type="number" value={draft.subscriptionLastPaymentAmount} onChange={(value) => updateDraft('subscriptionLastPaymentAmount', Number(value || 0))} />
        <TextField label="Last Payment Date" type="date" value={draft.subscriptionLastPaymentDate} onChange={(value) => updateDraft('subscriptionLastPaymentDate', value)} />
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase text-gray-500">
          <div>Usage</div>
          <div>Current</div>
          <div>Limit</div>
        </div>
        <div className="divide-y divide-gray-100 text-sm">
          <div className="grid grid-cols-3 px-4 py-3">
            <div className="font-medium text-gray-900">Users</div>
            <div className="text-gray-600">{activeUsers}</div>
            <div className="text-gray-600">{seats}</div>
          </div>
          <div className="grid grid-cols-3 px-4 py-3">
            <div className="font-medium text-gray-900">Included seats</div>
            <div className="text-gray-600">{selectedPlan.includedSeats}</div>
            <div className="text-gray-600">{selectedPlan.label}</div>
          </div>
          <div className="grid grid-cols-3 px-4 py-3">
            <div className="font-medium text-gray-900">Organization ID</div>
            <div className="text-gray-600">{draft.organizationProfileId || 'Not set'}</div>
            <div className="text-gray-600">Unique</div>
          </div>
        </div>
      </section>
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

function ItemsPanel({ onOpenMasters }) {
  const options = [
    { label: 'Stock Item Master', value: 'Create and maintain sellable products, services, HSN/SAC codes and opening quantities.' },
    { label: 'Inventory Tracking', value: 'Use stock groups, units and godowns for item-level movement reports.' },
    { label: 'Barcode and SKU', value: 'Keep item codes visible for faster invoice and purchase entry.' },
    { label: 'Tax Defaults', value: 'GST rates and HSN data are picked from each stock item during voucher entry.' },
  ];

  return (
    <div className="max-w-5xl px-6 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-5">
        <div>
          <h3 className="text-[18px] font-semibold text-gray-950">Item Preferences</h3>
          <p className="mt-1 text-[13px] text-gray-500">Inventory setup shortcuts and item behavior used across sales and purchase entries.</p>
        </div>
        <button
          type="button"
          onClick={onOpenMasters}
          className="inline-flex items-center gap-2 rounded-md bg-[#2f8df7] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1e75d6]"
        >
          Open Stock Items <FiChevronRight size={14} />
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {options.map((option) => (
          <div key={option.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-[13px] font-semibold text-gray-950">{option.label}</div>
            <p className="mt-1 text-[13px] leading-5 text-gray-500">{option.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] leading-5 text-gray-600">
        Item creation and stock edits open in the main dashboard area so the root app navigation stays available for day-to-day inventory work.
      </div>
    </div>
  );
}

function TaxPanel({ draft, updateDraft }) {
  const setGstin = (value) => {
    const gstin = value.toUpperCase();
    updateDraft('gstin', gstin);
    const state = getGstStateFromGstin(gstin);
    if (state) updateDraft('state', state.name);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="GSTIN" value={draft.gstin} onChange={setGstin} />
        <SelectField label="State / UT" value={draft.state} onChange={(value) => updateDraft('state', value)}>
          <option value="">Select state / UT</option>
          {GST_STATES.map((state) => <option key={state.code} value={state.name}>{state.code} - {state.name}</option>)}
        </SelectField>
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
            <TextField label="GSTIN" value={branch.gstin} onChange={(value) => {
              const gstin = value.toUpperCase();
              updateBranch(index, 'gstin', gstin);
              const state = getGstStateFromGstin(gstin);
              if (state) updateBranch(index, 'state', state.name);
            }} />
            <SelectField label="State / UT" value={branch.state} onChange={(value) => updateBranch(index, 'state', value)}>
              <option value="">Select state / UT</option>
              {GST_STATES.map((state) => <option key={state.code} value={state.name}>{state.code} - {state.name}</option>)}
            </SelectField>
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
  roleOptions,
  setUserForm,
  addUser,
  updateUser,
  removeUser,
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState('user');
  const [guideOpen, setGuideOpen] = useState(false);
  const setRole = (role) => setUserForm((current) => ({ ...current, role, permissions: roleDefaults[role] || [] }));
  const roleValue = (preferredRole) => (
    roleOptions.some((role) => role.value === preferredRole)
      ? preferredRole
      : roleOptions[0]?.value || ''
  );
  const openInvite = (mode) => {
    const nextRole = roleValue(mode === 'accountant' ? 'accountant' : 'viewer');
    setInviteMode(mode);
    setInviteOpen(true);
    if (nextRole) setRole(nextRole);
  };
  const toggleFormPermission = (permission) => {
    setUserForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  };

  return (
    <div className="min-h-[calc(100vh-9.2rem)] bg-white">
      <div className="flex min-h-[70px] flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
        <button type="button" className="inline-flex items-center gap-2 text-[20px] font-semibold text-gray-950">
          All Users <FiChevronDown size={16} className="text-[#2f8df7]" />
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setGuideOpen((open) => !open)}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-[#2f8df7] hover:text-[#1e75d6]"
          >
            <FiFileText size={14} />
            How to add users
          </button>
          <button type="button" onClick={() => openInvite('accountant')} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-gray-800 hover:bg-gray-50">
            Invite Accountant
          </button>
          <button type="button" onClick={() => openInvite('user')} className="inline-flex items-center gap-1 rounded-md bg-[#2f8df7] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1e75d6]">
            <FiPlus size={15} /> Invite User
          </button>
          <button type="button" className="rounded-md border border-gray-200 bg-white px-3 py-2 text-[13px] font-bold text-gray-700 hover:bg-gray-50">
            ...
          </button>
        </div>
      </div>

      {guideOpen && (
        <section className="border-b border-blue-100 bg-blue-50/70 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-950">How to invite users</h3>
              <p className="mt-1 max-w-3xl text-[13px] leading-6 text-gray-600">
                The person must first create an account using the same email address. After that, add that registered email here and choose the role and permissions.
              </p>
            </div>
            <button type="button" onClick={() => setGuideOpen(false)} className="rounded-md p-2 text-gray-500 hover:bg-white hover:text-gray-800" title="Close guide">
              <FiX size={16} />
            </button>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            <ol className="space-y-2 rounded-lg border border-blue-100 bg-white p-4 text-[13px] leading-6 text-gray-700">
              <li><strong>1.</strong> Ask the person to sign up at <a href="/app/register" target="_blank" rel="noreferrer" className="font-semibold text-[#0b57d0] hover:underline">/app/register</a>.</li>
              <li><strong>2.</strong> Click <strong>Invite User</strong> or <strong>Invite Accountant</strong>.</li>
              <li><strong>3.</strong> Enter that registered email address.</li>
              <li><strong>4.</strong> Select the role and adjust permissions if needed.</li>
              <li><strong>5.</strong> Click <strong>Send Invite</strong>. The user will be added to this company.</li>
            </ol>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ['Admin', 'Full access to users, company settings, vouchers and reports.'],
                ['Accountant', 'Best for CA, bookkeeper or finance staff who create vouchers and reports.'],
                ['Viewer', 'Read-only report access for review work.'],
              ].map(([role, description]) => (
                <div key={role} className="rounded-lg border border-blue-100 bg-white p-3">
                  <div className="text-[13px] font-semibold text-gray-900">{role}</div>
                  <div className="mt-1 text-[12px] leading-5 text-gray-500">{description}</div>
                </div>
              ))}
            </div>
          </div>
          <a href={userInviteGuidePath} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[12px] font-semibold text-[#0b57d0] hover:text-[#1e75d6]">
            Open standalone guide
          </a>
        </section>
      )}

      {inviteOpen && (
        <form onSubmit={addUser} className="space-y-3 border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-950">
                {inviteMode === 'accountant' ? 'Invite Accountant' : 'Invite User'}
              </h3>
              <p className="mt-1 text-[13px] text-gray-500">
                {inviteMode === 'accountant'
                  ? 'Add a registered CA, bookkeeper or finance teammate with accountant permissions.'
                  : 'Add a registered staff member and choose the role that matches their work.'}
              </p>
            </div>
            <button type="button" onClick={() => setGuideOpen(true)} className="text-[12px] font-semibold text-[#0b57d0] hover:text-[#1e75d6]">
              Open guide
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_auto]">
            <input
              type="email"
              required
              placeholder="registered email address"
              value={userForm.email}
              onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
              className={inputClass}
            />
            <select value={userForm.role} onChange={(event) => setRole(event.target.value)} className={inputClass}>
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            <button type="submit" disabled={saving || !roleOptions.length} className="rounded-md bg-[#2f8df7] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? 'Inviting...' : 'Send Invite'}
            </button>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] leading-5 text-gray-600">
            <FiInfo className="mt-0.5 shrink-0 text-[#2f8df7]" size={14} />
            If you see "User must register before being added", ask that person to create an account first, then send the invite with the same email.
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {permissionDefs.map((permission) => (
              <label key={permission.key} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600">
                <input type="checkbox" checked={userForm.permissions.includes(permission.key)} onChange={() => toggleFormPermission(permission.key)} />
                {permission.label}
              </label>
            ))}
          </div>
        </form>
      )}

      {usersLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading users...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-[55%] border-b border-gray-200 px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">User Details</th>
                <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Role</th>
                <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th className="border-b border-gray-200 px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-600 text-lg font-semibold text-white">
                        {(user.name || user.email || 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#0b57d0]">{user.name || user.email}</div>
                        <div className="truncate text-[13px] text-gray-600">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === 'owner' ? (
                      <span className="font-medium text-gray-900">{titleize(user.role)}</span>
                    ) : (
                      <select value={user.role} onChange={(event) => updateUser(user._id, { role: event.target.value })} className="rounded-md border border-gray-200 px-2 py-1.5 text-[13px]">
                        {roleOptions.map((role) => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.role === 'owner' ? (
                      <span className="rounded-md bg-emerald-100 px-2 py-1 text-[12px] font-semibold text-emerald-700">Active</span>
                    ) : (
                      <select value={user.status} onChange={(event) => updateUser(user._id, { status: event.target.value })} className="rounded-md border border-gray-200 px-2 py-1.5 text-[13px]">
                        <option value="active">active</option>
                        <option value="disabled">disabled</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.role !== 'owner' && (
                      <button type="button" onClick={() => removeUser(user._id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                        <FiTrash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="py-16 text-center text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RolesPanel({ roleDefaults, permissionDefs, usersLoading, users }) {
  const permissionsByKey = new Map(permissionDefs.map((permission) => [permission.key, permission.label]));
  const roleRows = Object.entries(roleDefaults).map(([role, permissions]) => {
    const permissionLabels = permissions.map((permission) => permissionsByKey.get(permission)).filter(Boolean);
    const description = permissionDefs.length && permissions.length >= permissionDefs.length
      ? `All ${permissionDefs.length} permissions enabled.`
      : `${permissionLabels.length} permission${permissionLabels.length === 1 ? '' : 's'} enabled${permissionLabels.length ? `: ${permissionLabels.join(', ')}` : '.'}`;
    const assignedUsers = users.filter((user) => user.role === role).length;
    return { role, label: titleize(role), description, assignedUsers };
  });

  return (
    <div className="min-h-[calc(100vh-9.2rem)] bg-white">
      <div className="flex min-h-[70px] flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
        <h3 className="text-[22px] font-semibold text-gray-950">Roles</h3>
        <button type="button" disabled className="rounded-md bg-[#2f8df7] px-4 py-2 text-[13px] font-semibold text-white opacity-60">
          New Role
        </button>
      </div>
      {usersLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading roles...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-[30%] border-b border-gray-200 px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Role Name</th>
                <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Description</th>
                <th className="w-[150px] border-b border-gray-200 px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roleRows.map((role) => (
                <tr key={role.role}>
                  <td className="px-6 py-4 font-semibold text-[#0b57d0]">{role.label}</td>
                  <td className="max-w-3xl px-6 py-4 leading-6 text-gray-800">{role.description}</td>
                  <td className="px-6 py-4 text-gray-600">{role.assignedUsers}</td>
                </tr>
              ))}
              {roleRows.length === 0 && (
                <tr><td colSpan={3} className="py-16 text-center text-gray-400">No roles found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserPreferencesPanel({ draft, setDraft }) {
  const customFields = draft.userCustomFields || [];
  const limit = Number(draft.userCustomFieldLimit || DEFAULT_USER_CUSTOM_FIELD_LIMIT);
  const updateField = (index, key, value) => {
    setDraft((current) => ({
      ...current,
      userCustomFields: (current.userCustomFields || []).map((field, fieldIndex) => (
        fieldIndex === index ? { ...field, [key]: value } : field
      )),
    }));
  };
  const addField = () => {
    if (customFields.length >= limit) return;
    setDraft((current) => ({
      ...current,
      userCustomFields: [...(current.userCustomFields || []), { ...DEFAULT_USER_CUSTOM_FIELD }],
    }));
  };
  const removeField = (index) => {
    setDraft((current) => ({
      ...current,
      userCustomFields: (current.userCustomFields || []).filter((_, fieldIndex) => fieldIndex !== index),
    }));
  };

  return (
    <div className="min-h-[calc(100vh-9.2rem)] bg-white">
      <div className="flex min-h-[70px] flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
        <h3 className="text-[22px] font-semibold text-gray-950">User Preferences</h3>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-medium text-[#0b57d0]">Custom Fields Usage: {customFields.length}/{limit}</span>
          <button type="button" onClick={addField} disabled={customFields.length >= limit} className="inline-flex items-center gap-1 rounded-md bg-[#2f8df7] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1e75d6] disabled:opacity-60">
            <FiPlus size={15} /> New Custom Field
          </button>
        </div>
      </div>
      <div className="border-b border-gray-200 px-6 pt-3">
        <div className="inline-flex border-b-2 border-[#2f8df7] px-4 pb-3 text-[15px] font-semibold text-gray-800">
          Field Customization
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Field Name</th>
              <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Data Type</th>
              <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Mandatory</th>
              <th className="border-b border-gray-200 px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
              <th className="border-b border-gray-200 px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customFields.map((field, index) => (
              <tr key={field._id || index}>
                <td className="px-6 py-3">
                  <input value={field.fieldName || ''} onChange={(event) => updateField(index, 'fieldName', event.target.value)} placeholder="Field name" className={inputClass} />
                </td>
                <td className="px-6 py-3">
                  <select value={field.dataType || userCustomFieldTypes[0]} onChange={(event) => updateField(index, 'dataType', event.target.value)} className={inputClass}>
                    {userCustomFieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </td>
                <td className="px-6 py-3">
                  <label className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-700">
                    <input type="checkbox" checked={Boolean(field.mandatory)} onChange={(event) => updateField(index, 'mandatory', event.target.checked)} />
                    Required
                  </label>
                </td>
                <td className="px-6 py-3">
                  <select value={field.status || userCustomFieldStatuses[0]} onChange={(event) => updateField(index, 'status', event.target.value)} className={inputClass}>
                    {userCustomFieldStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
                <td className="px-6 py-3 text-right">
                  <button type="button" onClick={() => removeField(index)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <FiTrash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {customFields.length === 0 && (
              <tr>
                <td colSpan={5} className="h-72 text-center text-[16px] text-gray-500">
                  Do you have information that doesn't go under any existing field? Go ahead and create a custom field.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const { company, setCompany, refreshFinancialYears } = useCompany();
  const [query, setQuery] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('profile');
  const [draftState, setDraftState] = useState({ companyId: null, panel: 'profile', values: null });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [permissionDefs, setPermissionDefs] = useState([]);
  const [roleDefaults, setRoleDefaults] = useState({});
  const [userForm, setUserForm] = useState({ email: '', role: '', permissions: [] });

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
    if (!term) return settingsNavigation;

    return settingsNavigation
      .map((section) => {
        const groups = section.groups
          .map((group) => {
            const groupMatches = group.title.toLowerCase().includes(term);
            if (!group.items) return groupMatches ? group : null;
            const items = groupMatches
              ? group.items
              : group.items.filter((item) => item.label.toLowerCase().includes(term));
            return items.length ? { ...group, items } : null;
          })
          .filter(Boolean);
        return groups.length ? { ...section, groups } : null;
      })
      .filter(Boolean);
  }, [query]);

  const filteredOverviewSections = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return settingsOverviewSections;

    return settingsOverviewSections
      .map((section) => {
        const sectionMatches = section.title.toLowerCase().includes(term);
        const cards = section.cards
          .map((card) => {
            const blocks = card.blocks
              .map((block) => {
                const blockMatches = sectionMatches || block.title.toLowerCase().includes(term);
                const items = blockMatches
                  ? block.items
                  : block.items.filter((item) => item.label.toLowerCase().includes(term));
                return items.length ? { ...block, items } : null;
              })
              .filter(Boolean);
            return blocks.length ? { ...card, blocks } : null;
          })
          .filter(Boolean);
        return cards.length ? { ...section, cards } : null;
      })
      .filter(Boolean);
  }, [query]);

  const companyId = company?._id || null;
  const draft = draftState.companyId === companyId && draftState.panel === activePanel && draftState.values
    ? draftState.values
    : companyDraft(company, activePanel);

  const replaceDraft = (panel, sourceCompany = company) => {
    setDraftState({
      companyId: sourceCompany?._id || null,
      panel,
      values: companyDraft(sourceCompany, panel),
    });
  };

  const setDraft = (updater) => {
    setDraftState((current) => {
      const currentMatches = current.companyId === companyId && current.panel === activePanel && current.values;
      const base = currentMatches ? current.values : companyDraft(company, activePanel);
      return {
        companyId,
        panel: activePanel,
        values: typeof updater === 'function' ? updater(base) : updater,
      };
    });
  };

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const openPanel = (panel) => {
    setMessage('');
    replaceDraft(panel);
    setActivePanel(panel);
    setDetailOpen(true);
  };

  const handleSelect = (item) => {
    if (item.href) {
      navigate(item.href);
      return;
    }
    openPanel(item.panel);
  };

  const refreshCompany = async () => {
    if (!company?._id) return;
    setRefreshing(true);
    setMessage('');
    try {
      const res = await api.get(`/companies/${company._id}`);
      const nextCompany = res.data.data;
      setCompany(nextCompany);
      replaceDraft(activePanel, nextCompany);
      await refreshFinancialYears();
      setMessage('Settings refreshed.');
    } catch (err) {
      setMessage(getApiError(err, 'Could not refresh settings'));
    } finally {
      setRefreshing(false);
    }
  };

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
        role: defaults[current.role] ? current.role : Object.keys(defaults).find((role) => role !== 'owner') || '',
        permissions: current.permissions.length ? current.permissions : defaults[current.role] || defaults[Object.keys(defaults).find((role) => role !== 'owner')] || [],
      }));
    } catch (err) {
      setMessage(getApiError(err, 'Could not load users'));
    } finally {
      setUsersLoading(false);
    }
  }, [company]);

  useEffect(() => {
    if (!usersRolePanels.has(activePanel)) return undefined;
    const id = setTimeout(loadUsers, 0);
    return () => clearTimeout(id);
  }, [activePanel, loadUsers]);

  const roleOptions = useMemo(() => (
    Object.keys(roleDefaults)
      .filter((role) => role !== 'owner')
      .map((role) => ({ value: role, label: titleize(role) }))
  ), [roleDefaults]);

  const saveCompanyPatch = async (patch, successMessage) => {
    if (!company?._id) return false;
    setSaving(true);
    setMessage('');
    try {
      const res = await api.put(`/companies/${company._id}`, patch);
      const nextCompany = { ...(res.data.data || {}), ...patch };
      setCompany(nextCompany);
      replaceDraft(activePanel, nextCompany);
      setMessage(successMessage);
      return true;
    } catch (err) {
      setMessage(getApiError(err, 'Could not save settings'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const applySubscriptionPayment = (patch) => saveCompanyPatch(patch, 'Subscription upgraded and payment recorded.');

  const submitPanel = async (event) => {
    event.preventDefault();
    if (activePanel === 'profile') {
      await saveCompanyPatch({
        name: draft.name,
        organizationProfileId: draft.organizationProfileId,
        legalName: draft.legalName,
        industry: draft.industry,
        gstin: draft.gstin,
        pan: draft.pan,
        cin: draft.cin,
        address: draft.address,
        addressLine2: draft.addressLine2,
        city: draft.city,
        state: draft.state,
        pincode: draft.pincode,
        country: draft.country,
        phone: draft.phone,
        email: draft.email,
        website: draft.website,
        logo: draft.logo,
        organizationLanguage: draft.organizationLanguage,
        communicationLanguage: draft.communicationLanguage,
        timeZone: draft.timeZone,
        dateFormat: draft.dateFormat,
        dateSeparator: draft.dateSeparator,
        companyIdLabel: draft.companyIdLabel,
        companyIdValue: draft.companyIdValue,
        taxIdLabel: draft.taxIdLabel,
        taxIdValue: draft.taxIdValue,
        taxBasis: draft.taxBasis,
        additionalFields: (draft.additionalFields || []).filter((field) => field.label || field.value),
      }, 'Organization profile saved.');
      return;
    }
    if (activePanel === 'branding') {
      await saveCompanyPatch({
        logo: draft.logo,
        website: draft.website,
        email: draft.email,
        appearanceMode: draft.appearanceMode,
      }, 'Branding saved.');
      return;
    }
    if (activePanel === 'subscription') {
      await saveCompanyPatch({
        subscriptionPlan: draft.subscriptionPlan || 'free',
        subscriptionStatus: draft.subscriptionStatus || 'trial',
        subscriptionBillingCycle: draft.subscriptionBillingCycle || 'monthly',
        subscriptionSeats: Math.max(1, Number(draft.subscriptionSeats || 1)),
        subscriptionTrialEndsAt: draft.subscriptionTrialEndsAt || null,
        subscriptionRenewalDate: draft.subscriptionRenewalDate || null,
        subscriptionBillingEmail: draft.subscriptionBillingEmail || '',
        subscriptionPaymentMethod: draft.subscriptionPaymentMethod || 'none',
        subscriptionReference: draft.subscriptionReference || '',
        subscriptionLastPaymentStatus: draft.subscriptionLastPaymentStatus || 'none',
        subscriptionLastPaymentAmount: Number(draft.subscriptionLastPaymentAmount || 0),
        subscriptionLastPaymentDate: draft.subscriptionLastPaymentDate || null,
        subscriptionCardLast4: draft.subscriptionCardLast4 || '',
      }, 'Subscription saved.');
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
        state: draft.state,
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
      return;
    }
    if (activePanel === 'userPreferences') {
      await saveCompanyPatch({
        userCustomFields: (draft.userCustomFields || []).filter((field) => field.fieldName || field.dataType),
        userCustomFieldLimit: Number(draft.userCustomFieldLimit || DEFAULT_USER_CUSTOM_FIELD_LIMIT),
      }, 'User preferences saved.');
    }
  };

  const addUser = async (event) => {
    event.preventDefault();
    if (!company?._id) return;
    setSaving(true);
    setMessage('');
    try {
      await api.post(`/companies/${company._id}/users`, userForm);
      const nextRole = roleOptions[0]?.value || '';
      setUserForm({ email: '', role: nextRole, permissions: roleDefaults[nextRole] || [] });
      await loadUsers();
      setMessage('User invited and added to the company.');
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
    if (activePanel === 'subscription') {
      return <SubscriptionPanel draft={draft} updateDraft={updateDraft} onPayUpgrade={applySubscriptionPayment} saving={saving} />;
    }
    if (activePanel === 'general') return <GeneralPanel draft={draft} updateDraft={updateDraft} />;
    if (activePanel === 'tax') return <TaxPanel draft={draft} updateDraft={updateDraft} />;
    if (activePanel === 'branches') return <BranchesPanel draft={draft} setDraft={setDraft} />;
    if (activePanel === 'currencies') return <CurrenciesPanel draft={draft} setDraft={setDraft} />;
    if (activePanel === 'items') return <ItemsPanel onOpenMasters={() => navigate('/app/masters/stock-items')} />;
    if (activePanel === 'roles') {
      return <RolesPanel roleDefaults={roleDefaults} permissionDefs={permissionDefs} usersLoading={usersLoading} users={users} />;
    }
    if (activePanel === 'userPreferences') return <UserPreferencesPanel draft={draft} setDraft={setDraft} />;
    if (activePanel === 'users') {
      return (
        <UsersPanel
          users={users}
          usersLoading={usersLoading}
          permissionDefs={permissionDefs}
          userForm={userForm}
          saving={saving}
          roleDefaults={roleDefaults}
          roleOptions={roleOptions}
          setUserForm={setUserForm}
          addUser={addUser}
          updateUser={updateUser}
          removeUser={removeUser}
        />
      );
    }
    return null;
  };

  if (!company) return null;

  const currentTitle = panelTitles[activePanel] || 'Settings';
  const organizationId = draft.organizationProfileId || company.organizationProfileId || fallbackOrganizationProfileId(company);
  const showPanelTitle = !fullBleedPanels.has(activePanel);
  const scrollToSubscriptionUpgrade = () => {
    const target = document.getElementById('subscription-plans') || document.getElementById('subscription-checkout');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden border-t-0 bg-[#f7f8fb] text-gray-800">
      <header className="z-20 shrink-0 border-b border-gray-100 bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)] lg:px-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-3 lg:w-[248px] lg:px-4">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm border border-sky-200 text-sky-700">
              <FiGlobe size={17} />
            </div>
            {detailOpen && (
              <button
                type="button"
                onClick={() => {
                  setDetailOpen(false);
                  setMessage('');
                }}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                title="Back to all settings"
              >
                <FiChevronLeft size={18} />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-semibold leading-tight text-gray-900">All Settings</h1>
              <p className="truncate text-[11px] font-medium text-gray-500">{company.name}</p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[360px] lg:flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-600" size={15} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search settings ( / )"
              className="h-9 w-full rounded-lg border border-gray-100 bg-gray-50 pl-10 pr-4 text-[13px] text-gray-700 outline-none focus:border-[#2f8df7] focus:bg-white focus:ring-1 focus:ring-[#2f8df7]"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:pr-4">
            <button
              type="button"
              onClick={refreshCompany}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              disabled={refreshing}
            >
              <FiRefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 text-[13px] font-semibold text-gray-900 hover:bg-gray-100"
              title="Close settings"
            >
              <span>Close Settings</span>
              <FiX size={15} className="text-red-500" />
            </button>
          </div>
        </div>
      </header>

      {detailOpen ? (
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <SettingsSidebar sections={filteredSections} activePanel={activePanel} onSelect={handleSelect} />

          <section className="min-w-0 flex-1 overflow-y-auto bg-white">
            {showPanelTitle && (
              <div className="sticky top-0 z-10 flex min-h-[58px] flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <h2 className="text-[20px] font-semibold text-gray-950">{currentTitle}</h2>
                  {activePanel === 'profile' && (
                    <span className="rounded-full bg-gray-100 px-4 py-2 text-[12px] font-bold text-gray-700">
                      ID: {organizationId}
                    </span>
                  )}
                </div>
                {activePanel === 'subscription' && (
                  <button
                    type="button"
                    onClick={scrollToSubscriptionUpgrade}
                    className="inline-flex items-center gap-2 rounded-md bg-[#2f8df7] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1e75d6]"
                  >
                    Upgrade <FiChevronRight size={14} />
                  </button>
                )}
              </div>
            )}

            {message && (
              <div className="mx-6 mt-4 flex max-w-[880px] items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-medium text-gray-700">
                <FiCheckCircle className="text-[#2f8df7]" size={15} />
                {message}
              </div>
            )}

            {activePanel === 'users' || activePanel === 'roles' ? (
              <div>{renderPanel()}</div>
            ) : editablePanels.has(activePanel) ? (
              <form onSubmit={submitPanel} className="flex min-h-[calc(100vh-9.2rem)] flex-col">
                <div className="flex-1">
                  {activePanel === 'profile' || activePanel === 'userPreferences' ? renderPanel() : (
                    <div className="max-w-5xl px-6 py-6">{renderPanel()}</div>
                  )}
                </div>
                <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-gray-200 bg-white px-6 py-3 shadow-[0_-3px_12px_rgba(15,23,42,0.04)]">
                  <button type="submit" disabled={saving} className="rounded-md bg-[#2f8df7] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1e75d6] disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => replaceDraft(activePanel)}
                    className="rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-[13px] font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>{renderPanel()}</div>
            )}
          </section>
        </main>
      ) : (
        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:px-14">
          <div className="mx-auto max-w-[1624px]">
            {message && (
              <div className="mb-5 flex max-w-[880px] items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] font-medium text-gray-700">
                <FiCheckCircle className="text-[#2f8df7]" size={15} />
                {message}
              </div>
            )}
            <SettingsOverview sections={filteredOverviewSections} onSelect={handleSelect} />
          </div>
        </main>
      )}
    </div>
  );
}
