import { FiAward, FiClock, FiShield, FiTarget, FiUsers } from 'react-icons/fi';
import Newsletter from '../components/Newsletter';

const values = [
  {
    icon: FiTarget,
    title: 'Clarity first',
    text: 'Every screen is designed to make business health, accounting status, and next actions visible.',
  },
  {
    icon: FiShield,
    title: 'Compliance by design',
    text: 'GST, audit trails, approvals, and exports are treated as everyday workflows, not afterthoughts.',
  },
  {
    icon: FiUsers,
    title: 'Built for teams',
    text: 'Owners, accountants, operators, and reviewers can collaborate with permissions and history.',
  },
  {
    icon: FiAward,
    title: 'Practical automation',
    text: 'Automation is focused on real accounting time-savers like matching, reminders, imports, and reports.',
  },
];

const milestones = [
  ['Phase 1', 'Accounting controls, financial years, audit trail, and voucher validation'],
  ['Phase 2', 'Customer, vendor, sales, purchase, and professional invoice workflows'],
  ['Phase 3', 'Inventory movement, valuation, batch tracking, and low-stock visibility'],
  ['Phase 4', 'GST reports, exports, e-invoice-ready data, and compliance checks'],
  ['Phase 5', 'Bank import, reminders, attachments, approvals, and permissions'],
];

export default function About() {
  return (
    <div className="bg-white pt-28">
      <section className="border-b border-slate-200 bg-[#fffaf2] py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
            About Suraj Books
          </div>
          <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
            Accounting software shaped around how modern Indian businesses work
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-600">
            We are building a clean, compliance-ready accounting workspace that combines Tally-style speed with cloud-friendly controls, collaboration, and automation.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            ['5', 'Build phases'],
            ['20+', 'Core workflows'],
            ['15+', 'Reports and exports'],
            ['100%', 'Company-scoped data'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
              <div className="text-3xl font-black text-[#0b57d0]">{value}</div>
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[#f6f8fb] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
              Principles
            </div>
            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">What drives the product</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div key={value.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-md bg-blue-50 text-[#0b57d0]">
                  <value.icon size={22} />
                </div>
                <h3 className="text-lg font-black text-slate-950">{value.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:px-8">
          <div>
            <div className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#0b57d0]">
              Roadmap
            </div>
            <h2 className="text-3xl font-black text-slate-950">Built in practical phases</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              The roadmap keeps accounting correctness first, then adds daily workflows, inventory, compliance, and automation.
            </p>
          </div>
          <div className="space-y-4">
            {milestones.map(([phase, text]) => (
              <div key={phase} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[#111827] text-white">
                  <FiClock size={18} />
                </div>
                <div>
                  <div className="font-black text-slate-950">{phase}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Newsletter />
    </div>
  );
}
