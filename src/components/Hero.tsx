import React from 'react';
import { RESTAURANT_INFO } from '../data/restaurantData';
import {
  Phone,
  Utensils,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Star,
  Navigation,
} from 'lucide-react';

interface HeroProps {
  onOpenInquiry: (serviceType?: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenInquiry }) => {
  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="home"
      className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-gradient-to-b from-emerald-950/5 via-stone-50 to-white"
    >
      {/* Background Decorative Graphic Elements */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-emerald-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Tag / Status Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-300/80 text-emerald-900 text-xs sm:text-sm font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Vegies Restro • Nalasopara East</span>
              <span className="text-emerald-400">•</span>
              <span className="text-emerald-800 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Pure Flavors & Quality
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-['Outfit',sans-serif] text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] font-extrabold text-stone-900 tracking-tight leading-[1.15]">
              Delicious Food,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 underline decoration-amber-400 decoration-wavy decoration-from-font">
                Made With Love
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-lg sm:text-xl text-stone-600 font-normal leading-relaxed max-w-2xl">
              Welcome to <span className="font-semibold text-stone-900">Vegies Restro</span> — your destination for delicious food, great taste, and a memorable dining experience in Nalasopara.
            </p>

            {/* Info Badge: Open Daily */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-sm font-semibold text-stone-700">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Open Daily • 9:00 AM – 11:00 PM</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-900">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Santosh Bhuvan, Nalasopara (E)</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-3">
              {/* View Menu Button */}
              <button
                type="button"
                id="hero-view-menu-btn"
                onClick={() => handleScrollTo('menu')}
                className="px-7 py-4 rounded-xl text-base font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-md shadow-emerald-800/20 hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
              >
                <Utensils className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>View Menu</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Call Now Button */}
              <a
                href={`tel:${RESTAURANT_INFO.phone}`}
                id="hero-call-now-btn"
                className="px-7 py-4 rounded-xl text-base font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 shadow-md shadow-amber-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2.5"
              >
                <Phone className="w-5 h-5 fill-current" />
                <span>Call Now: {RESTAURANT_INFO.formattedPhone}</span>
              </a>

              {/* Directions Button */}
              <a
                href={RESTAURANT_INFO.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="hero-directions-btn"
                className="px-5 py-4 rounded-xl text-base font-semibold text-stone-700 hover:text-emerald-800 bg-white hover:bg-stone-50 border border-stone-300 shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4 text-emerald-600" />
                <span>Get Directions</span>
              </a>
            </div>

            {/* Micro Trust Proofs */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-stone-200/70 max-w-xl">
              <div className="flex items-center gap-2 text-stone-700">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-stone-900">Fresh & Hygienic</div>
                  <div className="text-stone-500">Quality ingredients</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-stone-700">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Utensils className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-stone-900">Dine-in & Parcel</div>
                  <div className="text-stone-500">Quick takeaway</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-stone-700">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-stone-900">Family Friendly</div>
                  <div className="text-stone-500">Comfortable seating</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Visual Showcase Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Outer decorative ring */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-emerald-600 via-amber-400 to-emerald-700 opacity-20 blur-lg" />

              {/* Main Image Container */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-stone-900 aspect-[4/3] sm:aspect-[1/1]">
                <img
                  src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80"
                  alt="Delicious culinary spread at Vegies Restro"
                  className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
                  loading="eager"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/20" />

                {/* Floating pill badge top left */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chef's Daily Specials</span>
                </div>

                {/* Floating pill badge top right */}
                <div className="absolute top-4 right-4 bg-emerald-600/90 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                  <span>100% Pure Taste</span>
                </div>

                {/* Bottom Overlay Info inside Image */}
                <div className="absolute bottom-4 inset-x-4 p-4 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-stone-200/80 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-['Outfit',sans-serif] font-bold text-stone-900 text-base sm:text-lg">
                        Authentic Flavors & Variety
                      </h2>
                      <p className="text-xs text-stone-600 mt-0.5">
                        North Indian • Chinese • Snacks • Sizzling Starters
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleScrollTo('menu')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Explore
                    </button>
                  </div>
                </div>

              </div>

              {/* Secondary Floating Mini Card */}
              <div className="hidden sm:flex absolute -bottom-6 -left-6 bg-white p-3.5 rounded-2xl shadow-xl border border-stone-200/90 items-center gap-3 max-w-xs animate-bounce-subtle">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 font-bold">
                  9-11
                </div>
                <div className="text-left text-xs">
                  <div className="font-bold text-stone-900">Open 7 Days a Week</div>
                  <div className="text-stone-500">9:00 AM to 11:00 PM Daily</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
