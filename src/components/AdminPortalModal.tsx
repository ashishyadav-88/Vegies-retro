import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToAllBookingsAdmin,
  updateBookingStatusAdmin,
  deleteBookingAdmin,
  createBookingFromAdmin,
  testFirestoreLiveConnection,
  syncAllLocalBookingsToFirestore,
  FirestoreStatus,
  ADMIN_EMAIL,
} from '../services/bookingService';
import {
  subscribeToAllUsers,
  syncAllLocalUsersToFirestore,
} from '../services/userService';
import { RESTAURANT_INFO } from '../data/restaurantData';
import { BookingInquiry, UserProfile } from '../types';
import { WhatsAppIcon } from './Navbar';
import {
  X,
  ShieldCheck,
  Lock,
  Search,
  Filter,
  PlusCircle,
  Phone,
  MessageCircle,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Edit3,
  Calendar,
  Utensils,
  ChevronDown,
  Check,
  LogOut,
  UserCheck,
  TrendingUp,
  FileSpreadsheet,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Database,
  Cloud,
  CloudLightning,
  Copy,
  ExternalLink,
  UploadCloud,
} from 'lucide-react';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile, isAdmin, signInAdminDirect, logout } = useAuth();

  // Login form states for unauthenticated admin
  const [emailInput, setEmailInput] = useState(ADMIN_EMAIL);
  const [passwordInput, setPasswordInput] = useState('parvatiy88');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin Dashboard views & data
  const [activeTab, setActiveTab] = useState<'bookings' | 'users' | 'add-booking' | 'cloud-status' | 'metrics'>('bookings');
  const [bookings, setBookings] = useState<BookingInquiry[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  // Users & Customer state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  // Firestore Diagnostic & Sync states
  const [firestoreStatus, setFirestoreStatus] = useState<FirestoreStatus | null>(null);
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);

  // Status update / action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  // Add Booking Form States (Admin end)
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newServiceType, setNewServiceType] = useState('Dine-In Table Reservation');
  const [newGuests, setNewGuests] = useState('2-4 People');
  const [newTimeSlot, setNewTimeSlot] = useState('Lunch (12:00 PM - 3:30 PM)');
  const [newCustomDish, setNewCustomDish] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState<BookingInquiry['status']>('Confirmed');
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  // Subscribe to bookings and users when admin is authenticated
  useEffect(() => {
    if (!isOpen || !isAdmin) return;

    setIsLoadingBookings(true);
    const unsubscribeBookings = subscribeToAllBookingsAdmin((updatedList) => {
      setBookings(updatedList);
      setIsLoadingBookings(false);
    });

    setIsLoadingUsers(true);
    const unsubscribeUsers = subscribeToAllUsers((updatedUsers) => {
      setUsersList(updatedUsers);
      setIsLoadingUsers(false);
    });

    // Run background cloud check
    runCloudHealthCheck();

    return () => {
      unsubscribeBookings();
      unsubscribeUsers();
    };
  }, [isOpen, isAdmin]);

  const runCloudHealthCheck = async () => {
    setIsCheckingCloud(true);
    try {
      const res = await testFirestoreLiveConnection();
      setFirestoreStatus(res);
    } catch {
      // ignore
    } finally {
      setIsCheckingCloud(false);
    }
  };

  const handleSyncToFirestore = async () => {
    setIsSyncingCloud(true);
    setSyncFeedback(null);
    try {
      const bookingRes = await syncAllLocalBookingsToFirestore();
      const userRes = await syncAllLocalUsersToFirestore();

      const totalSuccess = bookingRes.successCount + userRes.successCount;
      const totalFailed = bookingRes.failedCount + userRes.failedCount;

      if (totalFailed === 0 && totalSuccess > 0) {
        setSyncFeedback(`Successfully synchronized ${bookingRes.successCount} bookings and ${userRes.successCount} user profiles directly to Firestore!`);
      } else if (totalSuccess > 0 && totalFailed > 0) {
        setSyncFeedback(`Synced ${totalSuccess} records to Firestore (${totalFailed} failed). Please check Firestore rules.`);
      } else if (totalFailed > 0) {
        const firstErr = bookingRes.errors[0] || userRes.errors[0] || 'Permission denied. Please verify rules in Firebase console.';
        setSyncFeedback(`Cloud sync blocked by Firestore: ${firstErr}`);
      } else {
        setSyncFeedback('All booking and user records are up-to-date in Firestore.');
      }
      runCloudHealthCheck();
    } catch (err: any) {
      setSyncFeedback(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const sampleRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User customer profiles collection
    match /users/{userId} {
      allow read, write: if true;
    }
    // Bookings & table reservations collection
    match /bookings/{bookingId} {
      allow read, write: if true;
    }
    // System diagnostics
    match /system_diagnostics/{docId} {
      allow read, write: if true;
    }
  }
}`;

  const copyRulesToClipboard = () => {
    navigator.clipboard.writeText(sampleRulesText);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2500);
  };

  if (!isOpen) return null;

  // Handle Admin Direct Sign In
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      if (emailInput.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        throw new Error(`Unauthorized. Only administrator (${ADMIN_EMAIL}) can access this portal.`);
      }
      await signInAdminDirect(passwordInput);
    } catch (err: any) {
      console.error('Admin login error:', err);
      setLoginError(err.message || 'Invalid credentials. Please verify your admin password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Quick 1-click Fill & Login
  const handleQuickAdminLogin = async () => {
    setEmailInput(ADMIN_EMAIL);
    setPasswordInput('parvatiy88');
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      await signInAdminDirect('parvatiy88');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Status Change Handler
  const handleStatusChange = async (
    bookingId: string,
    newSt: BookingInquiry['status'],
    customMsg?: string
  ) => {
    setActionLoadingId(bookingId);
    try {
      await updateBookingStatusAdmin(bookingId, newSt);
      if (customMsg) {
        // Optional quick notify
      }
    } catch (e) {
      console.error('Status update failed:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Save updated notes
  const handleSaveNotes = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    try {
      await updateBookingStatusAdmin(bookingId, undefined as any, tempNotes);
      setEditingNotesId(null);
    } catch (e) {
      console.error('Notes update error:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Booking Handler
  const handleDeleteBooking = async (booking: BookingInquiry) => {
    const confirmDelete = window.confirm(
      `Delete booking #${booking.referenceId} for ${booking.userName}? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setActionLoadingId(booking.id || booking.referenceId);
    try {
      await deleteBookingAdmin(booking.id || booking.referenceId);
    } catch (e) {
      console.error('Delete error:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // WhatsApp Confirmation Dispatcher from Admin
  const sendWhatsAppUpdate = (booking: BookingInquiry, customStatus?: string) => {
    const statusText = customStatus || booking.status;
    let text = `Hello ${booking.userName}!\n\n`;
    text += `Update from *Vegies Restro* regarding your booking (Ref: *#${booking.referenceId}*):\n`;
    text += `• Status: *${statusText}*\n`;
    text += `• Service: ${booking.serviceType}\n`;
    text += `• Time: ${booking.timeSlot}\n`;
    text += `• Party / Guests: ${booking.guests}\n`;
    if (booking.customDish) {
      text += `• Dish: ${booking.customDish}\n`;
    }
    if (statusText === 'Confirmed') {
      text += `\nYour table/order is *CONFIRMED*! We look forward to serving you delicious pure veg delicacies.\n`;
    } else if (statusText === 'Completed') {
      text += `\nThank you for dining with Vegies Restro! We hope you enjoyed the food.\n`;
    }
    text += `\nAddress: Santosh Bhuvan, Nalasopara East\nPhone: +91 ${RESTAURANT_INFO.phone}`;

    const cleanPhone = booking.userPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Submit New Booking from Admin Portal
  const handleAdminCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    setIsCreatingBooking(true);
    setCreateSuccessMsg(null);

    try {
      const created = await createBookingFromAdmin({
        userName: newCustName.trim(),
        userPhone: newCustPhone.trim(),
        userEmail: newCustEmail.trim() || undefined,
        serviceType: newServiceType,
        guests: newGuests,
        timeSlot: newTimeSlot,
        customDish: newCustomDish.trim() || undefined,
        notes: newNotes.trim() || undefined,
        status: newStatus,
      });

      setCreateSuccessMsg(
        `Booking #${created.referenceId} for ${created.userName} created and stored successfully!`
      );

      // Reset form
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustomDish('');
      setNewNotes('');

      // Auto switch back to bookings list after brief delay
      setTimeout(() => {
        setActiveTab('bookings');
        setCreateSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert(`Error creating booking: ${err.message}`);
    } finally {
      setIsCreatingBooking(false);
    }
  };

  // Filtered Bookings List
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.userPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.customDish && b.customDish.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : b.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesService =
      serviceFilter === 'all'
        ? true
        : b.serviceType.toLowerCase().includes(serviceFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesService;
  });

  // Calculate Metrics
  const totalCount = bookings.length;
  const pendingCount = bookings.filter((b) => b.status === 'Pending').length;
  const confirmedCount = bookings.filter((b) => b.status === 'Confirmed').length;
  const completedCount = bookings.filter((b) => b.status === 'Completed').length;
  const cancelledCount = bookings.filter((b) => b.status === 'Cancelled').length;

  return (
    <div
      id="admin-portal-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 text-left my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-stone-850 to-emerald-950 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Outfit',sans-serif] text-base sm:text-xl font-bold text-white tracking-wide">
                  Vegies Restro Admin Portal
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Manager Mode
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Manage table reservations, parcel orders & walk-in inquiries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={async () => {
                  await logout();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white text-xs font-semibold transition-colors cursor-pointer"
                title="Sign out of Admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Admin Logout</span>
              </button>
            )}

            <button
              type="button"
              id="admin-portal-close-btn"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20"
              aria-label="Close admin portal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CASE 1: NOT AUTHENTICATED AS ADMIN -> SHOW LOGIN VIEW   */}
        {/* ======================================================== */}
        {!isAdmin ? (
          <div className="p-6 sm:p-10 flex-1 overflow-y-auto flex items-center justify-center bg-stone-50">
            <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-xl space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-7 h-7" />
                </div>
                <h4 className="font-['Outfit',sans-serif] text-xl font-bold text-stone-900">
                  Manager Authentication
                </h4>
                <p className="text-xs text-stone-500">
                  Please log in with the administrator credentials to access and manage live restaurant bookings.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Access Denied:</span> {loginError}
                  </div>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Admin Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="parvatiyadav40@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Admin Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-black disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoggingIn ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 text-amber-400" />
                        <span>Sign In to Admin Portal</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickAdminLogin}
                    disabled={isLoggingIn}
                    className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Quick Admin Sign In ({ADMIN_EMAIL})</span>
                  </button>
                </div>
              </form>

              <div className="p-3 bg-stone-100 rounded-xl text-[11px] text-stone-500 text-center">
                Authorized for Vegies Restro management only • Santosh Bhuvan, Nalasopara East
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* CASE 2: AUTHENTICATED ADMIN -> FULL CONTROL DASHBOARD   */
          /* ======================================================== */
          <div className="flex-1 flex flex-col overflow-hidden bg-stone-50">
            {/* Top Navigation & KPI Summary */}
            <div className="p-4 sm:p-5 bg-white border-b border-stone-200 space-y-4 shrink-0">
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col">
                  <span className="text-[11px] text-stone-500 font-semibold">Total Inquiries</span>
                  <span className="text-xl font-extrabold text-stone-900">{totalCount}</span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-amber-800 font-semibold">Pending Action</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  </div>
                  <span className="text-xl font-extrabold text-amber-900">{pendingCount}</span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col">
                  <span className="text-[11px] text-emerald-800 font-semibold">Confirmed</span>
                  <span className="text-xl font-extrabold text-emerald-900">{confirmedCount}</span>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col">
                  <span className="text-[11px] text-blue-800 font-semibold">Completed</span>
                  <span className="text-xl font-extrabold text-blue-900">{completedCount}</span>
                </div>

                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-rose-700 font-semibold">Cancelled</span>
                  <span className="text-xl font-extrabold text-rose-800">{cancelledCount}</span>
                </div>
              </div>

              {/* Navigation Tabs & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('bookings')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'bookings'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    All Bookings ({bookings.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'users'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Customers & Users ({usersList.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('add-booking')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      activeTab === 'add-booking'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Add New Booking</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('cloud-status')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'cloud-status'
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Database & Sync</span>
                    {firestoreStatus && !firestoreStatus.connected && (
                      <span className="w-2 h-2 rounded-full bg-rose-500" title="Firestore not accepting writes" />
                    )}
                    {firestoreStatus && firestoreStatus.connected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Firestore connected" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('metrics')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all hidden sm:flex items-center gap-1 cursor-pointer ${
                      activeTab === 'metrics'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Analytics</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 hidden md:inline">
                    Admin: <strong>{ADMIN_EMAIL}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoadingBookings(true);
                      setTimeout(() => setIsLoadingBookings(false), 500);
                    }}
                    className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                    title="Refresh Data"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isLoadingBookings ? 'animate-spin text-emerald-600' : ''}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* TAB CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* TAB 1: ALL BOOKINGS LIST & FILTERS */}
              {activeTab === 'bookings' && (
                <div className="space-y-4">
                  {/* Search & Filters Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by customer name, phone, ref #, dish, notes..."
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">🟡 Pending ({pendingCount})</option>
                        <option value="confirmed">🟢 Confirmed ({confirmedCount})</option>
                        <option value="completed">🔵 Completed ({completedCount})</option>
                        <option value="cancelled">⚪ Cancelled ({cancelledCount})</option>
                      </select>

                      <select
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                      >
                        <option value="all">All Services</option>
                        <option value="Dine-In">Dine-In Table</option>
                        <option value="Takeaway">Takeaway / Parcel</option>
                        <option value="Gathering">Party / Gathering</option>
                        <option value="Dietary">Jain / Dietary</option>
                      </select>
                    </div>
                  </div>

                  {/* Bookings List Cards */}
                  {filteredBookings.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                        <Utensils className="w-6 h-6" />
                      </div>
                      <h5 className="font-bold text-stone-800 text-base">No bookings found</h5>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        {searchQuery || statusFilter !== 'all' || serviceFilter !== 'all'
                          ? 'No inquiries match your filter criteria. Try resetting search or filter filters.'
                          : 'No customer bookings or inquiries have been registered yet.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('add-booking')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                      >
                        + Create First Booking
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {filteredBookings.map((b) => {
                        const isActionBusy = actionLoadingId === (b.id || b.referenceId);
                        const isEditingNotes = editingNotesId === (b.id || b.referenceId);

                        let badgeColor =
                          'bg-amber-100 text-amber-900 border-amber-200';
                        if (b.status === 'Confirmed')
                          badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                        if (b.status === 'Completed')
                          badgeColor = 'bg-blue-100 text-blue-900 border-blue-300';
                        if (b.status === 'Cancelled')
                          badgeColor = 'bg-stone-100 text-stone-600 border-stone-200';

                        return (
                          <div
                            key={b.id || b.referenceId}
                            className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:border-emerald-300 transition-all space-y-3.5"
                          >
                            {/* Card Top: Reference, Status, Timestamp */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-stone-900 text-amber-400 font-mono font-bold text-xs">
                                  #{b.referenceId}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${badgeColor}`}
                                >
                                  {b.status}
                                </span>
                                <span className="text-[11px] text-stone-400 hidden sm:inline">
                                  • {new Date(b.createdAt).toLocaleString('en-IN', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </span>
                              </div>

                              {/* Action Quick Bar */}
                              <div className="flex items-center gap-1.5">
                                {/* WhatsApp to Customer */}
                                <button
                                  type="button"
                                  onClick={() => sendWhatsAppUpdate(b)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Send WhatsApp update to customer"
                                >
                                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-700" />
                                  <span className="hidden sm:inline">WhatsApp</span>
                                </button>

                                {/* Direct Call to Customer */}
                                <a
                                  href={`tel:${b.userPhone}`}
                                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1 transition-colors"
                                  title="Call Customer"
                                >
                                  <Phone className="w-3.5 h-3.5 text-stone-600" />
                                  <span className="hidden sm:inline">Call</span>
                                </a>

                                {/* Delete */}
                                <button
                                  type="button"
                                  disabled={isActionBusy}
                                  onClick={() => handleDeleteBooking(b)}
                                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Card Middle: Customer & Requirement Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              {/* Customer info */}
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                  Customer Details
                                </span>
                                <div className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                                  <span>{b.userName}</span>
                                </div>
                                <div className="text-stone-600 flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span className="font-mono">{b.userPhone}</span>
                                </div>
                                {b.userEmail && (
                                  <div className="text-stone-500 truncate max-w-[200px]">
                                    {b.userEmail}
                                  </div>
                                )}
                              </div>

                              {/* Service & Guest Details */}
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                  Requirement & Slot
                                </span>
                                <div className="font-bold text-emerald-800">{b.serviceType}</div>
                                <div className="text-stone-600 flex items-center gap-1">
                                  <Users className="w-3 h-3 text-stone-400" />
                                  <span>{b.guests}</span>
                                </div>
                                <div className="text-stone-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-stone-400" />
                                  <span>{b.timeSlot}</span>
                                </div>
                              </div>

                              {/* Dish & Notes */}
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                  Items & Special Notes
                                </span>
                                {b.customDish ? (
                                  <div className="font-semibold text-amber-900 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60">
                                    Dish: {b.customDish}
                                  </div>
                                ) : (
                                  <div className="text-stone-400 italic">No specific dish</div>
                                )}

                                {isEditingNotes ? (
                                  <div className="space-y-1.5 pt-1">
                                    <input
                                      type="text"
                                      value={tempNotes}
                                      onChange={(e) => setTempNotes(e.target.value)}
                                      placeholder="Add manager note or table #..."
                                      className="w-full px-2 py-1 text-xs rounded-lg border border-emerald-300 bg-white"
                                    />
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveNotes(b.id || b.referenceId)}
                                        className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold"
                                      >
                                        Save Note
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingNotesId(null)}
                                        className="px-2 py-0.5 rounded bg-stone-200 text-stone-700 text-[10px]"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between gap-1 text-stone-600">
                                    <span className="italic">
                                      {b.notes ? `Note: "${b.notes}"` : 'No special notes'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingNotesId(b.id || b.referenceId);
                                        setTempNotes(b.notes || '');
                                      }}
                                      className="text-stone-400 hover:text-emerald-700 p-0.5"
                                      title="Edit Note"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Bottom: Quick Status Control Buttons */}
                            <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] text-stone-500 font-medium">
                                Update Status:
                              </span>

                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={isActionBusy || b.status === 'Confirmed'}
                                  onClick={() =>
                                    handleStatusChange(b.id || b.referenceId, 'Confirmed')
                                  }
                                  className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Confirm Table / Order</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isActionBusy || b.status === 'Completed'}
                                  onClick={() =>
                                    handleStatusChange(b.id || b.referenceId, 'Completed')
                                  }
                                  className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Mark Completed</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isActionBusy || b.status === 'Pending'}
                                  onClick={() =>
                                    handleStatusChange(b.id || b.referenceId, 'Pending')
                                  }
                                  className="px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 disabled:opacity-40 font-semibold text-xs transition-colors cursor-pointer"
                                >
                                  <span>Pending</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isActionBusy || b.status === 'Cancelled'}
                                  onClick={() =>
                                    handleStatusChange(b.id || b.referenceId, 'Cancelled')
                                  }
                                  className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-40 font-semibold text-xs transition-colors cursor-pointer"
                                >
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: REGISTERED CUSTOMERS & USERS DIRECTORY */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Search & Filter Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        placeholder="Search users by name, email, or phone number..."
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      {userSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setUserSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter by Role */}
                    <div className="flex items-center gap-2">
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Roles ({usersList.length})</option>
                        <option value="customer">Customers Only</option>
                        <option value="admin">Admins / Managers</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleSyncToFirestore}
                        disabled={isSyncingCloud}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Sync users with Firestore"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sync Users to Cloud</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                      <div className="text-[11px] text-stone-500 font-medium">Total Registered</div>
                      <div className="text-lg font-bold text-stone-900">{usersList.length}</div>
                    </div>
                    <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                      <div className="text-[11px] text-stone-500 font-medium">Customer Accounts</div>
                      <div className="text-lg font-bold text-emerald-800">
                        {usersList.filter((u) => u.role !== 'admin' && u.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()).length}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                      <div className="text-[11px] text-stone-500 font-medium">Managers / Staff</div>
                      <div className="text-lg font-bold text-amber-700">
                        {usersList.filter((u) => u.role === 'admin' || u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()).length}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs">
                      <div className="text-[11px] text-stone-500 font-medium">Firestore Stored</div>
                      <div className="text-lg font-bold text-emerald-700 flex items-center gap-1">
                        <Database className="w-4 h-4 text-emerald-600" />
                        <span>Live Sync</span>
                      </div>
                    </div>
                  </div>

                  {/* Users Cards / Table List */}
                  {isLoadingUsers ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-stone-200">
                      <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-stone-500">Loading user and customer profiles from Firestore...</p>
                    </div>
                  ) : usersList.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-stone-800 text-sm">No Registered User Profiles Found Yet</h4>
                      <p className="text-xs text-stone-500 max-w-md mx-auto">
                        When customers create an account, log in via Google, or submit table reservations, their complete user profiles are securely recorded in the Firestore <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">users</code> collection.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {usersList
                        .filter((u) => {
                          const matchesSearch =
                            userSearchQuery.trim() === '' ||
                            u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            u.phoneNumber?.includes(userSearchQuery);

                          const isUserAdmin = u.role === 'admin' || u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                          const matchesRole =
                            userRoleFilter === 'all' ||
                            (userRoleFilter === 'admin' && isUserAdmin) ||
                            (userRoleFilter === 'customer' && !isUserAdmin);

                          return matchesSearch && matchesRole;
                        })
                        .map((u) => {
                          const isUserAdmin = u.role === 'admin' || u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                          
                          // Count user's bookings
                          const userBookings = bookings.filter(
                            (b) =>
                              (b.userId && b.userId === u.uid) ||
                              (b.userEmail && u.email && b.userEmail.toLowerCase() === u.email.toLowerCase()) ||
                              (b.userPhone && u.phoneNumber && b.userPhone.replace(/\D/g, '') === u.phoneNumber.replace(/\D/g, ''))
                          );

                          const formattedRegisteredDate = (() => {
                            try {
                              return new Date(u.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              });
                            } catch {
                              return 'Recent';
                            }
                          })();

                          return (
                            <div
                              key={u.uid}
                              className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs hover:border-emerald-300 transition-all space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                      isUserAdmin
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    }`}
                                  >
                                    {u.displayName ? u.displayName.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <h5 className="font-bold text-stone-900 text-sm">
                                        {u.displayName || 'Foodie Customer'}
                                      </h5>
                                      {isUserAdmin ? (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-extrabold">
                                          👑 Manager
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                          Customer
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-stone-500 font-mono mt-0.5">
                                      {u.email || 'No email provided'}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="px-2 py-1 rounded-lg bg-stone-100 text-stone-700 text-[11px] font-bold">
                                    {userBookings.length} {userBookings.length === 1 ? 'Booking' : 'Bookings'}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px] bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                                <div>
                                  <span className="text-stone-400 block text-[10px]">Contact Phone</span>
                                  <span className="font-bold text-stone-800">
                                    {u.phoneNumber || 'Not added'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-stone-400 block text-[10px]">Member Since</span>
                                  <span className="font-bold text-stone-800">
                                    {formattedRegisteredDate}
                                  </span>
                                </div>
                              </div>

                              {/* Customer Action Bar */}
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100">
                                <div className="flex items-center gap-1.5">
                                  {u.phoneNumber && (
                                    <>
                                      <a
                                        href={`https://wa.me/${u.phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
                                          `Hello ${u.displayName || 'Guest'}, greetings from Vegies Restro!`
                                        )}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" />
                                        <span>WhatsApp</span>
                                      </a>

                                      <a
                                        href={`tel:${u.phoneNumber.replace(/\s+/g, '')}`}
                                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                                        title="Direct Phone Call"
                                      >
                                        <Phone className="w-3.5 h-3.5" />
                                      </a>
                                    </>
                                  )}
                                </div>

                                {userBookings.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('bookings');
                                      setSearchQuery(u.displayName || u.email || u.phoneNumber || '');
                                    }}
                                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                                  >
                                    View Bookings ({userBookings.length}) &rarr;
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ADD NEW BOOKING FROM ADMIN END */}
              {activeTab === 'add-booking' && (
                <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-md space-y-6">
                  <div className="border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <h4 className="font-['Outfit',sans-serif] text-lg font-bold text-stone-900">
                        Add Booking / Walk-In from Admin
                      </h4>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      Directly record table reservations, phone orders, or catering inquiries into the system database.
                    </p>
                  </div>

                  {createSuccessMsg && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 font-bold animate-in fade-in">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>{createSuccessMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleAdminCreateBooking} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Customer Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          placeholder="e.g. Rajesh Sharma"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Contact Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          placeholder="10-digit number"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Service Type
                        </label>
                        <select
                          value={newServiceType}
                          onChange={(e) => setNewServiceType(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                        >
                          <option value="Dine-In Table Reservation">Dine-In Table Reservation</option>
                          <option value="Food Takeaway / Parcel Order">Food Takeaway / Parcel Order</option>
                          <option value="Family / Birthday Gathering">Family / Birthday Gathering</option>
                          <option value="Special Dietary / Jain Food">Special Dietary / Jain Food</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Guests / Portions
                        </label>
                        <select
                          value={newGuests}
                          onChange={(e) => setNewGuests(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                        >
                          <option value="1-2 People">1 - 2 People</option>
                          <option value="2-4 People">2 - 4 People</option>
                          <option value="5-8 People">5 - 8 People</option>
                          <option value="9+ Large Group">9+ Large Group</option>
                          <option value="Takeaway Order Only">Takeaway Order Only</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Preferred Meal Time Slot
                        </label>
                        <select
                          value={newTimeSlot}
                          onChange={(e) => setNewTimeSlot(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                        >
                          <option value="Morning Snacks (9:00 AM - 11:30 AM)">Morning (9:00 AM - 11:30 AM)</option>
                          <option value="Lunch (12:00 PM - 3:30 PM)">Lunch (12:00 PM - 3:30 PM)</option>
                          <option value="Evening Snacks (4:00 PM - 7:00 PM)">Evening (4:00 PM - 7:00 PM)</option>
                          <option value="Dinner (7:30 PM - 10:30 PM)">Dinner (7:30 PM - 10:30 PM)</option>
                          <option value="Immediate Takeaway">Immediate / Ready Now</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Initial Status
                        </label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-emerald-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                        >
                          <option value="Confirmed">🟢 Confirmed (Ready)</option>
                          <option value="Pending">🟡 Pending Verification</option>
                          <option value="Completed">🔵 Completed</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Specific Dishes / Items Ordered (Optional)
                      </label>
                      <input
                        type="text"
                        value={newCustomDish}
                        onChange={(e) => setNewCustomDish(e.target.value)}
                        placeholder="e.g. Veg Kolhapuri + Paneer Crispy + 4 Butter Roti"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Table Number / Staff Notes
                      </label>
                      <textarea
                        rows={2}
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="e.g. Table #4 assigned, AC section requested..."
                        className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setActiveTab('bookings')}
                        className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={isCreatingBooking}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        {isCreatingBooking ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <PlusCircle className="w-4 h-4" />
                            <span>Save & Register Booking</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: CLOUD FIRESTORE DIAGNOSTIC & SYNC */}
              {activeTab === 'cloud-status' && (
                <div className="space-y-5 max-w-3xl mx-auto">
                  {/* Status Banner */}
                  <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            firestoreStatus?.connected
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-stone-900 text-base">
                              Firebase Cloud Firestore Status
                            </h4>
                            {firestoreStatus?.connected ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                                Connected & Ready
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                                Offline / Action Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500">
                            Project ID: <span className="font-mono font-bold text-stone-700">vegies-restro</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isCheckingCloud}
                          onClick={runCloudHealthCheck}
                          className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingCloud ? 'animate-spin text-emerald-600' : ''}`} />
                          <span>Test Live Connection</span>
                        </button>
                      </div>
                    </div>

                    {/* Diagnostic Result */}
                    {firestoreStatus && (
                      <div
                        className={`p-4 rounded-2xl text-xs space-y-2 border ${
                          firestoreStatus.connected
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-amber-50 border-amber-200 text-amber-950'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {firestoreStatus.connected ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1">
                            <div className="font-bold">
                              {firestoreStatus.connected
                                ? 'Firestore read & write connection verified successfully!'
                                : `Diagnostic Alert: ${firestoreStatus.errorCode || 'Access Blocked'}`}
                            </div>
                            <div className="text-stone-600 leading-relaxed">
                              {firestoreStatus.details}
                            </div>
                            {firestoreStatus.error && !firestoreStatus.connected && (
                              <div className="p-2 bg-white/80 rounded-lg font-mono text-[11px] text-rose-800 border border-rose-200">
                                {firestoreStatus.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Push Sync Button */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          <UploadCloud className="w-4 h-4 text-emerald-600" />
                          <span>Push All Local Data (Bookings & Users) to Firestore</span>
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Transfer all {bookings.length} reservations and {usersList.length} registered customer profiles directly into your Cloud Firestore database collections.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isSyncingCloud}
                        onClick={handleSyncToFirestore}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
                      >
                        {isSyncingCloud ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
                            <span>Sync All ({bookings.length + usersList.length} Records)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {syncFeedback && (
                      <div className="p-3 bg-stone-100 rounded-xl text-xs font-semibold text-stone-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{syncFeedback}</span>
                      </div>
                    )}
                  </div>

                  {/* Why data might not appear & How to resolve */}
                  <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-4">
                    <h5 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Why Data Might Not Appear in Your Firebase Console</span>
                    </h5>

                    <div className="space-y-3 text-xs text-stone-600">
                      <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                        <span className="font-bold text-stone-900 block">
                          1. Firestore Security Rules are in "Locked" or Expired Mode (Most Common)
                        </span>
                        <p>
                          When a new Firebase project is created, Firestore by default rejects all write attempts with <code>permission-denied</code> until rules are configured. Our application protects user data with high-speed local backups, so the app still functions seamlessly.
                        </p>
                        <div className="pt-2">
                          <span className="font-bold text-stone-800 text-[11px]">How to enable:</span>
                          <ol className="list-decimal pl-5 space-y-1 text-stone-600 mt-1">
                            <li>
                              Open{' '}
                              <a
                                href="https://console.firebase.google.com/project/vegies-restro/firestore/rules"
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5"
                              >
                                Firebase Console Rules Tab <ExternalLink className="w-3 h-3 inline" />
                              </a>
                            </li>
                            <li>Paste the security rules below and click <strong>Publish</strong>.</li>
                          </ol>
                        </div>
                      </div>

                      <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
                        <span className="font-bold text-stone-900 block">
                          2. Cloud Firestore Database Not Created Yet
                        </span>
                        <p>
                          If you haven't initialized Firestore yet, go to{' '}
                          <a
                            href="https://console.firebase.google.com/project/vegies-restro/firestore"
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5"
                          >
                            Firebase Console &rarr; Firestore Database <ExternalLink className="w-3 h-3 inline" />
                          </a>{' '}
                          and click <strong>"Create database"</strong> (Start in production or test mode).
                        </p>
                      </div>
                    </div>

                    {/* Copyable Rules Snippet */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-800">Ready-To-Paste Firestore Security Rules:</span>
                        <button
                          type="button"
                          onClick={copyRulesToClipboard}
                          className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-black text-amber-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedRules ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Rules</span>
                            </>
                          )}
                        </button>
                      </div>

                      <pre className="p-3.5 bg-stone-900 text-emerald-300 font-mono text-[11px] rounded-2xl overflow-x-auto leading-relaxed border border-stone-800">
                        {sampleRulesText}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ANALYTICS & STATS */}
              {activeTab === 'metrics' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
                      <h5 className="font-bold text-stone-900 text-sm">Inquiry Conversion</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Confirmed & Fulfilled:</span>
                          <span className="font-bold text-emerald-800">
                            {totalCount > 0
                              ? Math.round(((confirmedCount + completedCount) / totalCount) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{
                              width: `${
                                totalCount > 0
                                  ? ((confirmedCount + completedCount) / totalCount) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-2">
                      <h5 className="font-bold text-stone-900 text-sm">Restaurant Info</h5>
                      <div className="text-xs text-stone-600 space-y-1">
                        <div>
                          <strong>Vegies Restro</strong>
                        </div>
                        <div>Santosh Bhuvan, Nalasopara East</div>
                        <div className="text-emerald-700 font-bold">
                          Direct Line: +91 {RESTAURANT_INFO.phone}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-2">
                      <h5 className="font-bold text-stone-900 text-sm">Quick Staff Action</h5>
                      <p className="text-xs text-stone-500">
                        Export or share today's reservation list with kitchen staff or WhatsApp dispatch.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const summary = bookings
                            .map(
                              (b) =>
                                `[${b.referenceId}] ${b.userName} (${b.userPhone}) - ${b.serviceType} | ${b.timeSlot} | ${b.status}`
                            )
                            .join('\n');
                          navigator.clipboard.writeText(summary);
                          alert("All bookings summary copied to clipboard!");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-stone-600" />
                        <span>Copy Summary Text</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
