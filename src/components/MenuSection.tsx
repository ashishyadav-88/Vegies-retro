import React, { useState, useMemo } from 'react';
import { MENU_CATEGORIES, MENU_ITEMS } from '../data/menuData';
import { MenuItem } from '../types';
import { RESTAURANT_INFO } from '../data/restaurantData';
import {
  Utensils,
  Search,
  Flame,
  Soup,
  UtensilsCrossed,
  Pizza,
  Coffee,
  Cake,
  LayoutGrid,
  FileText,
  Phone,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Info,
  Truck,
} from 'lucide-react';

interface MenuSectionProps {
  onOpenFullMenu: () => void;
  onOpenInquiryWithDish?: (dishName: string) => void;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  onOpenFullMenu,
  onOpenInquiryWithDish,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-4 h-4" />;
      case 'Soup':
        return <Soup className="w-4 h-4" />;
      case 'UtensilsCrossed':
        return <UtensilsCrossed className="w-4 h-4" />;
      case 'Utensils':
        return <Utensils className="w-4 h-4" />;
      case 'Pizza':
        return <Pizza className="w-4 h-4" />;
      case 'Coffee':
        return <Coffee className="w-4 h-4" />;
      case 'Cake':
        return <Cake className="w-4 h-4" />;
      default:
        return <LayoutGrid className="w-4 h-4" />;
    }
  };

  const filteredItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <section id="menu" className="py-20 bg-white dark:bg-stone-950 relative transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-3 border border-transparent dark:border-amber-800/50">
            <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Our Delicious Offerings</span>
          </div>
          <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            Explore the Menu at Vegies Restro
          </h2>
          <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 mt-3">
            From crispy appetizers and aromatic Indian curries to Indo-Chinese specialties and refreshing drinks — made fresh on order.
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="space-y-5 mb-10">
          
          {/* Search bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for starters, paneer, biryani, noodles..."
              id="menu-search-input"
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-stone-800 text-sm text-stone-800 dark:text-stone-100 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs Scrollable */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none px-2">
            {MENU_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`menu-cat-btn-${cat.id}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-md shadow-emerald-800/20'
                      : 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-200/60 dark:border-stone-800'
                  }`}
                >
                  {getCategoryIcon(cat.iconName)}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

        </div>

        {/* Menu Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-stone-50 dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
            <Utensils className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200">No matching dishes found</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Try adjusting your search query or select another category.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                id={`menu-item-${item.id}`}
                className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 flex flex-col overflow-hidden group text-left"
              >
                {/* Food Image */}
                <div className="relative h-44 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent" />

                  {/* Veg Indian Stamp Indicator */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs p-1 rounded border border-green-600 shadow-xs flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
                  </div>

                  {/* Spice, Special or Free Delivery Tag */}
                  {item.id === 'starter-1' || item.name.toLowerCase().includes('paneer tikka') ? (
                    <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Free Delivery
                    </div>
                  ) : item.isChefSpecial ? (
                    <div className="absolute top-3 right-3 bg-amber-500 text-amber-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Special
                    </div>
                  ) : null}

                  {/* Price Tag Overlay if provided */}
                  {item.price && (
                    <div className="absolute bottom-2.5 right-3 bg-black/75 backdrop-blur-xs text-amber-300 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-white/20">
                      {item.price}
                    </div>
                  )}
                </div>

                {/* Content Box */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-['Outfit',sans-serif] font-bold text-stone-900 dark:text-stone-100 text-base group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {item.name}
                      </h4>
                    </div>

                    <p className="text-stone-600 dark:text-stone-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="pt-4 mt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded capitalize">
                      {item.category.replace('-', ' ')}
                    </span>

                    <button
                      type="button"
                      id={`order-dish-btn-${item.id}`}
                      onClick={() => {
                        if (onOpenInquiryWithDish) {
                          onOpenInquiryWithDish(item.name);
                        } else {
                          window.location.href = `tel:${RESTAURANT_INFO.phone}`;
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 group-hover:underline cursor-pointer"
                    >
                      <span>Inquire / Order</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Full Menu Prominent Action & Notice */}
        <div className="mt-14 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 dark:from-emerald-950 dark:via-stone-900 dark:to-teal-950 text-white shadow-xl text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 border border-emerald-800/40">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="font-['Outfit',sans-serif] text-xl sm:text-2xl font-extrabold text-amber-300">
              Looking for our complete menu?
            </h3>
            <p className="text-stone-200 text-xs sm:text-sm leading-relaxed">
              Explore our full multi-cuisine list or call us directly to check today's chef specials and customize your meal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              id="view-full-menu-btn"
              onClick={onOpenFullMenu}
              className="px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>View Full Menu</span>
            </button>

            <a
              href={`tel:${RESTAURANT_INFO.phone}`}
              id="menu-call-now-btn"
              className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/30 backdrop-blur-xs transition-all flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span>Call: {RESTAURANT_INFO.formattedPhone}</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};
