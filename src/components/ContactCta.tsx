import React, { useState, useEffect } from 'react';
import { RESTAURANT_INFO } from '../data/restaurantData';
import { useAuth } from '../context/AuthContext';
import { createBookingInquiry } from '../services/bookingService';
import { BookingInquiry } from '../types';
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
  AlertCircle,
  ShieldCheck,
  Lock,
  UserCheck,
  Bookmark,
  ShoppingBag,
  CalendarCheck,
} from 'lucide-react';

interface ContactCtaProps {
  onOpenInquiry: (serviceType?: string) => void;
  onOpenOrderFood?: (category?: string, dishName?: string) => void;
  onOpenFullMenu: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup', prompt?: string) => void;
  onOpenUserBookings?: () => void;
}

export const ContactCta: React.FC<ContactCtaProps> = ({
  onOpenInquiry,
  onOpenOrderFood,
  onOpenFullMenu,
  onOpenAuth,
  onOpenUserBookings,
}) => {
  const { user, userProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('Dine-In Table Inquiry');
  const [timeSlot, setTimeSlot] = useState('Dinner (7:30 PM - 10:30 PM)');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedInquiry, setSavedInquiry] = useState<BookingInquiry | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-fill customer info if logged in
  useEffect(() => {
    if (userProfile) {
      if (userProfile.displayName && !name) setName(userProfile.displayName);
      if (userProfile.phoneNumber && !phone) setPhone(userProfile.phoneNumber);
    } else if (user) {
      if (user.displayName && !name) setName(user.displayName);
      if (user.phoneNumber && !phone) setPhone(user.phoneNumber);
    }
  }, [user, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      onOpenAuth('signin', 'Please sign in or create an account to submit your restaurant inquiry.');
      return;
    }

    if (!name.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Save directly into Firestore and Admin Master Storage
      const saved = await createBookingInquiry({
        userId: user.uid,
        userName: name.trim(),
        userPhone: phone.trim(),
        userEmail: user.email || '',
        serviceType: service,
        guests: 'Quick Website Inquiry',
        timeSlot: timeSlot,
        notes: message.trim() || 'Inquiry submitted from footer contact form',
      });

      setSavedInquiry(saved);
      setSubmitted(true);

      // 2. Construct WhatsApp message URL with official reference ID
      const text = encodeURIComponent(
        `Hello Vegies Restro!\n\n` +
        `🍽️ New Website Inquiry (#${saved.referenceId})\n\n` +
        `👤 Name: ${name.trim()}\n` +
        `📞 Contact Phone: ${phone.trim()}\n` +
        `🏷️ Service: ${service}\n` +
        `⏰ Preferred Time: ${timeSlot}\n` +
        (message.trim() ? `📝 Note / Request: ${message.trim()}\n` : '') +
        `\nI would like to inquire regarding Vegies Restro.`
      );
      
      setTimeout(() => {
        window.open(`https://wa.me/91${RESTAURANT_INFO.phone}?text=${text}`, '_blank');
      }, 500);
    } catch (err: any) {
      console.error('Error submitting inquiry to database:', err);
      setSubmitError(err.message || 'Failed to save inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmitted(false);
    setSavedInquiry(null);
    setMessage('');
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

            {/* Requested Major CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              {/* Table Booking */}
              <button
                type="button"
                id="cta-table-booking-btn"
                onClick={() => onOpenInquiry('Dine-In Table Reservation')}
                className="px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold text-base shadow-lg shadow-amber-500/20 hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <CalendarCheck className="w-5 h-5 text-amber-950" />
                <span>Table Booking</span>
              </button>

              {/* Order Food Online */}
              {onOpenOrderFood && (
                <button
                  type="button"
                  id="cta-order-food-btn"
                  onClick={() => onOpenOrderFood()}
                  className="px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-lg shadow-emerald-900/30 hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5 text-white" />
                  <span>Order Food</span>
                </button>
              )}

              {/* Call */}
              <a
                href={`tel:${RESTAURANT_INFO.phone}`}
                id="cta-call-btn"
                className="px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-base border border-white/20 shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5 fill-current text-amber-400" />
                <span>Call Us</span>
              </a>
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
              
              <div className="mb-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Outfit',sans-serif] text-xl font-bold text-stone-900">
                    Quick Table Booking
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Fast Response
                  </span>
                </div>
                <p className="text-stone-500 text-xs mt-1">
                  Send a fast message for food takeaway, table seating, or party inquiries.
                </p>
              </div>

              {/* User Authentication Status Banner */}
              {!user && !submitted && (
                <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <p className="text-xs font-semibold text-amber-900">
                      Please sign in before booking to save and track your inquiries.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="cta-signin-banner-btn"
                    onClick={() => onOpenAuth('signin', 'Please sign in or register to submit and save your restaurant inquiry.')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-amber-950 text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs"
                  >
                    Sign In / Register
                  </button>
                </div>
              )}

              {user && !submitted && (
                <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Booking as <strong>{userProfile?.displayName || user.displayName || user.email}</strong>
                    </span>
                  </div>
                  {onOpenUserBookings && (
                    <button
                      type="button"
                      onClick={onOpenUserBookings}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                    >
                      <Bookmark className="w-3 h-3" />
                      <span>My Bookings</span>
                    </button>
                  )}
                </div>
              )}

              {submitted && savedInquiry ? (
                <div className="py-6 text-center space-y-3.5 animate-in fade-in duration-300">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-xs mb-1">
                      Ref #{savedInquiry.referenceId}
                    </span>
                    <h4 className="font-['Outfit',sans-serif] font-bold text-stone-900 text-lg">
                      Inquiry Saved & Transmitted!
                    </h4>
                    <p className="text-stone-600 text-xs max-w-xs mx-auto mt-1">
                      Your inquiry is registered in the Admin Portal and synced to Firestore. We have also opened WhatsApp to notify Vegies Restro.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Service:</span>
                      <span className="font-bold text-stone-800">{savedInquiry.serviceType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Preferred Time:</span>
                      <span className="font-bold text-stone-800">{savedInquiry.timeSlot || 'General'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Contact:</span>
                      <span className="font-bold text-stone-800">{savedInquiry.userName} ({savedInquiry.userPhone})</span>
                    </div>
                    {savedInquiry.notes && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">Note:</span>
                        <span className="font-medium text-stone-700 truncate max-w-[200px]">{savedInquiry.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <a
                      href={`https://wa.me/91${RESTAURANT_INFO.phone}?text=${encodeURIComponent(
                        `Hello Vegies Restro!\n\n🍽️ Inquiry (#${savedInquiry.referenceId})\n👤 Name: ${savedInquiry.userName}\n📞 Phone: ${savedInquiry.userPhone}\n🏷️ Service: ${savedInquiry.serviceType}\n` +
                        (savedInquiry.notes ? `📝 Note: ${savedInquiry.notes}\n` : '')
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Chat on WhatsApp (+91 {RESTAURANT_INFO.phone})</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="mt-1 text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Send another inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <label htmlFor="cta-form-time" className="block text-xs font-bold text-stone-700 mb-1">
                        Preferred Time (9 AM – 11 PM)
                      </label>
                      <select
                        id="cta-form-time"
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                      >
                        <option value="Morning (9:00 AM - 11:30 AM)">Morning (9:00 AM - 11:30 AM)</option>
                        <option value="Lunch (12:00 PM - 3:30 PM)">Lunch (12:00 PM - 3:30 PM)</option>
                        <option value="Evening (4:00 PM - 7:00 PM)">Evening (4:00 PM - 7:00 PM)</option>
                        <option value="Dinner (7:30 PM - 10:30 PM)">Dinner (7:30 PM - 10:30 PM)</option>
                        <option value="Immediate / Ready Soon">Immediate / Ready Soon</option>
                      </select>
                    </div>
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
                    disabled={isSubmitting}
                    id="cta-submit-inquiry-btn"
                    className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      !user
                        ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-amber-950/20'
                        : 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : !user ? (
                      <>
                        <Lock className="w-4 h-4 text-amber-950" />
                        <span>Sign In & Submit Booking</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Inquiry to Vegies Restro</span>
                      </>
                    )}
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
