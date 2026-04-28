import { Link } from 'react-router-dom';
import { FiFacebook, FiTwitter, FiLinkedin, FiYoutube, FiInstagram, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';

const footerLinks = {
  Products: [
    { label: 'TallyPrime', href: '/products/tallyprime' },
    { label: 'TallyPrime Edit Log', href: '/products/edit-log' },
    { label: 'Shoper 9', href: '/products/shoper' },
    { label: 'TallyPrime Server', href: '/products/server' },
    { label: 'Compare Products', href: '/products' },
  ],
  Solutions: [
    { label: 'Accounting & Finance', href: '/solutions/accounting' },
    { label: 'Inventory Management', href: '/solutions/inventory' },
    { label: 'GST Compliance', href: '/solutions/gst' },
    { label: 'Payroll & HR', href: '/solutions/payroll' },
    { label: 'Banking', href: '/solutions/banking' },
  ],
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Press Room', href: '/press' },
    { label: 'Partners', href: '/partners' },
    { label: 'Contact Us', href: '/contact' },
  ],
  Resources: [
    { label: 'Blog & News', href: '/resources' },
    { label: 'Help Center', href: '/help' },
    { label: 'Downloads', href: '/download' },
    { label: 'Developer API', href: '/developers' },
    { label: 'Webinars', href: '/webinars' },
  ],
};

const socials = [
  { Icon: FiFacebook,  href: '#', label: 'Facebook' },
  { Icon: FiTwitter,   href: '#', label: 'Twitter'  },
  { Icon: FiLinkedin,  href: '#', label: 'LinkedIn' },
  { Icon: FiYoutube,   href: '#', label: 'YouTube'  },
  { Icon: FiInstagram, href: '#', label: 'Instagram'},
];

export default function Footer() {
  return (
    <footer className="bg-[#1a1a2e] text-gray-300">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#003087] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <div>
                <div className="text-white font-bold text-xl leading-none">Tally</div>
                <div className="text-[#ff6600] text-xs font-semibold tracking-wider">SOLUTIONS</div>
              </div>
            </Link>
            <p className="text-sm leading-relaxed mb-6 text-gray-400">
              India's most trusted business management software, empowering 2 million+ businesses across 150+ countries.
            </p>
            <div className="space-y-2 text-sm">
              <a href="tel:1800-309-8859" className="flex items-center gap-2 hover:text-white transition-colors">
                <FiPhone size={14} className="text-[#ff6600]" /> 1800-309-8859
              </a>
              <a href="mailto:support@tallysolutions.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <FiMail size={14} className="text-[#ff6600]" /> support@tallysolutions.com
              </a>
              <div className="flex items-start gap-2">
                <FiMapPin size={14} className="text-[#ff6600] mt-0.5 flex-shrink-0" />
                <span>Tally Solutions Pvt. Ltd., Bengaluru, Karnataka, India</span>
              </div>
            </div>
            {/* Socials */}
            <div className="flex gap-3 mt-6">
              {socials.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#003087] hover:text-white transition-colors"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-white font-semibold mb-4 text-sm">{section}</h4>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} Tally Solutions Pvt. Ltd. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
            <Link to="/sitemap" className="hover:text-white transition-colors">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
