import React from 'react';
import { RESTAURANT_INFO } from '../data/restaurantData';
import {
  Phone,
  Navigation,
  Utensils,
} from 'lucide-react';
import { WhatsAppIcon } from './Navbar';

interface FloatingActionsProps {
  onOpenFullMenu: () => void;
  onOpenInquiry: (serviceType?: string) => void;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({
  onOpenFullMenu,
  onOpenInquiry,
}) => {
  return (
    <div
      id="mobile-floating-action-bar"
      className="lg:hidden fixed bottom-3 inset-x-3 z-40 bg-stone-950/95 backdrop-blur-md text-white p-2 rounded-2xl shadow-2xl border border-stone-800 flex items-center justify-between gap-1.5 animate-in slide-in-from-bottom-3 duration-300"
    >
      {/* 1. Call Now Button */}
      <a
        href={`tel:${RESTAURANT_INFO.phone}`}
        id="floating-call-btn"
        className="flex-1 py-2.5 px-2 rounded-xl bg-stone-900 active:bg-stone-800 text-white font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1 border border-stone-700 shadow-sm text-center"
        aria-label="Call Vegies Restro"
      >
        <Phone className="w-4 h-4 fill-current text-emerald-400" />
        <span className="truncate">Call Now</span>
      </a>

      {/* 2. Menu Button */}
      <button
        type="button"
        id="floating-menu-btn"
        onClick={onOpenFullMenu}
        className="flex-1 py-2.5 px-2 rounded-xl bg-stone-800 active:bg-stone-700 text-stone-200 font-semibold text-xs flex flex-col sm:flex-row items-center justify-center gap-1 border border-stone-700 cursor-pointer text-center"
      >
        <Utensils className="w-4 h-4 text-amber-400" />
        <span className="truncate">Menu</span>
      </button>

      {/* 3. Directions Button */}
      <a
        href={RESTAURANT_INFO.googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        id="floating-directions-btn"
        className="flex-1 py-2.5 px-2 rounded-xl bg-stone-800 active:bg-stone-700 text-stone-200 font-semibold text-xs flex flex-col sm:flex-row items-center justify-center gap-1 border border-stone-700 text-center"
        aria-label="Get Directions"
      >
        <Navigation className="w-4 h-4 text-emerald-400" />
        <span className="truncate">Directions</span>
      </a>

      {/* 4. WhatsApp Chat */}
      <a
        href={RESTAURANT_INFO.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        id="floating-whatsapp-btn"
        className="py-2.5 px-3 rounded-xl bg-emerald-500 active:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md shadow-emerald-900/40"
        aria-label="Chat on WhatsApp (7028818440)"
        title="Chat on WhatsApp (7028818440)"
      >
        <WhatsAppIcon className="w-4 h-4 text-white" />
      </a>
    </div>
  );
};
