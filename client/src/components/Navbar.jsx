import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiChevronDown,
  FiFileText,
  FiGlobe,
  FiMenu,
  FiPhone,
  FiShield,
  FiX,
} from 'react-icons/fi';

const featureGroups = [
  {
    title: 'Core accounting',
    items: ['Invoicing', 'Bills', 'Banking', 'Inventory'],
  },
  {
    title: 'Compliance',
    items: ['GST reports', 'E-invoice data', 'Audit trail', 'Approvals'],
  },
  {
    title: 'Automation',
    items: ['Payment reminders', 'Recurring entries', 'Imports', 'Exports'],
  },
];

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Solutions', href: '/products' },
  { label: 'Resources', href: '/resources' },
  { label: 'Company', href: '/about' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (href) => {
    if (href.startsWith('/#')) return location.pathname === '/';
    return location.pathname === href;
  };

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 border-b transition-all duration-200 ${
        scrolled
          ? 'border-slate-200 bg-white/95 shadow-sm backdrop-blur'
          : 'border-slate-100 bg-white'
      }`}
    >
      <div className="border-b border-slate-100 bg-[#fff8ed]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs text-slate-600 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-medium">
            <FiShield className="text-[#0b57d0]" size={13} />
            GST-compliant accounting software for growing businesses
          </div>
          <div className="hidden items-center gap-5 md:flex">
            <a href="tel:18003098859" className="flex items-center gap-1.5 hover:text-[#0b57d0]">
              <FiPhone size={13} />
              1800-309-8859
            </a>
            <span className="flex items-center gap-1.5">
              <FiGlobe size={13} />
              India
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-[#0b57d0] text-sm font-black text-white shadow-sm">
              SB
            </div>
            <div className="text-lg font-bold text-slate-950">Suraj Books</div>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            <div
              className="relative"
              onMouseEnter={() => setShowFeatures(true)}
              onMouseLeave={() => setShowFeatures(false)}
            >
              <a
                href="/#features"
                className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive('/#features')
                    ? 'bg-blue-50 text-[#0b57d0]'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-[#0b57d0]'
                }`}
              >
                Features
                <FiChevronDown size={14} />
              </a>
              {showFeatures && (
                <div className="absolute left-0 top-full w-[560px] rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="grid grid-cols-3 gap-3">
                    {featureGroups.map((group) => (
                      <div key={group.title} className="rounded-lg bg-slate-50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
                          <FiFileText className="text-[#0b57d0]" size={15} />
                          {group.title}
                        </div>
                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <a
                              key={item}
                              href="/#features"
                              className="block text-sm text-slate-600 hover:text-[#0b57d0]"
                            >
                              {item}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {navLinks.slice(1).map((link) => (
              link.href.startsWith('/#') ? (
                <a
                  key={link.label}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive(link.href)
                      ? 'bg-blue-50 text-[#0b57d0]'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#0b57d0]'
                  }`}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive(link.href)
                      ? 'bg-blue-50 text-[#0b57d0]'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#0b57d0]'
                  }`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link to="/app/login" className="text-sm font-semibold text-slate-700 hover:text-[#0b57d0]">
              Sign in
            </Link>
            <Link
              to="/app/register"
              className="rounded-md border border-[#0b57d0] bg-[#0b57d0] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#0848ad]"
            >
              Start free trial
            </Link>
          </div>

          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setIsOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-700 lg:hidden"
          >
            {isOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              link.href.startsWith('/#') ? (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              )
            ))}
            <div className="grid grid-cols-2 gap-3 pt-3">
              <Link
                to="/app/login"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-slate-200 px-4 py-2.5 text-center text-sm font-bold text-slate-700"
              >
                Sign in
              </Link>
              <Link
                to="/app/register"
                onClick={() => setIsOpen(false)}
                className="rounded-md bg-[#0b57d0] px-4 py-2.5 text-center text-sm font-bold text-white"
              >
                Free trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
