import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiChevronDown, FiPhone } from 'react-icons/fi';

const navLinks = [
  {
    label: 'Products',
    href: '/products',
    children: [
      { label: 'TallyPrime', href: '/products/tallyprime' },
      { label: 'TallyPrime Edit Log', href: '/products/edit-log' },
      { label: 'Shoper 9', href: '/products/shoper' },
      { label: 'TallyPrime Server', href: '/products/server' },
    ],
  },
  {
    label: 'Solutions',
    href: '/solutions',
    children: [
      { label: 'Accounting & Finance', href: '/solutions/accounting' },
      { label: 'Inventory Management', href: '/solutions/inventory' },
      { label: 'GST Compliance', href: '/solutions/gst' },
      { label: 'Payroll', href: '/solutions/payroll' },
    ],
  },
  { label: 'Partners', href: '/partners' },
  { label: 'Resources', href: '/resources' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setActiveDropdown(null);
  }, [location]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm'
      }`}
    >
      {/* Top bar */}
      <div className="bg-[#003087] text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span>India's #1 Business Management Software</span>
          <div className="flex items-center gap-4">
            <a href="tel:1800-309-8859" className="flex items-center gap-1 hover:text-orange-300 transition-colors">
              <FiPhone size={11} /> 1800-309-8859
            </a>
            <span>|</span>
            <a href="/contact" className="hover:text-orange-300 transition-colors">Find a Partner</a>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 bg-[#003087] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <div className="text-[#003087] font-bold text-xl leading-none">Tally</div>
              <div className="text-[#ff6600] text-xs font-semibold tracking-wider">SOLUTIONS</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.children && setActiveDropdown(link.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  to={link.href}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    location.pathname === link.href
                      ? 'text-[#003087] bg-blue-50'
                      : 'text-gray-700 hover:text-[#003087] hover:bg-blue-50'
                  }`}
                >
                  {link.label}
                  {link.children && <FiChevronDown size={14} />}
                </Link>
                {link.children && activeDropdown === link.label && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    {link.children.map((child) => (
                      <Link
                        key={child.label}
                        to={child.href}
                        className="block px-4 py-2.5 text-sm text-gray-600 hover:text-[#003087] hover:bg-blue-50 transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href="/download"
              className="px-4 py-2 text-sm font-semibold text-[#003087] border-2 border-[#003087] rounded-lg hover:bg-blue-50 transition-colors"
            >
              Free Trial
            </a>
            <a
              href="/buy"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#ff6600] rounded-lg hover:bg-orange-600 transition-colors shadow-md hover:shadow-lg"
            >
              Buy Now
            </a>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-xl">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <div key={link.label}>
                <Link
                  to={link.href}
                  className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-[#003087] hover:bg-blue-50 rounded-md"
                >
                  {link.label}
                </Link>
                {link.children && (
                  <div className="pl-4 space-y-1 mt-1">
                    {link.children.map((child) => (
                      <Link
                        key={child.label}
                        to={child.href}
                        className="block px-3 py-2 text-sm text-gray-500 hover:text-[#003087] hover:bg-blue-50 rounded-md"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-3 pb-2 flex gap-3">
              <a href="/download" className="flex-1 text-center py-2.5 text-sm font-semibold text-[#003087] border-2 border-[#003087] rounded-lg">Free Trial</a>
              <a href="/buy" className="flex-1 text-center py-2.5 text-sm font-semibold text-white bg-[#ff6600] rounded-lg">Buy Now</a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
