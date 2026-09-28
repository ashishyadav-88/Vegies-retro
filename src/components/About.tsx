import React from 'react';
import { RESTAURANT_INFO } from '../data/restaurantData';
import {
  Sparkles,
  UtensilsCrossed,
  Armchair,
  HeartHandshake,
  ShoppingBag,
  Clock,
  Phone,
  CheckCircle2,
} from 'lucide-react';

interface AboutProps {
  onOpenInquiry: (serviceType?: string) => void;
}

export const About: React.FC<AboutProps> = ({ onOpenInquiry }) => {
  const highlights = [
    {
      title: 'Fresh & Delicious Food',
      description: 'Prepared using quality ingredients, aromatic spices, and traditional recipes to deliver authentic taste in every bite.',
      icon: UtensilsCrossed,
      color: 'emerald',
    },
    {
      title: 'Comfortable Dining',
      description: 'A clean, calm, and welcoming seating space designed for families, couples, and friends to relax and enjoy their meals.',
      icon: Armchair,
      color: 'amber',
    },
    {
      title: 'Friendly Service',
      description: 'Our attentive team is dedicated to providing prompt service and warm hospitality to make you feel right at home.',
      icon: HeartHandshake,
      color: 'emerald',
    },
    {
      title: 'Takeaway Available',
      description: 'Convenient takeout and food ordering options with clean, heat-sealed packing so your food stays hot and fresh.',
      icon: ShoppingBag,
      color: 'amber',
    },
  ];

  return (
    <section id="about" className="py-20 bg-stone-50/70 dark:bg-stone-950/40 relative border-t border-stone-200/60 dark:border-stone-800/60 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3 border border-transparent dark:border-emerald-800/50">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>About Vegies Restro</span>
          </div>
          <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            A Welcoming Space for Great Taste & Memorable Moments
          </h2>
          <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 mt-4 leading-relaxed">
            Located at Santosh Bhuvan, Nalasopara East, Vegies Restro is dedicated to bringing people together over delicious, flavorful food prepared with care and high standards of cleanliness.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Visual Story Image */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80"
                alt="Vegies Restro dining ambience and seating"
                className="w-full h-80 sm:h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />

              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-100 dark:border-stone-800 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                      Santosh Bhuvan, Nalasopara East
                    </p>
                    <p className="text-sm font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
                      Open Every Day: 9:00 AM – 11:00 PM
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Highlights Cards */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="text-left">
              <h3 className="font-['Outfit',sans-serif] text-2xl font-bold text-stone-900 dark:text-stone-100 mb-3">
                Committed to Quality, Cleanliness & Customer Happiness
              </h3>
              <p className="text-stone-600 dark:text-stone-300 text-base leading-relaxed">
                Whether you are stepping in for a hearty family dinner, a quick afternoon bite, or picking up a takeaway parcel for home, our kitchen is committed to fresh preparations and sincere hospitality.
              </p>
            </div>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {highlights.map((item, index) => {
                const IconComponent = item.icon;
                const isEmerald = item.color === 'emerald';
                return (
                  <div
                    key={index}
                    id={`about-highlight-${index}`}
                    className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all text-left group"
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105 ${
                        isEmerald
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <h4 className="font-['Outfit',sans-serif] text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Quick About Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-stone-200 dark:border-stone-800">
              <a
                href={`tel:${RESTAURANT_INFO.phone}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Call {RESTAURANT_INFO.formattedPhone}</span>
              </a>

              <button
                type="button"
                onClick={() => onOpenInquiry('Table Booking / General')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-sm font-bold border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
              >
                <span>Make an Inquiry</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
