import React, { useState } from 'react';
import { MENU_CATEGORIES, MENU_ITEMS } from '../data/menuData';
import { RESTAURANT_INFO } from '../data/restaurantData';
import {
  X,
  Phone,
  MessageCircle,
  Sparkles,
  Utensils,
  Search,
  Check,
  Flame,
  Printer,
  ChevronDown,
  Truck,
} from 'lucide-react';

interface FullMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDishForInquiry?: (dishName: string) => void;
}

export const FullMenuModal: React.FC<FullMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectDishForInquiry,
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const validCategories = MENU_CATEGORIES.filter((c) => c.id !== 'all');

  const filteredItems = MENU_ITEMS.filter((item) => {
    const matchesCat = activeTab === 'all' || item.category === activeTab;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="full-menu-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full h-[90vh] bg-stone-900 text-stone-100 rounded-3xl overflow-hidden shadow-2xl border border-stone-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-6 bg-stone-950 border-b border-stone-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Utensils className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-['Outfit',sans-serif] text-lg sm:text-xl font-bold text-white">
                Vegies Restro — Full Menu
              </h3>
              <p className="text-xs text-stone-400">
                Santosh Bhuvan, Nalasopara East • Call: {RESTAURANT_INFO.formattedPhone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              id="full-menu-close-btn"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-stone-700"
              aria-label="Close menu modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 sm:p-4 bg-stone-900/90 border-b border-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              All Categories
            </button>
            {validCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveTab(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === c.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Scrollable Menu Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 text-left">
          
          {/* If viewing All, group by Category */}
          {activeTab === 'all' && !search ? (
            validCategories.map((cat) => {
              const catItems = MENU_ITEMS.filter((i) => i.category === cat.id);
              if (catItems.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-4">
                  {/* Category Title Header */}
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-800">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <h4 className="font-['Outfit',sans-serif] text-lg font-bold text-amber-400">
                      {cat.name}
                    </h4>
                    <span className="text-xs text-stone-500">
                      ({cat.description})
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80 hover:border-emerald-600/60 transition-colors flex items-start gap-3.5 justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {/* Veg Dot */}
                            <span className="w-3 h-3 rounded-xs border border-green-500 flex items-center justify-center shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            </span>
                            <span className="font-bold text-white text-sm">
                              {item.name}
                            </span>
                            {item.id === 'starter-1' || item.name.toLowerCase().includes('paneer tikka') ? (
                              <span className="text-[9px] font-bold bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Truck className="w-2.5 h-2.5" />
                                Free Delivery
                              </span>
                            ) : item.isChefSpecial ? (
                              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded">
                                Special
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                          <span className="font-extrabold text-amber-400 text-sm">
                            {item.price || '—'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              if (onSelectDishForInquiry) onSelectDishForInquiry(item.name);
                            }}
                            className="mt-2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                          >
                            Order / Inquire
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            /* Filtered Single Category or Search Results */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80 hover:border-emerald-600/60 transition-colors flex items-start gap-3.5 justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-xs border border-green-500 flex items-center justify-center shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      </span>
                      <span className="font-bold text-white text-sm">
                        {item.name}
                      </span>
                      {item.id === 'starter-1' || item.name.toLowerCase().includes('paneer tikka') ? (
                        <span className="text-[9px] font-bold bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Truck className="w-2.5 h-2.5" />
                          Free Delivery
                        </span>
                      ) : item.isChefSpecial ? (
                        <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded">
                          Special
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                      {item.category.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end justify-between self-stretch">
                    <span className="font-extrabold text-amber-400 text-sm">
                      {item.price || '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onSelectDishForInquiry) onSelectDishForInquiry(item.name);
                      }}
                      className="mt-2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                    >
                      Order / Inquire
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 sm:p-5 bg-stone-950 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-stone-400 text-center sm:text-left">
            <span>Special preparation? Jain food or spice adjustments available on request.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <a
              href={`tel:${RESTAURANT_INFO.phone}`}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold flex items-center justify-center gap-2 transition-colors text-center"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Call: {RESTAURANT_INFO.phone}</span>
            </a>

            <a
              href={RESTAURANT_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 transition-colors text-center"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
