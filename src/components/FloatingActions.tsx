import React from 'react';
import { RESTAURANT_INFO } from '../data/restaurantData';
import {
  Phone,
  Navigation,
  Utensils,
  CalendarCheck,
  ShoppingBag,
} from 'lucide-react';
import { WhatsAppIcon } from './Navbar';

interface FloatingActionsProps {
  onOpenFullMenu: () => void;
  onOpenInquiry: (serviceType?: string) => void;
  onOpenOrderFood: () => void;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({
  onOpenFullMenu,
  onOpenInquiry,
  onOpenOrderFood,
}) => {
  return (
    <div
      id="mobile-floating-action-bar"
      className="lg:hidden fixed bottom-3 inset-x-2 sm:inset-x-4 max-w-lg mx-auto z-40 bg-stone-950/95 backdrop-blur-xl text-white p-1.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] border border-stone-800/90 ring-1 ring-white/10 flex items-center justify-between gap-1.5 animate-in slide-in-from-bottom-4 duration-300 select-none"
    >
      {/* 1. Table Booking Button */}
      <button
        type="button"
        id="floating-inquire-btn"
        onClick={() => onOpenInquiry('Dine-In Table Inquiry')}
        className="flex-1 py-2.5 px-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.97] text-amber-950 font-extrabold text-xs flex items-center justify-center gap-1 shadow-md shadow-amber-950/40 transition-all cursor-pointer text-center"
      >
        <CalendarCheck className="w-4 h-4 text-amber-950 shrink-0" />
        <span className="truncate tracking-tight font-bold text-[11px] sm:text-xs">Table Booking</span>
      </button>

      {/* 2. Order Food Button (Just beside Table Booking) */}
      <button
        type="button"
        id="floating-order-btn"
        onClick={onOpenOrderFood}
        className="flex-1 py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.97] text-white font-extrabold text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-950/40 transition-all cursor-pointer text-center"
      >
        <ShoppingBag className="w-4 h-4 text-white shrink-0" />
        <span className="truncate tracking-tight font-bold text-[11px] sm:text-xs">Order Food</span>
      </button>

      {/* 3. Menu Button */}
      <button
        type="button"
        id="floating-menu-btn"
        onClick={onOpenFullMenu}
        className="py-2.5 px-2 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 text-stone-200 hover:text-white font-medium text-xs flex items-center justify-center gap-1 border border-stone-800 transition-all cursor-pointer"
        aria-label="View Food Menu"
      >
        <Utensils className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="hidden min-[400px]:inline text-[11px] font-semibold">Menu</span>
      </button>

      {/* 4. Call Button */}
      <a
        href={`tel:${RESTAURANT_INFO.phone}`}
        id="floating-call-btn"
        className="py-2.5 px-2 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 text-stone-200 hover:text-white font-medium text-xs flex items-center justify-center gap-1 border border-stone-800 shadow-sm transition-all"
        aria-label="Call Vegies Restro"
      >
        <Phone className="w-3.5 h-3.5 fill-current text-emerald-400 shrink-0" />
      </a>

      {/* 5. WhatsApp Chat Button */}
      <a
        href={RESTAURANT_INFO.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        id="floating-whatsapp-btn"
        className="py-2.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md shadow-emerald-950/40 transition-all"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
      >
        <WhatsAppIcon className="w-4 h-4 text-white" />
      </a>
    </div>
  );
};
