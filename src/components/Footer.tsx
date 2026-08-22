import React from 'react';
import { Logo } from './Logo';
import { RESTAURANT_INFO } from '../data/restaurantData';
import {
  MapPin,
  Phone,
  Clock,
  Navigation,
  Heart,
  MessageCircle,
  Utensils,
  ArrowUp,
  ShieldCheck,
} from 'lucide-react';

interface FooterProps {
  onOpenAdminPortal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminPortal }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About Us', href: '#about' },
    { label: 'Our Menu', href: '#menu' },
    { label: 'Restaurant Services', href: '#services' },
    { label: 'Why Choose Us', href: '#why-us' },
    { label: 'Food Gallery', href: '#gallery' },
    { label: 'Location & Map', href: '#location' },
    { label: 'Contact Us', href: '#contact' },
  ];

  return (
    <footer className="bg-stone-950 text-stone-300 pt-16 pb-12 border-t border-stone-900 text-left relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-stone-800">
          
          {/* Col 1: Brand & Tagline */}
          <div className="lg:col-span-4 space-y-4">
            <Logo variant="dark" size="lg" />
            
            <p className="text-amber-400 font-serif italic text-base">
              "Delicious food. Great moments."
            </p>

            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed max-w-sm">
              Your favorite food destination at Santosh Bhuvan, Nalasopara East. Serving freshly prepared, quality dishes with authentic flavor and genuine hospitality.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href={RESTAURANT_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 text-xs font-semibold border border-emerald-700/50 flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Us</span>
              </a>

              <a
                href={RESTAURANT_INFO.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 flex items-center gap-1.5 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
                <span>Directions</span>
              </a>

              {onOpenAdminPortal && (
                <button
                  type="button"
                  onClick={onOpenAdminPortal}
                  id="footer-admin-portal-btn"
                  className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-amber-950/60 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Portal</span>
                </button>
              )}
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="font-['Outfit',sans-serif] text-sm font-bold uppercase tracking-wider text-white">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {navLinks.map((item, idx) => (
                <li key={idx}>
                  <a
                    href={item.href}
                    id={`footer-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-stone-400 hover:text-amber-400 transition-colors inline-block"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Services Summary */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-['Outfit',sans-serif] text-sm font-bold uppercase tracking-wider text-white">
              Services
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li>• Dine-In Seating</li>
              <li>• Hot Food Takeaway</li>
              <li>• Phone Food Ordering</li>
              <li>• Family Dining</li>
              <li>• Table Inquiries</li>
              <li>• Custom Party Orders</li>
            </ul>
          </div>

          {/* Col 4: Contact & Hours */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="font-['Outfit',sans-serif] text-sm font-bold uppercase tracking-wider text-white">
              Restaurant Info
            </h4>
            
            <div className="space-y-3 text-xs text-stone-400">
              {/* Address */}
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Vegies Restro</div>
                  <div>Santosh Bhuvan, Nalasopara East, Palghar, Maharashtra 401209, India</div>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <a
                    href={`tel:${RESTAURANT_INFO.phone}`}
                    className="text-white hover:text-amber-300 font-bold transition-colors"
                  >
                    +91 {RESTAURANT_INFO.phone}
                  </a>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Business Hours:</div>
                  <div>9:00 AM to 11:00 PM</div>
                  <div className="text-emerald-400 font-medium">Open Daily (7 Days)</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Micro Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <div className="text-center sm:text-left">
            © {new Date().getFullYear()} <strong className="text-stone-300">Vegies Restro</strong>. All rights reserved.
          </div>

          <div className="flex items-center gap-3">
            <span>Made with passion in Nalasopara East</span>
            {onOpenAdminPortal && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={onOpenAdminPortal}
                  className="text-amber-400 hover:underline cursor-pointer"
                >
                  Admin Access
                </button>
              </>
            )}
          </div>

          {/* Back to top button */}
          <button
            type="button"
            onClick={scrollToTop}
            id="footer-back-to-top-btn"
            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-emerald-700 text-stone-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-stone-700"
            aria-label="Back to top"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

      </div>
    </footer>
  );
};
