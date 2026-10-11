import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserBookings, cancelUserBooking } from '../services/bookingService';
import { BookingInquiry } from '../types';
import { RESTAURANT_INFO } from '../data/restaurantData';
import { extractDeliveryAddress, extractCookingNotes } from './AdminPortalModal';
import { WhatsAppIcon } from './Navbar';
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
  Copy,
  ShoppingBag,
  ChefHat,
  Bike,
  PackageCheck,
  Cloud,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  MapPin,
  Receipt,
  FileText,
  DollarSign,
  Navigation,
} from 'lucide-react';

interface UserBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewInquiry: () => void;
  onOpenOrderFood?: () => void;
}

export const UserBookingsModal: React.FC<UserBookingsModalProps> = ({
  isOpen,
  onClose,
  onOpenNewInquiry,
  onOpenOrderFood,
}) => {
  const { user, userProfile, updateUserProfileData, logout } = useAuth();
  const [bookings, setBookings] = useState<BookingInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'reservations' | 'profile'>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);

  // Action states
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

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
    // Real-time subscription across devices via Firestore & User ID + User Email
    const unsubscribe = subscribeToUserBookings(
      user.uid,
      (data) => {
        setBookings(data);
        setIsLoading(false);
        setLastSyncedAt(new Date());
      },
      (err) => {
        console.warn('Subscription error:', err);
        setIsLoading(false);
      },
      user.email || undefined
    );

    return () => unsubscribe();
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleCopyId = (idText: string) => {
    navigator.clipboard.writeText(idText);
    setCopiedId(idText);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMsg(false);
    try {
      await updateUserProfileData(editName, editPhone);
      setIsEditingProfile(false);
      setProfileSuccessMsg(true);
      setTimeout(() => setProfileSuccessMsg(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    setCancelError(null);
    try {
      await cancelUserBooking(bookingId, user?.uid);
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel');
      setTimeout(() => setCancelError(null), 4000);
    } finally {
      setCancellingId(null);
    }
  };

  // Helper to determine if an inquiry is a Food Order or Table Reservation
  const isFoodOrder = (item: BookingInquiry) => {
    const s = (item.serviceType || '').toLowerCase();
    return (
      s.includes('food order') ||
      s.includes('parcel') ||
      s.includes('delivery') ||
      s.includes('takeaway') ||
      s.includes('online order') ||
      (item.paymentAmount && item.paymentAmount > 0)
    );
  };

  // Filter bookings
  const foodOrders = bookings.filter(isFoodOrder);
  const tableReservations = bookings.filter((b) => !isFoodOrder(b));

  const filteredList = bookings.filter((item) => {
    // Tab filter
    if (activeTab === 'orders' && !isFoodOrder(item)) return false;
    if (activeTab === 'reservations' && isFoodOrder(item)) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchRef = (item.referenceId || '').toLowerCase().includes(q);
      const matchService = (item.serviceType || '').toLowerCase().includes(q);
      const matchDish = (item.customDish || '').toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      const matchStatus = (item.status || '').toLowerCase().includes(q);
      return matchRef || matchService || matchDish || matchNotes || matchStatus;
    }
    return true;
  });

  // Calculate Order Stepper step (1-4)
  const getOrderStep = (status: BookingInquiry['status']) => {
    switch (status) {
      case 'Pending':
        return 1;
      case 'Confirmed':
        return 1;
      case 'Preparing':
        return 2;
      case 'Out for Delivery':
        return 3;
      case 'Delivered':
      case 'Completed':
        return 4;
      case 'Cancelled':
        return -1;
      default:
        return 1;
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
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-xs animate-pulse">
            <ChefHat className="w-3.5 h-3.5" /> Cooking in Kitchen
          </span>
        );
      case 'Out for Delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white shadow-xs">
            <Bike className="w-3.5 h-3.5 animate-bounce" /> Out for Delivery
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <PackageCheck className="w-3 h-3" /> Delivered
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock3 className="w-3 h-3" /> Order Received
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
        className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 text-left flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-teal-900 to-stone-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-400 text-stone-950 font-bold flex items-center justify-center text-lg shadow-md shrink-0">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Outfit',sans-serif] text-base sm:text-lg font-bold text-white leading-tight">
                  {userProfile?.displayName || 'Customer Account'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-semibold">
                  <Cloud className="w-3 h-3 text-emerald-400" />
                  <span>Cloud Synced</span>
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">{user.email}</p>
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

        {/* Sync Status Banner */}
        <div className="px-4 py-2 bg-stone-100 border-b border-stone-200 flex flex-wrap items-center justify-between text-[11px] text-stone-600 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-medium text-stone-700">
              Live Cross-Device Sync Active:
            </span>
            <span>All your orders & bookings automatically update on any device.</span>
          </div>
          <div className="flex items-center gap-2 text-stone-500">
            <span className="text-[10px]">
              Last refreshed {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-stone-200 bg-stone-50/70 px-4 pt-2 gap-1 sm:gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'orders'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>Food Orders & Tracing</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
              {foodOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reservations')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'reservations'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>Table Reservations</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
              {tableReservations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <span>All History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-700 text-[10px] font-bold">
              {bookings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ml-auto cursor-pointer shrink-0 ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <UserIcon className="w-4 h-4 text-stone-500" />
            <span>Profile & Settings</span>
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-[#fcfbf9]">
          {cancelError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{cancelError}</span>
            </div>
          )}

          {profileSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profile updated successfully and synced across all your devices!</span>
            </div>
          )}

          {/* Profile Tab View */}
          {activeTab === 'profile' ? (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-3">
                  <div>
                    <h4 className="font-['Outfit',sans-serif] text-base font-bold text-stone-900">
                      Customer Profile & Preferences
                    </h4>
                    <p className="text-xs text-stone-500">
                      Your contact details used for instant food delivery and table confirmations.
                    </p>
                  </div>
                  {!isEditingProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                  )}
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleSaveProfile} className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                          placeholder="Your Name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Phone Number (for WhatsApp updates & delivery)
                        </label>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="e.g. 7028818440"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        {savingProfile ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Save & Sync</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-700 pt-1">
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-400 font-bold uppercase">Name</p>
                        <p className="font-bold text-stone-900">{userProfile?.displayName || 'Not specified'}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-400 font-bold uppercase">Contact Phone</p>
                        <p className="font-bold text-stone-900">{userProfile?.phoneNumber || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-[10px] text-stone-400 font-bold uppercase">Email Account</p>
                        <p className="font-bold text-stone-900 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-400 font-bold uppercase">Registered Member</p>
                        <p className="font-bold text-stone-900">
                          {userProfile?.createdAt
                            ? new Date(userProfile.createdAt).toLocaleDateString()
                            : 'Active User'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Restaurant Info & Support Contact */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3">
                <h5 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Vegies Restro Quick Helpline
                </h5>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-stone-900">{RESTAURANT_INFO.address.landmark}, {RESTAURANT_INFO.address.area}</p>
                    <p className="text-stone-500">{RESTAURANT_INFO.address.city}, {RESTAURANT_INFO.address.pincode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${RESTAURANT_INFO.phone}`}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Call {RESTAURANT_INFO.phone}</span>
                    </a>
                    <a
                      href={RESTAURANT_INFO.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Desk</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Orders & Bookings List with Live Order Tracing */
            <div className="space-y-4">
              {/* Search & Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by Order ID (#VG-..), dish or status..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {onOpenOrderFood && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenOrderFood();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Order Food</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenNewInquiry();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Table Booking</span>
                  </button>
                </div>
              </div>

              {/* List rendering */}
              {isLoading ? (
                <div className="py-16 text-center text-stone-400 space-y-3">
                  <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-medium text-stone-600">
                    Syncing your orders & bookings from cloud...
                  </p>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-stone-200 rounded-3xl p-6 bg-white space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                    {activeTab === 'orders' ? (
                      <ShoppingBag className="w-6 h-6" />
                    ) : (
                      <Utensils className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-stone-800">
                      {searchQuery
                        ? 'No matches found'
                        : activeTab === 'orders'
                        ? 'No Food Orders Found'
                        : 'No Table Bookings Found'}
                    </h5>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                      {searchQuery
                        ? `No records match "${searchQuery}". Try a different keyword or clear search.`
                        : activeTab === 'orders'
                        ? 'Order delicious pure veg delicacies, Paneer platters, thalis & snacks with doorstep delivery!'
                        : 'Book your dine-in table or special party reservation with Vegies Restro.'}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-2">
                    {onOpenOrderFood && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenOrderFood();
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Order Food Now</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenNewInquiry();
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Reserve Table</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredList.map((item) => {
                    const isOrder = isFoodOrder(item);
                    const currentStep = getOrderStep(item.status);
                    const userDeliveryAddress = extractDeliveryAddress(item.notes);
                    const userCookingNotes = extractCookingNotes(item.notes);
                    const isTakeaway = item.serviceType.toLowerCase().includes('takeaway');

                    return (
                      <div
                        key={item.id || item.referenceId}
                        id={`user-item-${item.referenceId}`}
                        className="p-4 sm:p-5 rounded-3xl border border-stone-200 bg-white hover:border-emerald-400/80 transition-all shadow-xs space-y-4"
                      >
                        {/* Top Meta Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleCopyId(item.referenceId)}
                              title="Click to copy Reference ID"
                              className="px-2.5 py-1 rounded-lg bg-stone-900 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1 hover:bg-stone-800 cursor-pointer transition-colors shadow-2xs"
                            >
                              <span>#{item.referenceId}</span>
                              {copiedId === item.referenceId ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-stone-400" />
                              )}
                            </button>
                            <h5 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
                              {isOrder ? (
                                <ShoppingBag className="w-4 h-4 text-emerald-700" />
                              ) : (
                                <Utensils className="w-4 h-4 text-amber-600" />
                              )}
                              <span>{item.serviceType}</span>
                            </h5>

                            {/* Timestamp with Clock */}
                            <span className="text-[11px] text-stone-600 font-semibold bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>
                                {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })}, {new Date(item.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.paymentStatus === 'Paid' ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                item.paymentMethod === 'Cash on Delivery'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {item.paymentMethod === 'Cash on Delivery' ? '💵 Cash Paid' : '💳 Paid'} {item.paymentAmount ? `₹${item.paymentAmount}` : ''}
                              </span>
                            ) : item.paymentStatus === 'Verification Pending' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                                ⏳ Verifying UPI ₹{item.paymentAmount || ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                💵 Cash on Delivery (Pay on Arrival)
                              </span>
                            )}
                            {getStatusBadge(item.status)}
                          </div>
                        </div>

                        {/* LIVE ORDER TRACING / STEPPER (for food orders & delivery) */}
                        {isOrder && item.status !== 'Cancelled' && (
                          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-stone-50 border border-emerald-200/80 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                                <span className="font-extrabold text-emerald-950 font-['Outfit',sans-serif]">
                                  Live Order Tracing
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                                {item.status === 'Preparing'
                                  ? '🍳 Food is on the flame'
                                  : item.status === 'Out for Delivery'
                                  ? '🛵 Rider on route'
                                  : item.status === 'Delivered'
                                  ? '✨ Delivered'
                                  : '📝 Order Received'}
                              </span>
                            </div>

                            {/* 4-Stage Progress Stepper */}
                            <div className="relative pt-1 pb-1">
                              {/* Background Bar */}
                              <div className="absolute top-4 left-4 right-4 h-1 bg-stone-200 rounded-full z-0" />
                              {/* Filled Progress Bar */}
                              <div
                                className="absolute top-4 left-4 h-1 bg-emerald-600 rounded-full z-0 transition-all duration-500"
                                style={{
                                  width:
                                    currentStep === 1
                                      ? '15%'
                                      : currentStep === 2
                                      ? '48%'
                                      : currentStep === 3
                                      ? '80%'
                                      : '100%',
                                }}
                              />

                              <div className="relative z-10 grid grid-cols-4 gap-1 text-center">
                                {/* Step 1: Confirmed */}
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                      currentStep >= 1
                                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                                        : 'bg-stone-200 text-stone-500'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                  <span className="text-[10px] sm:text-[11px] font-bold text-stone-800 mt-1.5 leading-tight">
                                    Confirmed
                                  </span>
                                  <span className="text-[9px] text-stone-500 hidden sm:block">
                                    Order Logged
                                  </span>
                                </div>

                                {/* Step 2: Preparing in Kitchen */}
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                      currentStep >= 2
                                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                                        : currentStep === 1
                                        ? 'bg-white text-stone-400 border border-stone-300'
                                        : 'bg-stone-200 text-stone-500'
                                    }`}
                                  >
                                    <ChefHat
                                      className={`w-4 h-4 ${
                                        currentStep === 2 ? 'animate-pulse text-amber-200' : ''
                                      }`}
                                    />
                                  </div>
                                  <span className="text-[10px] sm:text-[11px] font-bold text-stone-800 mt-1.5 leading-tight">
                                    In Kitchen
                                  </span>
                                  <span className="text-[9px] text-stone-500 hidden sm:block">
                                    Freshly Cooking
                                  </span>
                                </div>

                                {/* Step 3: Out for Delivery */}
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                      currentStep >= 3
                                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                                        : 'bg-white text-stone-400 border border-stone-300'
                                    }`}
                                  >
                                    <Bike
                                      className={`w-4 h-4 ${
                                        currentStep === 3 ? 'animate-bounce text-amber-200' : ''
                                      }`}
                                    />
                                  </div>
                                  <span className="text-[10px] sm:text-[11px] font-bold text-stone-800 mt-1.5 leading-tight">
                                    On The Way
                                  </span>
                                  <span className="text-[9px] text-stone-500 hidden sm:block">
                                    Rider Dispatched
                                  </span>
                                </div>

                                {/* Step 4: Delivered */}
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                      currentStep >= 4
                                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200'
                                        : 'bg-white text-stone-400 border border-stone-300'
                                    }`}
                                  >
                                    <PackageCheck className="w-4 h-4" />
                                  </div>
                                  <span className="text-[10px] sm:text-[11px] font-bold text-stone-800 mt-1.5 leading-tight">
                                    Delivered
                                  </span>
                                  <span className="text-[9px] text-stone-500 hidden sm:block">
                                    Enjoy Food!
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Customer Delivery Confirmation & WhatsApp OTP on Arrival Box */}
                            {isOrder && item.status !== 'Cancelled' && (
                              <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2.5">
                                <div className="flex items-start gap-2.5 text-xs flex-1 min-w-[240px]">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0 mt-0.5">
                                    <WhatsAppIcon className="w-4 h-4 fill-current" />
                                  </div>
                                  <div>
                                    <span className="font-bold text-emerald-950 block text-[11px] sm:text-xs">
                                      {item.status === 'Delivered' || item.status === 'Completed' || item.otpVerified
                                        ? '✅ Delivery Verified with Doorstep OTP'
                                        : item.status === 'Out for Delivery'
                                        ? '🛵 Rider Dispatched • WhatsApp OTP on Arrival'
                                        : '🔐 Secure Doorstep WhatsApp OTP Verification'}
                                    </span>
                                    <span className="text-[11px] text-stone-600 block mt-0.5 leading-relaxed">
                                      {item.status === 'Delivered' || item.status === 'Completed' || item.otpVerified
                                        ? 'Your meal was successfully confirmed with the 4-digit OTP at your doorstep. Thank you for dining with us!'
                                        : item.status === 'Out for Delivery'
                                        ? `Our delivery boy is on the way. Your 4-digit verification OTP will be sent directly via WhatsApp to ${item.userPhone || 'your mobile number'} as soon as he arrives at your doorstep.`
                                        : `To ensure 100% secure contactless delivery, your confirmation OTP will be sent directly via WhatsApp to ${item.userPhone || 'your mobile number'} upon the arrival of our delivery boy.`}
                                    </span>
                                  </div>
                                </div>
                                <div className="px-3 py-1.5 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-950 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs shrink-0">
                                  {item.status === 'Delivered' || item.status === 'Completed' || item.otpVerified ? (
                                    <span>🛡️ Verified</span>
                                  ) : (
                                    <>
                                      <WhatsAppIcon className="w-3 h-3 fill-current text-emerald-700" />
                                      <span>WhatsApp OTP</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Order / Booking Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-stone-700 bg-stone-50 p-3 rounded-2xl border border-stone-100">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <div>
                              <span className="text-[10px] text-stone-400 block font-semibold">Slot / ETA</span>
                              <span className="font-bold text-stone-900">{item.timeSlot}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <div>
                              <span className="text-[10px] text-stone-400 block font-semibold">
                                {isOrder ? 'Portions / Party' : 'Guests Count'}
                              </span>
                              <span className="font-bold text-stone-900">{item.guests}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <div>
                              <span className="text-[10px] text-stone-400 block font-semibold">
                                {isOrder ? 'Order Placed Time' : 'Booking Time'}
                              </span>
                              <span className="font-bold text-stone-900">
                                {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })}, {new Date(item.createdAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Ordered Dishes List */}
                        {item.customDish && (
                          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-xs">
                            <div className="flex items-center gap-1.5 text-emerald-950 font-bold mb-1">
                              <Utensils className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Ordered Dishes & Items:</span>
                            </div>
                            <p className="text-emerald-900 font-medium whitespace-pre-line pl-5">
                              {item.customDish}
                            </p>
                          </div>
                        )}

                        {/* Delivery Address (Strictly Clean Address without order details) */}
                        {userDeliveryAddress && !isTakeaway && (
                          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-amber-900 tracking-wider flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                                Delivery Address:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(userDeliveryAddress)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[10px] flex items-center gap-1 transition-colors"
                                >
                                  <Navigation className="w-2.5 h-2.5 text-emerald-700" />
                                  <span>Map</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(userDeliveryAddress);
                                    alert('Address copied to clipboard!');
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium text-[10px] flex items-center gap-1"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Copy</span>
                                </button>
                              </div>
                            </div>
                            <p className="text-stone-900 font-semibold bg-white p-2 rounded-xl border border-amber-200/60 leading-snug">
                              {userDeliveryAddress}
                            </p>
                          </div>
                        )}

                        {/* Special Cooking Instructions */}
                        {userCookingNotes && (
                          <div className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs">
                            <div className="flex items-center gap-1.5 text-stone-700 font-bold mb-0.5">
                              <span>📝 Special Cooking Note:</span>
                            </div>
                            <p className="text-stone-800 italic pl-5">{userCookingNotes}</p>
                          </div>
                        )}

                        {/* Table Booking Notes (for non-food orders) */}
                        {!isOrder && item.notes && (
                          <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-100 text-xs">
                            <div className="flex items-center gap-1.5 text-amber-950 font-bold mb-0.5">
                              <span>Table / Dietary Note:</span>
                            </div>
                            <p className="text-amber-900 pl-5">{item.notes}</p>
                          </div>
                        )}

                        {/* Payment Confirmation Banner */}
                        {item.paymentStatus === 'Paid' && (
                          <div className={`p-2.5 rounded-xl border text-[11px] flex flex-wrap items-center justify-between gap-2 ${
                            item.paymentMethod === 'Cash on Delivery'
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                              : 'bg-blue-50/80 border-blue-100 text-blue-950'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              {item.paymentMethod === 'Cash on Delivery' ? (
                                <>
                                  <span className="text-base">💵</span>
                                  <span className="font-bold">Cash on Delivery:</span>
                                  <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">
                                    {item.paymentAmount ? `₹${item.paymentAmount} Paid` : 'Paid in Cash'}
                                  </span>
                                  <span className="text-emerald-700 font-semibold">(Collected on Delivery)</span>
                                </>
                              ) : (
                                <>
                                  <DollarSign className="w-3.5 h-3.5 text-blue-700" />
                                  <span className="font-bold">UPI Payment:</span>
                                  <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-900">
                                    ₹{item.paymentAmount || 0} Paid
                                  </span>
                                  {item.paymentUtr && (
                                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-900">
                                      UTR: {item.paymentUtr}
                                    </span>
                                  )}
                                  {item.paymentAppUsed && (
                                    <span className="text-blue-700 font-semibold">({item.paymentAppUsed})</span>
                                  )}
                                </>
                              )}
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                              item.paymentMethod === 'Cash on Delivery'
                                ? 'text-emerald-800 bg-white border-emerald-300'
                                : 'text-emerald-700 bg-white border-emerald-200'
                            }`}>
                              {item.paymentMethod === 'Cash on Delivery' ? '✓ Cash Received' : 'Verified Online'}
                            </span>
                          </div>
                        )}

                        {/* Bottom Actions */}
                        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-stone-100 gap-2">
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://wa.me/91${RESTAURANT_INFO.phone}?text=${encodeURIComponent(
                                `Hello Vegies Restro 😊 I am tracking my ${item.serviceType} (#${item.referenceId}) for ${item.userName}. Please share latest kitchen update. Thank you!`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Live WhatsApp Support</span>
                            </a>

                            <a
                              href={`tel:${RESTAURANT_INFO.phone}`}
                              className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-stone-600" />
                              <span>Call Kitchen</span>
                            </a>
                          </div>

                          {item.status === 'Cancelled' ? (
                            <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                              Order Cancelled
                            </span>
                          ) : item.status === 'Delivered' || item.status === 'Completed' ? (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Delivered &amp; Finalized (Locked 🔒)</span>
                            </span>
                          ) : item.status === 'Pending' ? (
                            <button
                              type="button"
                              disabled={cancellingId === (item.id || item.referenceId)}
                              onClick={() => handleCancelBooking(item.id || item.referenceId)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {cancellingId === (item.id || item.referenceId)
                                ? 'Cancelling...'
                                : 'Cancel Request'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between shrink-0">
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
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
