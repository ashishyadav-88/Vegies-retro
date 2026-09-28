import React, { useState, useEffect, useRef } from 'react';
import { Logo } from './Logo';
import { RESTAURANT_INFO } from '../data/restaurantData';
import { useAuth } from '../context/AuthContext';
import {
  Phone,
  Clock,
  MapPin,
  Menu as MenuIcon,
  X,
  ChevronRight,
  Utensils,
  CalendarCheck,
  Navigation,
  User as UserIcon,
  LogOut,
  Bookmark,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

// Custom WhatsApp SVG Icon
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
  </svg>
);

interface NavbarProps {
  onOpenInquiry: (serviceType?: string) => void;
  onOpenOrderFood: (category?: string, dishName?: string) => void;
  onOpenFullMenu: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup', prompt?: string) => void;
  onOpenUserBookings: () => void;
  onOpenAdminPortal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenInquiry,
  onOpenOrderFood,
  onOpenFullMenu,
  onOpenAuth,
  onOpenUserBookings,
  onOpenAdminPortal,
}) => {
  const { user, userProfile, isAdmin, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // Active section spy
      const sections = ['home', 'about', 'menu', 'services', 'why-us', 'gallery', 'location', 'contact'];
      const scrollPosition = window.scrollY + 120;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { label: 'Home', href: '#home', id: 'home' },
    { label: 'About', href: '#about', id: 'about' },
    { label: 'Menu', href: '#menu', id: 'menu' },
    { label: 'Services', href: '#services', id: 'services' },
    { label: 'Why Us', href: '#why-us', id: 'why-us' },
    { label: 'Gallery', href: '#gallery', id: 'gallery' },
    { label: 'Location & Contact', href: '#location', id: 'location' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 dark:bg-stone-950/95 backdrop-blur-md shadow-sm border-b border-stone-200/80 dark:border-stone-800/80 py-3'
          : 'bg-white/85 dark:bg-stone-950/85 backdrop-blur-sm py-4 border-b border-stone-200/50 dark:border-stone-800/50'
      }`}
    >
      {/* Top micro bar for timings & quick location */}
      <div className="hidden lg:block border-b border-stone-100/80 dark:border-stone-800/60 pb-2 mb-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 font-medium">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Open Daily: {RESTAURANT_INFO.hours.display}
            </span>
            <span className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              {RESTAURANT_INFO.address.landmark}, {RESTAURANT_INFO.address.area}, Palghar
            </span>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={onOpenAdminPortal}
                  id="topbar-admin-btn"
                  className="text-stone-500 dark:text-stone-300 hover:text-amber-500 dark:hover:text-amber-400 flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>Manager Portal</span>
                </button>
                <span className="text-stone-300 dark:text-stone-700">|</span>
              </>
            )}
            <a
              href={RESTAURANT_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="header-top-whatsapp"
              className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold transition-colors"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              WhatsApp: {RESTAURANT_INFO.formattedPhone}
            </a>
            <span className="text-stone-300 dark:text-stone-700">|</span>
            <a
              href={`tel:${RESTAURANT_INFO.phone}`}
              id="header-top-phone"
              className="flex items-center gap-1 text-stone-700 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 font-semibold transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Call: {RESTAURANT_INFO.formattedPhone}
            </a>
            <span className="text-stone-300 dark:text-stone-700">|</span>
            <a
              href={RESTAURANT_INFO.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <Navigation className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              Get Directions
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Logo size="md" />

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  id={`nav-link-${link.id}`}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 font-bold border border-transparent dark:border-emerald-800/40'
                      : 'text-stone-600 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-stone-50 dark:hover:bg-stone-900/60'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Desktop Header Actions */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            {/* Admin Portal Direct Button if Admin Logged in */}
            {isAdmin ? (
              <button
                type="button"
                id="nav-admin-portal-active-btn"
                onClick={onOpenAdminPortal}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-stone-900 hover:bg-stone-800 border border-amber-400/40 shadow-xs hover:shadow-sm transition-all duration-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Admin Portal</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </button>
            ) : (
              <button
                type="button"
                id="nav-quick-menu-btn"
                onClick={onOpenFullMenu}
                className="px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold text-stone-700 dark:text-stone-200 bg-stone-100/90 dark:bg-stone-800/90 hover:bg-stone-200/90 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-white border border-stone-200/80 dark:border-stone-700 transition-all duration-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Menu</span>
              </button>
            )}

            {/* WhatsApp Chat Button */}
            <a
              href={RESTAURANT_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="nav-whatsapp-btn"
              className="px-3.5 py-2 rounded-xl text-xs xl:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xs hover:shadow-md hover:shadow-emerald-600/20 transition-all duration-200 flex items-center gap-1.5 active:scale-95 group"
              aria-label="Chat on WhatsApp"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white group-hover:rotate-6 transition-transform" />
              <span>WhatsApp</span>
            </a>

            {/* User Profile / Sign In Button */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  id="nav-user-profile-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${
                    isAdmin
                      ? 'border-amber-400/60 bg-stone-900 text-amber-300 hover:bg-stone-800'
                      : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-2xs ${
                      isAdmin ? 'bg-amber-400 text-stone-950' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isAdmin ? '👑' : userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="max-w-[100px] xl:max-w-[120px] truncate">
                    {isAdmin ? 'Parvati (Admin)' : userProfile?.displayName || 'My Account'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200/90 dark:border-stone-700/90 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-4 py-2 border-b border-stone-100 dark:border-stone-800">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-stone-900 dark:text-white truncate">
                          {userProfile?.displayName || 'Manager'}
                        </p>
                        {isAdmin && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-[10px] font-bold">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{user.email}</p>
                    </div>

                    {/* Admin Portal Shortcut in dropdown - ONLY for Admins */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenAdminPortal();
                        }}
                        className="w-full px-4 py-2.5 text-xs text-left font-bold text-stone-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-900 flex items-center gap-2 cursor-pointer border-b border-stone-100 dark:border-stone-800 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Admin Management Portal</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenUserBookings();
                      }}
                      className="w-full px-4 py-2.5 text-xs text-left font-semibold text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Bookmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>My Bookings & Orders</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setUserDropdownOpen(false);
                        await logout();
                      }}
                      className="w-full px-4 py-2.5 text-xs text-left font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2 cursor-pointer border-t border-stone-100 dark:border-stone-800 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                id="nav-signin-btn"
                onClick={() => onOpenAuth('signin')}
                className="px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200/90 dark:border-stone-700/90 shadow-2xs hover:shadow-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <UserIcon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-1.5 lg:hidden">
            {isAdmin ? (
              <button
                type="button"
                onClick={onOpenAdminPortal}
                className="w-10 h-10 rounded-xl bg-stone-900 text-amber-400 border border-amber-400/50 flex items-center justify-center font-bold text-xs shadow-xs"
                aria-label="Admin Portal"
              >
                <ShieldCheck className="w-5 h-5" />
              </button>
            ) : user ? (
              <button
                type="button"
                onClick={onOpenUserBookings}
                className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center font-bold text-xs border border-stone-200 dark:border-stone-700"
                aria-label="My Account and Bookings"
              >
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('signin')}
                className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 flex items-center justify-center border border-stone-200 dark:border-stone-700 text-xs"
                aria-label="Sign In"
              >
                <UserIcon className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              </button>
            )}

            <a
              href={RESTAURANT_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="mobile-nav-whatsapp-icon"
              className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-sm shadow-emerald-600/30 transition-all"
              aria-label="Chat on WhatsApp (7028818440)"
              title="Chat on WhatsApp (7028818440)"
            >
              <WhatsAppIcon className="w-5 h-5 text-white fill-white" />
            </a>

            <button
              type="button"
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 flex items-center justify-center border border-stone-200 dark:border-stone-700 active:scale-95 transition-transform cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="lg:hidden fixed inset-x-0 top-[65px] bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-2xl max-h-[calc(100vh-65px)] overflow-y-auto animate-in slide-in-from-top-2 duration-200"
        >
          <div className="px-5 py-6 space-y-4">
            {/* User Profile / Admin Banner in Mobile Drawer */}
            {user ? (
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isAdmin
                    ? 'bg-stone-900 text-white border-amber-500/50'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isAdmin ? 'bg-amber-400 text-stone-950' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isAdmin ? '👑' : userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h5
                      className={`text-xs font-bold ${
                        isAdmin ? 'text-white' : 'text-stone-900 dark:text-stone-100'
                      }`}
                    >
                      {isAdmin ? 'Parvati Yadav (Manager)' : userProfile?.displayName || 'Logged In'}
                    </h5>
                    <p className={`text-[11px] truncate max-w-[150px] ${isAdmin ? 'text-stone-300' : 'text-stone-500 dark:text-stone-400'}`}>
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAdminPortal();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-400 text-stone-950 text-xs font-bold shadow-2xs"
                    >
                      Admin Panel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenUserBookings();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-2xs"
                    >
                      My Bookings
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await logout();
                    }}
                    className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100">Welcome to Vegies Restro</h5>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Sign in to save your bookings</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signin');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                >
                  Sign In / Join
                </button>
              </div>
            )}

            {/* Admin Direct Access in Mobile Drawer - ONLY for Admins */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdminPortal();
                }}
                className="w-full p-3 rounded-2xl bg-stone-900 text-white border border-amber-500/40 flex items-center justify-between text-xs font-bold shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Admin & Staff Portal</span>
                </div>
                <span className="text-[11px] text-amber-300 font-normal">Manage Bookings →</span>
              </button>
            )}

            {/* Quick Status Banner */}
            <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                Open Today: {RESTAURANT_INFO.hours.display}
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Nalasopara East</span>
            </div>

            {/* Nav links */}
            <div className="space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  id={`mobile-nav-link-${link.id}`}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-base font-semibold text-stone-800 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-stone-800 hover:text-emerald-800 dark:hover:text-emerald-400 active:bg-emerald-100 transition-colors"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </a>
              ))}
            </div>

            {/* Action Buttons in Drawer */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
              {/* WhatsApp Chat in Drawer */}
              <a
                href={RESTAURANT_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="mobile-drawer-whatsapp-btn"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 active:bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 shadow-sm text-center"
              >
                <WhatsAppIcon className="w-5 h-5 text-white" />
                <span>Chat on WhatsApp (+91 70288 18440)</span>
              </a>

              {/* Call in Drawer */}
              <a
                href={`tel:${RESTAURANT_INFO.phone}`}
                id="mobile-drawer-call-btn"
                className="w-full py-3.5 px-4 rounded-xl bg-stone-900 dark:bg-stone-800 active:bg-black text-white font-bold flex items-center justify-center gap-2 shadow-sm text-center border border-stone-800 dark:border-stone-700"
              >
                <Phone className="w-5 h-5 fill-current text-emerald-400" />
                <span>Call {RESTAURANT_INFO.formattedPhone}</span>
              </a>

              {/* Booking & Order Direct CTAs in Drawer */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="mobile-drawer-booking-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenInquiry('Dine-In Table Inquiry');
                  }}
                  className="py-3 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold flex items-center justify-center gap-1.5 text-xs shadow-sm cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Table Booking</span>
                </button>

                <button
                  type="button"
                  id="mobile-drawer-order-food-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenOrderFood();
                  }}
                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 text-xs shadow-sm cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Order Food</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="mobile-drawer-menu-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenFullMenu();
                  }}
                  className="py-3 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold flex items-center justify-center gap-1.5 border border-stone-200 dark:border-stone-700 text-sm"
                >
                  <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Full Menu</span>
                </button>

                <a
                  href={RESTAURANT_INFO.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="mobile-drawer-directions-btn"
                  className="py-3 px-3 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300 font-semibold flex items-center justify-center gap-1.5 border border-amber-200 dark:border-amber-800/60 text-sm"
                >
                  <Navigation className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>Directions</span>
                </a>
              </div>
            </div>

            {/* Address in Drawer */}
            <div className="pt-2 text-xs text-stone-500 dark:text-stone-400 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
              <span>{RESTAURANT_INFO.address.full}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
