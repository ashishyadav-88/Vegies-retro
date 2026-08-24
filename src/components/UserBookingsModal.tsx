import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserBookings, cancelUserBooking } from '../services/bookingService';
import { BookingInquiry } from '../types';
import { RESTAURANT_INFO } from '../data/restaurantData';
import {
  X,
  Calendar,
  Clock,
  Users,
  Utensils,
  CheckCircle2,
  AlertCircle,
  Clock3,
  User as UserIcon,
  Phone,
  Mail,
  Edit2,
  Check,
  PlusCircle,
  MessageCircle,
} from 'lucide-react';

interface UserBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewInquiry: () => void;
}

export const UserBookingsModal: React.FC<UserBookingsModalProps> = ({
  isOpen,
  onClose,
  onOpenNewInquiry,
}) => {
  const { user, userProfile, updateUserProfileData, logout } = useAuth();
  const [bookings, setBookings] = useState<BookingInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setEditName(userProfile.displayName || '');
      setEditPhone(userProfile.phoneNumber || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (!isOpen || !user) {
      setBookings([]);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToUserBookings(
      user.uid,
      (data) => {
        setBookings(data);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfileData(editName, editPhone);
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await cancelUserBooking(bookingId, user?.uid);
    } catch (err) {
      console.error('Error cancelling booking:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: BookingInquiry['status']) => {
    switch (status) {
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </span>
        );
      case 'Preparing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200 animate-pulse">
            👨‍🍳 Preparing in Kitchen
          </span>
        );
      case 'Out for Delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            🛵 Out for Delivery
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock3 className="w-3 h-3" /> Under Review
          </span>
        );
    }
  };

  return (
    <div
      id="user-bookings-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 text-left flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-amber-950 font-bold flex items-center justify-center text-base shadow-md">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="font-['Outfit',sans-serif] text-lg sm:text-xl font-bold text-white leading-tight">
                {userProfile?.displayName || 'My Profile & Bookings'}
              </h3>
              <p className="text-xs text-stone-200">{user.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20"
            aria-label="Close user profile modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* User Account Info Bar */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Account Information
              </span>
              {!isEditingProfile ? (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              ) : null}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. 7028818440"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-700 pt-1">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Name:</strong> {userProfile?.displayName || 'Not specified'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Phone:</strong> {userProfile?.phoneNumber || 'Not provided'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    <strong>Email:</strong> {user.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-500">
                  <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
                  <span>
                    Member since {new Date(userProfile?.createdAt || '').toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bookings History Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-['Outfit',sans-serif] text-base font-bold text-stone-900">
                  My Bookings & Inquiries
                </h4>
                <p className="text-xs text-stone-500">
                  Real-time status of your dine-in tables & food orders
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewInquiry();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Booking</span>
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-stone-400">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading your bookings...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-stone-200 rounded-2xl p-6 bg-stone-50/50">
                <Utensils className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <h5 className="text-sm font-bold text-stone-700 mb-1">No Bookings Yet</h5>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
                  You haven't submitted any table reservations or food inquiries yet.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewInquiry();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Reserve Table or Order Food</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((item) => (
                  <div
                    key={item.id || item.referenceId}
                    className="p-4 rounded-2xl border border-stone-200 bg-white hover:border-emerald-300 transition-all shadow-xs space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 text-[11px] font-mono font-bold">
                          #{item.referenceId}
                        </span>
                        <h5 className="text-xs sm:text-sm font-bold text-stone-900">
                          {item.serviceType}
                        </h5>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{item.timeSlot}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{item.guests}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {item.customDish && (
                      <div className="text-xs bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                        <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Selected Dish: {item.customDish}</span>
                      </div>
                    )}

                    {item.notes && (
                      <p className="text-xs text-stone-500 italic bg-stone-50 p-2 rounded-lg">
                        "{item.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                      <a
                        href={`https://wa.me/91${RESTAURANT_INFO.phone}?text=${encodeURIComponent(
                          `Hello Vegies Restro 😊 Checking status of booking #${item.referenceId} (${item.serviceType}) for ${item.userName}. Thank you!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Check Status on WhatsApp</span>
                      </a>

                      {item.status === 'Cancelled' ? (
                        <button
                          type="button"
                          disabled
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-400 border border-rose-200 text-[11px] font-semibold opacity-60 cursor-not-allowed pointer-events-none flex items-center gap-1 select-none"
                          title="This booking is already cancelled"
                        >
                          <span>✕ Cancelled</span>
                        </button>
                      ) : item.status === 'Pending' && item.id ? (
                        <button
                          type="button"
                          disabled={cancellingId === item.id}
                          onClick={() => handleCancelBooking(item.id!)}
                          className="px-2.5 py-1 rounded-lg hover:bg-rose-50 text-[11px] text-stone-500 hover:text-rose-600 font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          title="Cancel your booking inquiry"
                        >
                          {cancellingId === item.id ? 'Cancelling...' : 'Cancel Inquiry'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Sign Out */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={async () => {
              await logout();
              onClose();
            }}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
          >
            Sign Out of Account
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
