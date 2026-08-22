import React from 'react';
import { SERVICES_DATA, RESTAURANT_INFO } from '../data/restaurantData';
import {
  Utensils,
  ShoppingBag,
  PhoneCall,
  Users,
  MessageSquareText,
  Sparkles,
  CheckCircle2,
  Phone,
  ArrowUpRight,
} from 'lucide-react';

interface ServicesSectionProps {
  onOpenInquiry: (serviceType: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onOpenInquiry }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Utensils':
        return <Utensils className="w-6 h-6" />;
      case 'ShoppingBag':
        return <ShoppingBag className="w-6 h-6" />;
      case 'PhoneCall':
        return <PhoneCall className="w-6 h-6" />;
      case 'Users':
        return <Users className="w-6 h-6" />;
      case 'MessageSquareText':
        return <MessageSquareText className="w-6 h-6" />;
      default:
        return <Sparkles className="w-6 h-6" />;
    }
  };

  return (
    <section id="services" className="py-20 bg-stone-50/80 relative border-t border-stone-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>What We Offer</span>
          </div>
          <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Our Restaurant Services
          </h2>
          <p className="text-base sm:text-lg text-stone-600 mt-3 leading-relaxed">
            Vegies Restro provides welcoming hospitality, prompt takeaway, and complete dining solutions for every occasion in Nalasopara East.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES_DATA.map((service, index) => {
            return (
              <div
                key={service.id}
                id={`service-card-${service.id}`}
                className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between text-left group"
              >
                <div>
                  {/* Icon & Index */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-xs">
                      {getIcon(service.icon)}
                    </div>
                    <span className="text-xs font-bold text-stone-600 font-mono">
                      0{index + 1}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-['Outfit',sans-serif] text-xl font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
                    {service.title}
                  </h3>

                  <p className="text-stone-600 text-sm mt-2 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Feature Bullets */}
                  <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
                    {service.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-stone-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="pt-6 mt-4">
                  <button
                    type="button"
                    id={`service-btn-${service.id}`}
                    onClick={() => onOpenInquiry(service.title)}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-50 hover:bg-emerald-600 text-stone-700 hover:text-white text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 border border-stone-200 hover:border-emerald-600 cursor-pointer"
                  >
                    <span>Inquire for {service.title}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Special Quick Contact Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-lg flex flex-col justify-between text-left">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 mb-5 border border-white/20">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="font-['Outfit',sans-serif] text-xl font-bold text-white">
                Have a Custom Request?
              </h3>
              <p className="text-stone-200 text-sm mt-2 leading-relaxed">
                Planning a birthday dinner, small party order, or family celebration? Call our manager directly for personalized arrangements.
              </p>
            </div>

            <div className="pt-6 mt-4">
              <a
                href={`tel:${RESTAURANT_INFO.phone}`}
                className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Phone className="w-4 h-4 fill-current" />
                <span>Call {RESTAURANT_INFO.formattedPhone}</span>
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
