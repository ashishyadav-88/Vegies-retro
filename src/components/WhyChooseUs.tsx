import React from 'react';
import { WHY_CHOOSE_US_DATA } from '../data/restaurantData';
import {
  ChefHat,
  BadgePercent,
  Sparkles,
  HeartHandshake,
  MapPin,
  Clock,
  CheckCircle,
} from 'lucide-react';

export const WhyChooseUs: React.FC = () => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ChefHat':
        return <ChefHat className="w-6 h-6 text-emerald-600" />;
      case 'BadgePercent':
        return <BadgePercent className="w-6 h-6 text-amber-600" />;
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-emerald-600" />;
      case 'HeartHandshake':
        return <HeartHandshake className="w-6 h-6 text-amber-600" />;
      case 'MapPin':
        return <MapPin className="w-6 h-6 text-emerald-600" />;
      case 'Clock':
        return <Clock className="w-6 h-6 text-amber-600" />;
      default:
        return <CheckCircle className="w-6 h-6 text-emerald-600" />;
    }
  };

  return (
    <section id="why-us" className="py-20 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Why Dine With Us</span>
          </div>
          <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Why Choose Vegies Restro?
          </h2>
          <p className="text-base sm:text-lg text-stone-600 mt-3 leading-relaxed">
            We prioritize high culinary standards, hygienic preparation, and honest hospitality to give every guest a comforting dining experience.
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHY_CHOOSE_US_DATA.map((item, index) => {
            return (
              <div
                key={item.id}
                id={`why-choose-${item.id}`}
                className="p-6 rounded-3xl bg-stone-50/70 border border-stone-200/80 hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-300 text-left group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-stone-200/80 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {getIcon(item.icon)}
                </div>

                <h3 className="font-['Outfit',sans-serif] text-lg font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                  {item.title}
                </h3>

                <p className="text-stone-600 text-sm mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
