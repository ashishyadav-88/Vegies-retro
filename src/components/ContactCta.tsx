import React, { useState } from 'react';
import { RESTAURANT_INFO } from '../data/restaurantData';
import {
  Phone,
  Navigation,
  Utensils,
  MessageCircle,
  Clock,
  Sparkles,
  Send,
  CheckCircle2,
  Calendar,
  Users,
} from 'lucide-react';

interface ContactCtaProps {
  onOpenInquiry: (serviceType?: string) => void;
  onOpenFullMenu: () => void;
}

export const ContactCta: React.FC<ContactCtaProps> = ({
  onOpenInquiry,
  onOpenFullMenu,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('Dine-In Table Inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    // Construct WhatsApp message URL for instant customer response
    const text = encodeURIComponent(
      `Hello Vegies Restro!\n\n` +
      `Name: ${name}\n` +
      `Contact Phone: ${phone}\n` +
      `Service: ${service}\n` +
      (message ? `Note / Request: ${message}\n` : '') +
      `\nI would like to inquire regarding Vegies Restro.`
    );
    
    setSubmitted(true);
    setTimeout(() => {
      window.open(`https://wa.me/91${RESTAURANT_INFO.phone}?text=${text}`, '_blank');
    }, 400);
  };

  return (
    <section id="contact" className="py-20 relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900 text-white">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: CTA Content & Direct Call Buttons */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Taste The Difference</span>
            </div>

            <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Craving Something Delicious?
            </h2>

            <p className="text-stone-300 text-base sm:text-lg leading-relaxed">
              Visit Vegies Restro today or get in touch with us. Fresh ingredients, great taste, and welcoming service are waiting for you at Santosh Bhuvan, Nalasopara East.
            </p>

            {/* Timings Highlight Pill */}
            <div className="inline-flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/10 text-xs sm:text-sm text-stone-200">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Open Daily: <strong>9:00 AM – 11:00 PM</strong> (Dine-in & Takeaway)</span>
            </div>

            {/* Requested 3 Major CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              {/* Call 7028828220 */}
              <a
                href={`tel:${RESTAURANT_INFO.phone}`}
                id="cta-call-btn"
                className="px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-base shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all flex items-center justify-center gap-2.5"
              >
                <Phone className="w-5 h-5 fill-current" />
                <span>Call {RESTAURANT_INFO.phone}</span>
              </a>

              {/* Get Directions */}
              <a
                href={RESTAURANT_INFO.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="cta-directions-btn"
                className="px-5 py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-base border border-emerald-600/60 shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Navigation className="w-5 h-5 text-amber-300" />
                <span>Get Directions</span>
              </a>

              {/* View Menu */}
              <button
                type="button"
                id="cta-view-menu-btn"
                onClick={onOpenFullMenu}
                className="px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-base border border-white/20 backdrop-blur-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Utensils className="w-5 h-5" />
                <span>View Menu</span>
              </button>
            </div>

            {/* Direct WhatsApp Option */}
            <div className="pt-2">
              <a
                href={RESTAURANT_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="cta-whatsapp-link"
                className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Click here to chat directly with Vegies Restro on WhatsApp</span>
              </a>
            </div>

          </div>

          {/* Right Column: Fast Inquiry & Booking Card */}
          <div className="lg:col-span-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white text-stone-900 shadow-2xl border border-stone-100 text-left">
              
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Outfit',sans-serif] text-xl font-bold text-stone-900">
                    Quick Restaurant Inquiry
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Fast Response
                  </span>
                </div>
                <p className="text-stone-500 text-xs mt-1">
                  Send a fast message for food takeaway, table seating, or party inquiries.
                </p>
              </div>

              {submitted ? (
                <div className="py-8 text-center space-y-3 animate-in fade-in duration-300">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-stone-900 text-base">Inquiry Prepared!</h4>
                  <p className="text-stone-600 text-xs max-w-xs mx-auto">
                    Opening your chat with Vegies Restro at +91 70288 28220. You can also call us directly!
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-2 text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Send another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="cta-form-name" className="block text-xs font-bold text-stone-700 mb-1">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        id="cta-form-name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label htmlFor="cta-form-phone" className="block text-xs font-bold text-stone-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="cta-form-phone"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cta-form-service" className="block text-xs font-bold text-stone-700 mb-1">
                      Service Requirement
                    </label>
                    <select
                      id="cta-form-service"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                    >
                      <option value="Dine-In Table Inquiry">Dine-In Table Seating</option>
                      <option value="Food Takeaway Order">Food Takeaway / Parcel</option>
                      <option value="Family / Party Order">Family Gathering / Party Inquiry</option>
                      <option value="General Menu Inquiry">Menu Inquiry / Custom Dish</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="cta-form-message" className="block text-xs font-bold text-stone-700 mb-1">
                      Note or Dish Details (Optional)
                    </label>
                    <textarea
                      id="cta-form-message"
                      rows={2}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Number of guests, preferred time, or dishes you want to order..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    id="cta-submit-inquiry-btn"
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Inquiry to Vegies Restro</span>
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
