import React from 'react';
import { RESTAURANT_INFO } from '../data/restaurantData';
import {
  MapPin,
  Phone,
  Clock,
  Navigation,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Car,
  Compass,
  CalendarCheck,
} from 'lucide-react';

interface LocationSectionProps {
  onOpenInquiry: (serviceType?: string) => void;
}

export const LocationSection: React.FC<LocationSectionProps> = ({ onOpenInquiry }) => {
  return (
    <section id="location" className="py-20 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider mb-3">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Visit Us In Person</span>
          </div>
          <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Location, Hours & Directions
          </h2>
          <p className="text-base sm:text-lg text-stone-600 mt-3">
            We are conveniently located at Santosh Bhuvan in Nalasopara East. Drop by for dine-in or grab a quick takeaway parcel.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Business Details & Action Cards */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6 text-left">
            
            {/* Main Info Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-stone-50 border border-stone-200/90 shadow-xs space-y-6">
              
              {/* Restaurant Header */}
              <div className="border-b border-stone-200/80 pb-5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md">
                  Restaurant
                </span>
                <h3 className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-extrabold text-stone-900 mt-2">
                  {RESTAURANT_INFO.name}
                </h3>
                <p className="text-stone-600 text-xs mt-1">
                  Delicious Food, Made With Love • Pure Flavors
                </p>
              </div>

              {/* Detail 1: Address (Clickable to Google Maps) */}
              <a
                href={RESTAURANT_INFO.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="location-address-link"
                className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-stone-200 hover:border-emerald-500 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <span>Address</span>
                    <ExternalLink className="w-3 h-3 text-stone-400 group-hover:text-emerald-700" />
                  </div>
                  <div className="text-stone-700 font-semibold mt-0.5">
                    {RESTAURANT_INFO.address.landmark}, {RESTAURANT_INFO.address.area}
                  </div>
                  <div className="text-stone-500 mt-0.5">
                    Palghar, Maharashtra 401209, India
                  </div>
                </div>
              </a>

              {/* Detail 2: Phone */}
              <a
                href={`tel:${RESTAURANT_INFO.phone}`}
                id="location-phone-link"
                className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-stone-200 hover:border-amber-500 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-amber-950 transition-colors">
                  <Phone className="w-5 h-5 fill-current" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-stone-900">Phone Number</div>
                  <div className="text-emerald-700 font-extrabold text-sm mt-0.5">
                    {RESTAURANT_INFO.formattedPhone}
                  </div>
                  <div className="text-stone-500 mt-0.5">
                    Tap to call for orders & table inquiries
                  </div>
                </div>
              </a>

              {/* Detail 3: Hours */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-stone-200">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-stone-900">Business Hours</div>
                  <div className="text-stone-800 font-bold text-sm mt-0.5">
                    {RESTAURANT_INFO.hours.display}
                  </div>
                  <div className="text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {RESTAURANT_INFO.hours.days}
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={RESTAURANT_INFO.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="location-get-directions-btn"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 text-center"
              >
                <Navigation className="w-4 h-4 text-amber-300" />
                <span>Get Directions</span>
              </a>

              <a
                href={`tel:${RESTAURANT_INFO.phone}`}
                id="location-call-direct-btn"
                className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 text-center"
              >
                <Phone className="w-4 h-4 fill-current" />
                <span>Call: {RESTAURANT_INFO.phone}</span>
              </a>
            </div>

          </div>

          {/* Right Column: Interactive Map & Landmark Guide */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl overflow-hidden border border-stone-200 bg-stone-50 shadow-xs">
            
            {/* Embedded Interactive Map View */}
            <div className="relative w-full h-80 sm:h-96 bg-stone-200">
              <iframe
                title="Vegies Restro Location Map"
                src="https://maps.google.com/maps?q=Santosh+Bhuvan,+Nalasopara+East,+Palghar,+Maharashtra+401209&t=&z=15&ie=UTF8&iwloc=&output=embed"
                className="w-full h-full border-0"
                loading="lazy"
                aria-label="Google Maps view for Vegies Restro Santosh Bhuvan Nalasopara East"
              />

              {/* Floating Map Pin Overlay */}
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-stone-200 text-left pointer-events-none max-w-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    VR
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-xs">Vegies Restro</h4>
                    <p className="text-[11px] text-stone-600">Santosh Bhuvan, Nalasopara (E)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Landmark & Travel Tips Bar */}
            <div className="p-5 sm:p-6 bg-white border-t border-stone-200 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-2.5">
                  <Compass className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-stone-900">Key Landmark</div>
                    <div className="text-stone-600 mt-0.5">
                      Situated in the bustling Santosh Bhuvan area of Nalasopara East, Palghar.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Car className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-stone-900">Easy Accessibility</div>
                    <div className="text-stone-600 mt-0.5">
                      Easily reachable via local autorickshaws and personal two-wheelers / cars.
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Help */}
              <div className="mt-4 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-stone-500">
                  Need help finding the restaurant or parking?
                </span>
                <a
                  href={`tel:${RESTAURANT_INFO.phone}`}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call us for quick directions</span>
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
