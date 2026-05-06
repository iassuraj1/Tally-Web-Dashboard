import { Link } from 'react-router-dom';
import { FiLinkedin, FiMail, FiMapPin, FiPhone, FiTwitter, FiYoutube } from 'react-icons/fi';

const footerLinks = {
  Features: [
    { label: 'Invoicing', href: '/#features' },
    { label: 'Banking', href: '/#features' },
    { label: 'Inventory', href: '/#features' },
    { label: 'GST reports', href: '/#features' },
    { label: 'Approvals', href: '/#features' },
  ],
  Solutions: [
    { label: 'Small business', href: '/products' },
    { label: 'Growing teams', href: '/products' },
    { label: 'Accounting firms', href: '/products' },
    { label: 'Compliance teams', href: '/products' },
  ],
  Resources: [
    { label: 'Blog', href: '/resources' },
    { label: 'Help center', href: '/resources' },
    { label: 'Migration guide', href: '/contact' },
    { label: 'API docs', href: '/resources' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Partner with us', href: '/contact' },
    { label: 'Security', href: '/about' },
  ],
};

const socials = [
  { Icon: FiTwitter, href: '#', label: 'Twitter' },
  { Icon: FiLinkedin, href: '#', label: 'LinkedIn' },
  { Icon: FiYoutube, href: '#', label: 'YouTube' },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_2fr]">
          <div>
            <Link to="/" className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-[#0b57d0] text-sm font-black text-white">
                SB
              </div>
              <div>
                <div className="text-lg font-black text-slate-950">Suraj Books</div>
              </div>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-600">
              A modern accounting workspace for Indian businesses that need clear books, reliable compliance, and practical automation.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <a href="tel:18003098859" className="flex items-center gap-2 hover:text-[#0b57d0]">
                <FiPhone className="text-[#0b57d0]" size={15} />
                1800-309-8859
              </a>
              <a href="mailto:support@surajbooks.com" className="flex items-center gap-2 hover:text-[#0b57d0]">
                <FiMail className="text-[#0b57d0]" size={15} />
                support@surajbooks.com
              </a>
              <div className="flex items-start gap-2">
                <FiMapPin className="mt-0.5 text-[#0b57d0]" size={15} />
                <span>Bengaluru, Karnataka, India</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {Object.entries(footerLinks).map(([section, links]) => (
              <div key={section}>
                <h4 className="mb-4 text-sm font-black text-slate-950">{section}</h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('/#') ? (
                        <a href={link.href} className="text-sm text-slate-500 hover:text-[#0b57d0]">
                          {link.label}
                        </a>
                      ) : (
                        <Link to={link.href} className="text-sm text-slate-500 hover:text-[#0b57d0]">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 text-xs text-slate-500 sm:px-6 md:flex-row lg:px-8">
          <span>Copyright {new Date().getFullYear()} Suraj Books. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-[#0b57d0]">Privacy</Link>
            <Link to="/terms" className="hover:text-[#0b57d0]">Terms</Link>
            <Link to="/sitemap" className="hover:text-[#0b57d0]">Status</Link>
            <div className="flex gap-2 pl-2">
              {socials.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-[#0b57d0] hover:text-[#0b57d0]"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
