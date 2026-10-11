import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createBookingInquiry } from '../services/bookingService';
import { RESTAURANT_INFO } from '../data/restaurantData';
import { BookingInquiry } from '../types';
import {
  X,
  Send,
  Phone,
  MessageCircle,
  Sparkles,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Utensils,
  Lock,
  UserCheck,
  AlertCircle,
  Bookmark,
} from 'lucide-react';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup', prompt?: string) => void;
  onOpenUserBookings?: () => void;
  initialService?: string;
  initialDish?: string;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  onOpenUserBookings,
  initialService = 'Dine-In Table Reservation',
  initialDish = '',
}) => {
  const { user, userProfile, updateUserProfileData } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState(initialService);
  const [guests, setGuests] = useState('2-4 People');
  const [timeSlot, setTimeSlot] = useState('Lunch (12:00 PM - 3:30 PM)');
  const [customDish, setCustomDish] = useState(initialDish);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState<BookingInquiry | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync state when opened or when auth changes
  useEffect(() => {
    if (isOpen) {
      setServiceType(initialService);
      setCustomDish(initialDish);
      setSubmittedBooking(null);
      setSubmitError(null);

      if (userProfile) {
        if (userProfile.displayName && !name) setName(userProfile.displayName);
        if (userProfile.phoneNumber && !phone) setPhone(userProfile.phoneNumber);
      } else if (user) {
        if (user.displayName && !name) setName(user.displayName);
        if (user.phoneNumber && !phone) setPhone(user.phoneNumber);
      }
    }
  }, [isOpen, user, userProfile, initialService, initialDish]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    if (!user) {
      onOpenAuth('signup', 'Please sign in or register to complete and save your booking.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Store in Firestore & Local storage via bookingService
      const savedBooking = await createBookingInquiry({
        userId: user.uid,
        userName: name.trim(),
        userEmail: user.email || '',
        userPhone: phone.trim(),
        serviceType,
        guests,
        timeSlot,
        customDish: customDish.trim() || '',
        notes: notes.trim() || '',
      });

      // 2. Update user profile phone if not previously set
      if (phone.trim() && (!userProfile?.phoneNumber || userProfile.phoneNumber !== phone.trim())) {
        try {
          await updateUserProfileData(name.trim() || userProfile?.displayName || '', phone.trim());
        } catch (e) {
          console.warn('Profile update warning:', e);
        }
      }

      setSubmittedBooking(savedBooking);

      // 3. Prepare WhatsApp Message
      const messageText =
        `Hello Vegies Restro 😊\n\n` +
        `🍽️ New Booking Inquiry (#${savedBooking.referenceId})\n\n` +
        `👤 Name: ${name}\n` +
        `📞 Phone: ${phone}\n` +
        `🏷️ Service: ${serviceType}\n` +
        `👥 Guests: ${guests}\n` +
        `⏰ Time: ${timeSlot}\n` +
        (customDish ? `🍲 Selected Dish: ${customDish}\n` : '') +
        (notes ? `📝 Note: ${notes}\n` : '') +
        `\nPlease confirm table/order availability. Thank you! 🙏🥗`;
    } catch (err: any) {
      console.error('Error saving booking to Firestore:', err);
      setSubmitError(err.message || 'Failed to submit booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="inquiry-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 text-left my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h3 className="font-['Outfit',sans-serif] text-lg sm:text-xl font-bold text-white">
                Restaurant Inquiry & Booking
              </h3>
            </div>
            <p className="text-xs text-stone-200 mt-0.5">
              Vegies Restro • Santosh Bhuvan, Nalasopara East
            </p>
          </div>

          <button
            type="button"
            id="inquiry-modal-close-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20"
            aria-label="Close inquiry modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Auth Banner if Not Signed In */}
        {!user && !submittedBooking && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <p className="text-xs font-semibold">
                Sign in to save this booking directly to your Vegies Restro account.
              </p>
            </div>
            <button
              type="button"
              id="inquiry-auth-prompt-btn"
              onClick={() => onOpenAuth('signin', 'Sign in to complete and save your table/food booking')}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs"
            >
              Sign In / Register
            </button>
          </div>
        )}

        {/* User Authenticated Indicator */}
        {user && !submittedBooking && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Booking as <strong>{userProfile?.displayName || user.email}</strong>
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">Data Synced</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6">
          {submittedBooking ? (
            <div className="py-6 text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-xs mb-1">
                  Ref #{submittedBooking.referenceId}
                </span>
                <h4 className="font-['Outfit',sans-serif] font-bold text-stone-900 text-lg sm:text-xl">
                  Booking Saved & Submitted!
                </h4>
                <p className="text-stone-600 text-xs sm:text-sm max-w-xs mx-auto mt-1">
                  Your inquiry is saved in your account database. We have also opened WhatsApp to notify Vegies Restro (+91 {RESTAURANT_INFO.phone}).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500">Requirement:</span>
                  <span className="font-bold text-stone-800">{submittedBooking.serviceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Party / Quantity:</span>
                  <span className="font-bold text-stone-800">{submittedBooking.guests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Booking Time:</span>
                  <span className="font-bold text-stone-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {new Date(submittedBooking.createdAt || Date.now()).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}, {new Date(submittedBooking.createdAt || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Reserved Slot:</span>
                  <span className="font-bold text-stone-800">{submittedBooking.timeSlot}</span>
                </div>
                {submittedBooking.customDish && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Item:</span>
                    <span className="font-bold text-emerald-700">{submittedBooking.customDish}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                {onOpenUserBookings && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUserBookings();
                    }}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>View in My Bookings</span>
                  </button>
                )}

                <a
                  href={`tel:${RESTAURANT_INFO.phone}`}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span>Call {RESTAURANT_INFO.formattedPhone} Directly</span>
                </a>

                <button
                  type="button"
                  id="inquiry-modal-done-refresh-btn"
                  onClick={() => {
                    setSubmittedBooking(null);
                    onClose();
                    window.location.reload();
                  }}
                  className="w-full py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Done & Refresh Page
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
                  <label htmlFor="inquiry-name" className="block text-xs font-bold text-stone-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="inquiry-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="inquiry-phone" className="block text-xs font-bold text-stone-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    id="inquiry-phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="inquiry-service" className="block text-xs font-bold text-stone-700 mb-1">
                    Service Type
                  </label>
                  <select
                    id="inquiry-service"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                  >
                    <option value="Dine-In Table Reservation">Dine-In Table Reservation</option>
                    <option value="Takeaway / Parcel Order">Food Takeaway / Parcel</option>
                    <option value="Family / Birthday Gathering">Family / Birthday Gathering</option>
                    <option value="Special Dietary Inquiry">Special Dietary / Jain Food</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="inquiry-guests" className="block text-xs font-bold text-stone-700 mb-1">
                    Number of Guests / Quantity
                  </label>
                  <select
                    id="inquiry-guests"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                  >
                    <option value="1-2 People">1 - 2 People</option>
                    <option value="2-4 People">2 - 4 People</option>
                    <option value="5-8 People">5 - 8 People</option>
                    <option value="9+ Gathering">9+ Large Group</option>
                    <option value="Takeaway Order Only">Takeaway Order Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="inquiry-time" className="block text-xs font-bold text-stone-700 mb-1">
                  Preferred Time (9:00 AM – 11:00 PM)
                </label>
                <select
                  id="inquiry-time"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value="Morning Snacks (9:00 AM - 11:30 AM)">Morning (9:00 AM - 11:30 AM)</option>
                  <option value="Lunch (12:00 PM - 3:30 PM)">Lunch (12:00 PM - 3:30 PM)</option>
                  <option value="Evening Snacks (4:00 PM - 7:00 PM)">Evening (4:00 PM - 7:00 PM)</option>
                  <option value="Dinner (7:30 PM - 10:30 PM)">Dinner (7:30 PM - 10:30 PM)</option>
                  <option value="Immediate Takeaway">Immediate / Ready soon</option>
                </select>
              </div>

              {customDish && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Dish Selected:</span> {customDish}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomDish('')}
                    className="text-stone-400 hover:text-stone-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="inquiry-notes" className="block text-xs font-bold text-stone-700 mb-1">
                  Special Notes / Dietary Preferences (Optional)
                </label>
                <textarea
                  id="inquiry-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Less spicy, Jain preparation, or birthday seating..."
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="inquiry-modal-submit-btn"
                  className="flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      <span>{user ? 'Save & Send to WhatsApp' : 'Continue to Booking'}</span>
                    </>
                  )}
                </button>

                <a
                  href={`tel:${RESTAURANT_INFO.phone}`}
                  className="px-4 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span>Call</span>
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
