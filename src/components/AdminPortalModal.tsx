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
import {
  formatStatusWhatsAppMessage,
  sendWhatsAppDirectInBackground,
} from '../services/whatsappService';
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
  Send,
  BellRing,
  ShoppingBag,
  ChefHat,
  Bike,
  MapPin,
  Receipt,
  Navigation,
  DollarSign,
  CheckSquare,
  Package,
  Clock3,
} from 'lucide-react';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface WhatsAppAlertInfo {
  bookingId: string;
  referenceId: string;
  customerName: string;
  customerPhone: string;
  newStatus: BookingInquiry['status'];
  messageText: string;
  dispatched: boolean;
  timestamp: number;
}

/**
 * Open WhatsApp directly with sanitized Indian/international phone number
 */
export const openWhatsAppDirect = (phone: string, text: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) {
    return false;
  }
  // Sanitize 10-digit Indian numbers, 11-digit numbers with 0 prefix, or 12-digit with 91
  const phoneWithCountry =
    cleanPhone.startsWith('91') && cleanPhone.length === 12
      ? cleanPhone
      : cleanPhone.length === 10
      ? `91${cleanPhone}`
      : cleanPhone.startsWith('0') && cleanPhone.length === 11
      ? `91${cleanPhone.slice(1)}`
      : cleanPhone;

  const url = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(text)}`;
  
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (err) {
    console.error('Error launching WhatsApp:', err);
    window.location.href = url;
  }
  return true;
};

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile, isAdmin, signInAdminDirect, logout } = useAuth();

  // Login form states for unauthenticated admin (empty by default for strict security)
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin Dashboard views & data
  const [activeTab, setActiveTab] = useState<'orders' | 'bookings' | 'all-inquiries' | 'users' | 'add-booking' | 'cloud-status' | 'metrics'>('orders');
  const [bookings, setBookings] = useState<BookingInquiry[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  // Food Orders Dedicated State
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [copiedKOTId, setCopiedKOTId] = useState<string | null>(null);

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

  // WhatsApp Automation Settings & Alert State
  const [autoWhatsAppOnStatus, setAutoWhatsAppOnStatus] = useState<boolean>(true);
  const [lastWhatsAppAlert, setLastWhatsAppAlert] = useState<WhatsAppAlertInfo | null>(null);
  const [copiedAlertMsg, setCopiedAlertMsg] = useState<boolean>(false);

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
  const [sendWhatsAppOnCreate, setSendWhatsAppOnCreate] = useState<boolean>(true);
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

  // Handle Admin Direct Sign In (Requires genuine matching admin credentials)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !passwordInput) {
      setLoginError('Please enter both your administrator email and password.');
      return;
    }

    if (cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
      setLoginError(`Access denied. '${cleanEmail}' is not recognized as the authorized restaurant administrator.`);
      return;
    }

    setIsLoggingIn(true);

    try {
      await signInAdminDirect(passwordInput);
      // Clear password input once authenticated
      setPasswordInput('');
    } catch (err: any) {
      console.error('Admin login error:', err);
      const msg =
        err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
          ? 'Invalid password. Please enter the correct admin password.'
          : err.message || 'Invalid credentials. Please verify your admin password.';
      setLoginError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Status Change Handler with Instant Direct WhatsApp Messaging
  const handleStatusChange = async (
    bookingId: string,
    newSt: BookingInquiry['status'],
    bookingItem?: BookingInquiry,
    customMsg?: string
  ) => {
    // Find the corresponding booking if not passed directly
    const targetBooking =
      bookingItem ||
      bookings.find((b) => b.id === bookingId || b.referenceId === bookingId);

    // Rule: Once status is marked as completed, it cannot be changed
    if (targetBooking && targetBooking.status === 'Completed' && newSt !== 'Completed') {
      return;
    }

    // Rule: Once a status is set, it cannot be clicked again for the same status
    if (targetBooking && targetBooking.status === newSt) {
      return;
    }

    // 1. Prepare message and trigger instant WhatsApp chat immediately upon user click
    let generatedMessage = '';
    if (targetBooking) {
      generatedMessage = formatStatusWhatsAppMessage(
        targetBooking,
        newSt,
        customMsg || targetBooking.notes
      );

      if (autoWhatsAppOnStatus && targetBooking.userPhone) {
        openWhatsAppDirect(targetBooking.userPhone, generatedMessage);
      }
    }

    setActionLoadingId(bookingId);
    try {
      // 2. Update status in database & local storage
      await updateBookingStatusAdmin(bookingId, newSt);

      if (targetBooking) {
        // 3. Log dispatch record and call webhook/API if configured
        const dispatchRecord = await sendWhatsAppDirectInBackground(
          targetBooking,
          newSt,
          customMsg || targetBooking.notes
        );

        // 4. Set confirmation alert banner for administrative visibility
        setLastWhatsAppAlert({
          bookingId: targetBooking.id || targetBooking.referenceId,
          referenceId: targetBooking.referenceId,
          customerName: targetBooking.userName || 'Customer',
          customerPhone: targetBooking.userPhone || '',
          newStatus: newSt,
          messageText: generatedMessage || dispatchRecord.messageText,
          dispatched: true,
          timestamp: Date.now(),
        });
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
    setActionLoadingId(booking.id || booking.referenceId);
    try {
      await deleteBookingAdmin(booking.id || booking.referenceId);
      if (lastWhatsAppAlert?.referenceId === booking.referenceId) {
        setLastWhatsAppAlert(null);
      }
    } catch (e) {
      console.error('Delete error:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // WhatsApp Dispatcher from Admin (Direct instant delivery)
  const sendWhatsAppUpdate = async (booking: BookingInquiry, customStatus?: BookingInquiry['status']) => {
    const statusText = customStatus || booking.status;
    const message = formatStatusWhatsAppMessage(booking, statusText, booking.notes);
    
    // Launch chat directly
    openWhatsAppDirect(booking.userPhone, message);

    const dispatchRecord = await sendWhatsAppDirectInBackground(booking, statusText, booking.notes);

    setLastWhatsAppAlert({
      bookingId: booking.id || booking.referenceId,
      referenceId: booking.referenceId,
      customerName: booking.userName || 'Customer',
      customerPhone: booking.userPhone,
      newStatus: statusText,
      messageText: message || dispatchRecord.messageText,
      dispatched: true,
      timestamp: Date.now(),
    });
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

      // Dispatch WhatsApp message instantly
      if (sendWhatsAppOnCreate && created.userPhone) {
        const msg = formatStatusWhatsAppMessage(created, newStatus, created.notes);
        openWhatsAppDirect(created.userPhone, msg);
        await sendWhatsAppDirectInBackground(created, newStatus, created.notes);
      }

      setCreateSuccessMsg(
        `Booking #${created.referenceId} for ${created.userName} registered and status set to ${newStatus}! WhatsApp update triggered.`
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
      }, 1800);
    } catch (err: any) {
      alert(`Error creating booking: ${err.message}`);
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const isFoodOrder = (b: BookingInquiry) => {
    const st = (b.serviceType || '').toLowerCase();
    return (
      st.includes('food') ||
      st.includes('delivery') ||
      st.includes('takeaway') ||
      st.includes('parcel') ||
      st.includes('order')
    );
  };

  // Helper to extract Address from notes
  const extractDeliveryAddress = (notes?: string) => {
    if (!notes) return null;
    const match = notes.match(/Delivery Address:\s*([^|]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    if (
      notes.toLowerCase().includes('address') ||
      notes.toLowerCase().includes('flat') ||
      notes.toLowerCase().includes('room') ||
      notes.toLowerCase().includes('bldg') ||
      notes.toLowerCase().includes('road') ||
      notes.toLowerCase().includes('nagar')
    ) {
      const parts = notes.split('|');
      return parts[0].replace(/delivery address:/i, '').trim();
    }
    return null;
  };

  // Helper to extract cooking notes / instructions
  const extractCookingNotes = (notes?: string) => {
    if (!notes) return null;
    const parts = notes.split('|');
    const filtered = parts.filter((p) => !p.toLowerCase().includes('delivery address:'));
    if (filtered.length > 0) {
      return filtered.join(' | ').trim();
    }
    return null;
  };

  // Separate Lists
  const foodOrders = bookings.filter(isFoodOrder);
  const tableBookings = bookings.filter((b) => !isFoodOrder(b));

  // Filtered Food Orders
  const filteredFoodOrders = foodOrders.filter((b) => {
    const matchesSearch =
      b.userName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      b.userPhone.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      b.referenceId.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      (b.customDish && b.customDish.toLowerCase().includes(orderSearchQuery.toLowerCase())) ||
      (b.notes && b.notes.toLowerCase().includes(orderSearchQuery.toLowerCase()));

    const matchesStatus =
      orderStatusFilter === 'all'
        ? true
        : orderStatusFilter === 'Delivered'
        ? b.status === 'Delivered' || b.status === 'Completed'
        : b.status.toLowerCase() === orderStatusFilter.toLowerCase();

    const matchesType =
      orderTypeFilter === 'all'
        ? true
        : orderTypeFilter === 'delivery'
        ? b.serviceType.toLowerCase().includes('delivery')
        : b.serviceType.toLowerCase().includes('takeaway') || b.serviceType.toLowerCase().includes('parcel');

    return matchesSearch && matchesStatus && matchesType;
  });

  // Filtered Table Bookings List
  const filteredTableBookings = tableBookings.filter((b) => {
    const matchesSearch =
      b.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.userPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.customDish && b.customDish.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : b.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Filtered All Inquiries List
  const filteredAllInquiries = bookings.filter((b) => {
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

  // Calculate Order Specific Metrics
  const orderTotalCount = foodOrders.length;
  const orderPendingCount = foodOrders.filter((b) => b.status === 'Pending').length;
  const orderConfirmedCount = foodOrders.filter((b) => b.status === 'Confirmed').length;
  const orderPreparingCount = foodOrders.filter((b) => b.status === 'Preparing').length;
  const orderOutForDeliveryCount = foodOrders.filter((b) => b.status === 'Out for Delivery').length;
  const orderDeliveredCount = foodOrders.filter((b) => b.status === 'Delivered' || b.status === 'Completed').length;
  const orderCancelledCount = foodOrders.filter((b) => b.status === 'Cancelled').length;

  // Calculate Total Order Revenue (Sum of valid orders)
  const orderRevenue = foodOrders
    .filter((b) => b.status !== 'Cancelled')
    .reduce((sum, b) => {
      const match = (b.guests || '').match(/\d+/g);
      if (match) {
        const val = parseInt(match.join(''), 10);
        return sum + (isNaN(val) ? 0 : val);
      }
      return sum;
    }, 0);

  // Table Bookings Metrics
  const tableTotalCount = tableBookings.length;
  const tablePendingCount = tableBookings.filter((b) => b.status === 'Pending').length;
  const tableConfirmedCount = tableBookings.filter((b) => b.status === 'Confirmed').length;
  const tableCompletedCount = tableBookings.filter((b) => b.status === 'Completed').length;
  const tableCancelledCount = tableBookings.filter((b) => b.status === 'Cancelled').length;

  // Calculate Metrics (Total Inquiries)
  const totalCount = bookings.length;
  const pendingCount = bookings.filter((b) => b.status === 'Pending').length;
  const confirmedCount = bookings.filter((b) => b.status === 'Confirmed').length;
  const completedCount = bookings.filter((b) => b.status === 'Completed' || b.status === 'Delivered').length;
  const cancelledCount = bookings.filter((b) => b.status === 'Cancelled').length;

  // Kitchen Order Ticket (KOT) generator & copy
  const handleCopyKOT = (order: BookingInquiry) => {
    const address = extractDeliveryAddress(order.notes);
    const cookingNotes = extractCookingNotes(order.notes);
    const isTakeaway = order.serviceType.toLowerCase().includes('takeaway');

    let kot = `=====================================\n`;
    kot += `  VEGIES RESTRO - KITCHEN ORDER TICKET\n`;
    kot += `=====================================\n`;
    kot += `Order Ref: #${order.referenceId}\n`;
    kot += `Type: ${isTakeaway ? '🥡 TAKEAWAY (PARCEL)' : '🛵 HOME DELIVERY'}\n`;
    kot += `Date/Time: ${new Date(order.createdAt).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    })}\n`;
    kot += `Customer: ${order.userName} (${order.userPhone})\n`;
    if (address && !isTakeaway) {
      kot += `Delivery To: ${address}\n`;
    }
    kot += `-------------------------------------\n`;
    kot += `ITEMS ORDERED:\n`;
    if (order.customDish) {
      kot += `${order.customDish}\n`;
    } else {
      kot += `Standard Meal / Custom Order\n`;
    }
    kot += `-------------------------------------\n`;
    if (cookingNotes) {
      kot += `SPECIAL INSTRUCTIONS: ${cookingNotes}\n`;
      kot += `-------------------------------------\n`;
    }
    kot += `BILL TOTAL: ${order.guests || 'N/A'}\n`;
    kot += `STATUS: ${order.status.toUpperCase()}\n`;
    kot += `=====================================\n`;

    navigator.clipboard.writeText(kot);
    setCopiedKOTId(order.id || order.referenceId);
    setTimeout(() => setCopiedKOTId(null), 2500);
  };

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
                    placeholder="Enter admin email address"
                    autoComplete="email"
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
                      placeholder="Enter admin password"
                      autoComplete="current-password"
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

                <div className="pt-2">
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
              {/* KPIs dynamically adjusted by active tab */}
              {activeTab === 'orders' ? (
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col">
                    <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-emerald-600" />
                      Total Orders
                    </span>
                    <span className="text-xl font-extrabold text-emerald-950">{orderTotalCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-800 font-semibold">Pending Review</span>
                      {orderPendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </div>
                    <span className="text-xl font-extrabold text-amber-900">{orderPendingCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col">
                    <span className="text-[11px] text-emerald-800 font-semibold">Confirmed</span>
                    <span className="text-xl font-extrabold text-emerald-900">{orderConfirmedCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-orange-800 font-semibold flex items-center gap-1">
                        <ChefHat className="w-3 h-3 text-orange-600" />
                        In Kitchen
                      </span>
                      {orderPreparingCount > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />}
                    </div>
                    <span className="text-xl font-extrabold text-orange-900">{orderPreparingCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col">
                    <span className="text-[11px] text-indigo-800 font-semibold flex items-center gap-1">
                      <Bike className="w-3 h-3 text-indigo-600" />
                      On Delivery
                    </span>
                    <span className="text-xl font-extrabold text-indigo-900">{orderOutForDeliveryCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-teal-800 font-semibold">Delivered / Done</span>
                    <span className="text-xl font-extrabold text-teal-900">{orderDeliveredCount}</span>
                  </div>
                </div>
              ) : activeTab === 'bookings' ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col">
                    <span className="text-[11px] text-stone-500 font-semibold">Table Bookings</span>
                    <span className="text-xl font-extrabold text-stone-900">{tableTotalCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-800 font-semibold">Pending Review</span>
                      {tablePendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </div>
                    <span className="text-xl font-extrabold text-amber-900">{tablePendingCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col">
                    <span className="text-[11px] text-emerald-800 font-semibold">Confirmed Tables</span>
                    <span className="text-xl font-extrabold text-emerald-900">{tableConfirmedCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col">
                    <span className="text-[11px] text-blue-800 font-semibold">Completed Dine-in</span>
                    <span className="text-xl font-extrabold text-blue-900">{tableCompletedCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-rose-700 font-semibold">Cancelled</span>
                    <span className="text-xl font-extrabold text-rose-800">{tableCancelledCount}</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col">
                    <span className="text-[11px] text-stone-500 font-semibold">Total Inquiries</span>
                    <span className="text-xl font-extrabold text-stone-900">{totalCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-800 font-semibold">Pending Action</span>
                      {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </div>
                    <span className="text-xl font-extrabold text-amber-900">{pendingCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col">
                    <span className="text-[11px] text-emerald-800 font-semibold">Confirmed</span>
                    <span className="text-xl font-extrabold text-emerald-900">{confirmedCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col">
                    <span className="text-[11px] text-blue-800 font-semibold">Completed / Done</span>
                    <span className="text-xl font-extrabold text-blue-900">{completedCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-rose-700 font-semibold">Cancelled</span>
                    <span className="text-xl font-extrabold text-rose-800">{cancelledCount}</span>
                  </div>
                </div>
              )}

              {/* Navigation Tabs & Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200">
                  {/* Tab: Food Orders (Dedicated) */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'orders'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-900 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Food Orders ({orderTotalCount})</span>
                    {orderPendingCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </button>

                  {/* Tab: Table Reservations */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('bookings')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'bookings'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5 text-stone-500" />
                    <span>Table Bookings ({tableTotalCount})</span>
                  </button>

                  {/* Tab: All Inquiries */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('all-inquiries')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'all-inquiries'
                        ? 'bg-white text-stone-900 shadow-xs font-bold'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    All Inquiries ({totalCount})
                  </button>

                  {/* Tab: Registered Users */}
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
                    <span>Customers ({usersList.length})</span>
                  </button>

                  {/* Tab: Add Booking / Order */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('add-booking')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      activeTab === 'add-booking'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ New Entry</span>
                  </button>

                  {/* Tab: Cloud Status */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('cloud-status')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'cloud-status'
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Database & Sync</span>
                    {firestoreStatus && !firestoreStatus.connected && (
                      <span className="w-2 h-2 rounded-full bg-rose-500" title="Firestore not accepting writes" />
                    )}
                    {firestoreStatus && firestoreStatus.connected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Firestore connected" />
                    )}
                  </button>

                  {/* Tab: Analytics */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('metrics')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all hidden lg:flex items-center gap-1 cursor-pointer ${
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
                    className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
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
              {/* ======================================================== */}
              {/* TAB 1: DEDICATED FOOD ORDERS SECTION WITH STATUS UPDATES */}
              {/* ======================================================== */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {/* WhatsApp Automation & Quick Controls Bar */}
                  <div className="bg-emerald-50/80 border border-emerald-200 p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <WhatsAppIcon className="w-4 h-4 fill-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-950">
                            ⚡ Instant Order WhatsApp Dispatcher
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 text-[10px] font-extrabold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Live Realtime Alerts
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800/90 leading-tight">
                          Clicking status updates (Confirm, In Kitchen, Out for Delivery, Delivered) instantly alerts customer on WhatsApp with reference ID and ETA!
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-stone-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs hover:bg-emerald-50/50 transition-colors shrink-0">
                      <input
                        type="checkbox"
                        checked={autoWhatsAppOnStatus}
                        onChange={(e) => setAutoWhatsAppOnStatus(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      />
                      <span>Auto-send on status click</span>
                    </label>
                  </div>

                  {/* WhatsApp Last Notification Banner */}
                  {lastWhatsAppAlert && (
                    <div className="p-4 rounded-2xl bg-stone-900 text-white shadow-lg border border-emerald-500/40 animate-in fade-in space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-emerald-300">
                                ⚡ WhatsApp Notification Dispatched
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  lastWhatsAppAlert.newStatus === 'Confirmed'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                    : lastWhatsAppAlert.newStatus === 'Preparing'
                                    ? 'bg-orange-500/20 text-orange-300 border-orange-400/40'
                                    : lastWhatsAppAlert.newStatus === 'Out for Delivery'
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                                    : lastWhatsAppAlert.newStatus === 'Delivered' || lastWhatsAppAlert.newStatus === 'Completed'
                                    ? 'bg-teal-500/20 text-teal-300 border-teal-400/40'
                                    : lastWhatsAppAlert.newStatus === 'Cancelled'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                                }`}
                              >
                                {lastWhatsAppAlert.newStatus}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                                Sent Instantly ✅
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-300">
                              Recipient: <strong>{lastWhatsAppAlert.customerName}</strong> (Ref: #{lastWhatsAppAlert.referenceId}) • <span className="font-mono text-amber-300">{lastWhatsAppAlert.customerPhone}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              openWhatsAppDirect(
                                lastWhatsAppAlert.customerPhone,
                                lastWhatsAppAlert.messageText
                              )
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="Open in WhatsApp"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 fill-stone-950" />
                            <span className="text-[11px]">Send in WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(lastWhatsAppAlert.messageText);
                              setCopiedAlertMsg(true);
                              setTimeout(() => setCopiedAlertMsg(false), 2000);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedAlertMsg ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300 text-[11px]">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Copy Text</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setLastWhatsAppAlert(null)}
                            className="p-1.5 rounded-xl hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer"
                            title="Dismiss Banner"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Message preview snippet */}
                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-stone-200 font-mono whitespace-pre-wrap max-h-24 overflow-y-auto leading-relaxed">
                        {lastWhatsAppAlert.messageText}
                      </div>
                    </div>
                  )}

                  {/* Search & Filters Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        placeholder="Search orders by customer, phone, ref #, dish, address..."
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      {orderSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setOrderSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Status Filter & Type Filter */}
                    <div className="flex items-center gap-2">
                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                      >
                        <option value="all">All Order Statuses</option>
                        <option value="Pending">🟡 Pending Review ({orderPendingCount})</option>
                        <option value="Confirmed">🟢 Confirmed ({orderConfirmedCount})</option>
                        <option value="Preparing">👨‍🍳 In Kitchen ({orderPreparingCount})</option>
                        <option value="Out for Delivery">🛵 Out for Delivery ({orderOutForDeliveryCount})</option>
                        <option value="Delivered">✅ Delivered ({orderDeliveredCount})</option>
                        <option value="Cancelled">❌ Cancelled ({orderCancelledCount})</option>
                      </select>

                      <select
                        value={orderTypeFilter}
                        onChange={(e) => setOrderTypeFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                      >
                        <option value="all">All Types</option>
                        <option value="delivery">🛵 Home Delivery</option>
                        <option value="takeaway">🥡 Takeaway / Parcel</option>
                      </select>
                    </div>
                  </div>

                  {/* Orders Cards List */}
                  {filteredFoodOrders.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <h5 className="font-bold text-stone-800 text-base">No food orders found</h5>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        {orderSearchQuery || orderStatusFilter !== 'all' || orderTypeFilter !== 'all'
                          ? 'No food orders match your selected filters. Try clearing search or filter.'
                          : 'No online food orders or parcel inquiries have been placed yet.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('add-booking')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                      >
                        + Create Manual Order
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {filteredFoodOrders.map((order) => {
                        const isActionBusy = actionLoadingId === (order.id || order.referenceId);
                        const isEditingNotes = editingNotesId === (order.id || order.referenceId);
                        const deliveryAddress = extractDeliveryAddress(order.notes);
                        const cookingNotes = extractCookingNotes(order.notes);
                        const isTakeaway = order.serviceType.toLowerCase().includes('takeaway');

                        // Status Badge Colors
                        let badgeColor = 'bg-amber-100 text-amber-900 border-amber-200';
                        let statusIcon = <Clock className="w-3.5 h-3.5 text-amber-700" />;
                        
                        if (order.status === 'Confirmed') {
                          badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                          statusIcon = <Check className="w-3.5 h-3.5 text-emerald-700" />;
                        } else if (order.status === 'Preparing') {
                          badgeColor = 'bg-orange-100 text-orange-950 border-orange-300 animate-pulse';
                          statusIcon = <ChefHat className="w-3.5 h-3.5 text-orange-700" />;
                        } else if (order.status === 'Out for Delivery') {
                          badgeColor = 'bg-indigo-100 text-indigo-900 border-indigo-300';
                          statusIcon = <Bike className="w-3.5 h-3.5 text-indigo-700" />;
                        } else if (order.status === 'Delivered' || order.status === 'Completed') {
                          badgeColor = 'bg-teal-100 text-teal-900 border-teal-300';
                          statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />;
                        } else if (order.status === 'Cancelled') {
                          badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                          statusIcon = <X className="w-3.5 h-3.5 text-rose-700" />;
                        }

                        return (
                          <div
                            key={order.id || order.referenceId}
                            className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-sm hover:border-emerald-300 transition-all space-y-4"
                          >
                            {/* Order Card Top: Reference, Type Badge, Status, Action tools */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-stone-900 text-amber-400 font-mono font-extrabold text-xs">
                                  #{order.referenceId}
                                </span>

                                {/* Order Type Badge */}
                                <span
                                  className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold flex items-center gap-1 ${
                                    isTakeaway
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  }`}
                                >
                                  {isTakeaway ? (
                                    <>
                                      <Package className="w-3 h-3 text-amber-700" />
                                      <span>🥡 Takeaway Pickup</span>
                                    </>
                                  ) : (
                                    <>
                                      <Bike className="w-3 h-3 text-emerald-700" />
                                      <span>🛵 Home Delivery</span>
                                    </>
                                  )}
                                </span>

                                {/* Live Status Badge */}
                                <span
                                  className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold flex items-center gap-1 ${badgeColor}`}
                                >
                                  {statusIcon}
                                  <span>{order.status}</span>
                                </span>

                                <span className="text-[11px] text-stone-400 hidden sm:inline">
                                  • {new Date(order.createdAt).toLocaleString('en-IN', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </span>
                              </div>

                              {/* Quick Action Tools */}
                              <div className="flex items-center gap-1.5">
                                {/* Kitchen Ticket (KOT) */}
                                <button
                                  type="button"
                                  onClick={() => handleCopyKOT(order)}
                                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Copy Kitchen Order Ticket (KOT) to clipboard"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-stone-600" />
                                  <span>{copiedKOTId === (order.id || order.referenceId) ? 'KOT Copied! ✓' : 'Kitchen Slip'}</span>
                                </button>

                                {/* WhatsApp Customer */}
                                <button
                                  type="button"
                                  onClick={() => sendWhatsAppUpdate(order)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Send WhatsApp update to customer"
                                >
                                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-700" />
                                  <span className="hidden sm:inline">WhatsApp</span>
                                </button>

                                {/* Direct Call */}
                                <a
                                  href={`tel:${order.userPhone}`}
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
                                  onClick={() => handleDeleteBooking(order)}
                                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete order record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Order Card Middle: 3-Column Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* 1. Customer & Contact Details */}
                              <div className="space-y-1.5 bg-stone-50/70 p-3 rounded-xl border border-stone-200/60">
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1">
                                  <Users className="w-3 h-3 text-stone-400" />
                                  Customer & Timing
                                </span>
                                <div className="font-bold text-stone-900 text-sm">
                                  {order.userName}
                                </div>
                                <div className="text-stone-700 flex items-center gap-1 font-mono font-semibold">
                                  <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>{order.userPhone}</span>
                                </div>
                                {order.userEmail && (
                                  <div className="text-stone-500 truncate text-[11px]">
                                    {order.userEmail}
                                  </div>
                                )}
                                <div className="pt-1 text-stone-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-stone-400" />
                                  <span>Slot: <strong>{order.timeSlot}</strong></span>
                                </div>
                              </div>

                              {/* 2. Delivery Address or Takeaway Location */}
                              <div className="space-y-1.5 bg-stone-50/70 p-3 rounded-xl border border-stone-200/60">
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-stone-400" />
                                  {isTakeaway ? 'Pickup Details' : 'Delivery Destination'}
                                </span>

                                {isTakeaway ? (
                                  <div className="text-stone-700 space-y-1">
                                    <div className="font-semibold text-amber-900">
                                      🥡 Restaurant Counter Pickup
                                    </div>
                                    <p className="text-[11px] text-stone-500">
                                      Customer will pick up packed parcel directly from the front billing counter.
                                    </p>
                                  </div>
                                ) : deliveryAddress ? (
                                  <div className="space-y-2">
                                    <div className="font-semibold text-stone-900 leading-snug bg-white p-2 rounded-lg border border-stone-200">
                                      {deliveryAddress}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddress)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[10px] flex items-center gap-1 transition-colors"
                                      >
                                        <Navigation className="w-3 h-3 text-emerald-700" />
                                        <span>Google Maps</span>
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(deliveryAddress);
                                          alert('Address copied to clipboard!');
                                        }}
                                        className="px-2 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium text-[10px] flex items-center gap-1"
                                      >
                                        <Copy className="w-3 h-3" />
                                        <span>Copy Address</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-stone-400 italic">
                                    No address specified (Contact customer for location)
                                  </div>
                                )}
                              </div>

                              {/* 3. Items Ordered & Bill Total */}
                              <div className="space-y-1.5 bg-stone-50/70 p-3 rounded-xl border border-stone-200/60 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1">
                                      <Utensils className="w-3 h-3 text-stone-400" />
                                      Items Ordered
                                    </span>
                                    <span className="font-extrabold text-emerald-800 text-sm bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">
                                      {order.guests || 'Standard Rate'}
                                    </span>
                                  </div>

                                  <div className="font-semibold text-amber-950 bg-amber-50/90 p-2 rounded-lg border border-amber-200/70 mt-1 whitespace-pre-wrap leading-snug">
                                    {order.customDish || 'Food Items Selected'}
                                  </div>

                                  {cookingNotes && (
                                    <div className="text-[11px] text-stone-600 italic mt-1 bg-white p-1.5 rounded-md border border-stone-200">
                                      Note: <strong>{cookingNotes}</strong>
                                    </div>
                                  )}
                                </div>

                                {/* Manager Note Editor */}
                                <div className="pt-1.5 border-t border-stone-200/60">
                                  {isEditingNotes ? (
                                    <div className="space-y-1.5">
                                      <input
                                        type="text"
                                        value={tempNotes}
                                        onChange={(e) => setTempNotes(e.target.value)}
                                        placeholder="Assign rider name / phone or note..."
                                        className="w-full px-2 py-1 text-xs rounded-lg border border-emerald-300 bg-white"
                                      />
                                      <div className="flex gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleSaveNotes(order.id || order.referenceId)}
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
                                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                                      <span className="truncate max-w-[180px]">
                                        {order.notes ? `Rider/Note: ${order.notes}` : 'Assign Rider / Note'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingNotesId(order.id || order.referenceId);
                                          setTempNotes(order.notes || '');
                                        }}
                                        className="text-emerald-700 hover:underline font-bold text-[10px] cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Order Card Bottom: Comprehensive Status Pipeline Update Buttons */}
                            <div className="pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs text-stone-600 font-bold flex items-center gap-1">
                                <span>Order Status Action:</span>
                              </span>

                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* 1. Pending */}
                                <button
                                  type="button"
                                  disabled={isActionBusy || order.status === 'Pending'}
                                  onClick={() =>
                                    handleStatusChange(order.id || order.referenceId, 'Pending', order)
                                  }
                                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                                    order.status === 'Pending'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300 opacity-60 cursor-not-allowed pointer-events-none'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 cursor-pointer active:scale-95'
                                  }`}
                                  title="Mark order as pending review"
                                >
                                  <span>{order.status === 'Pending' ? '● Pending' : 'Pending'}</span>
                                </button>

                                {/* 2. Confirm Order */}
                                <button
                                  type="button"
                                  disabled={isActionBusy || order.status === 'Confirmed'}
                                  onClick={() =>
                                    handleStatusChange(order.id || order.referenceId, 'Confirmed', order)
                                  }
                                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all ${
                                    order.status === 'Confirmed'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 opacity-60 cursor-not-allowed pointer-events-none'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                                  }`}
                                  title="Confirm order & notify customer on WhatsApp"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{order.status === 'Confirmed' ? '✓ Confirmed' : 'Confirm'}</span>
                                </button>

                                {/* 3. In Kitchen (Preparing) */}
                                <button
                                  type="button"
                                  disabled={isActionBusy || order.status === 'Preparing'}
                                  onClick={() =>
                                    handleStatusChange(order.id || order.referenceId, 'Preparing', order)
                                  }
                                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all ${
                                    order.status === 'Preparing'
                                      ? 'bg-orange-100 text-orange-900 border border-orange-300 opacity-60 cursor-not-allowed pointer-events-none'
                                      : 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer active:scale-95'
                                  }`}
                                  title="Send to kitchen: Food is being prepared"
                                >
                                  <ChefHat className="w-3.5 h-3.5" />
                                  <span>{order.status === 'Preparing' ? '👨‍🍳 Preparing...' : '👨‍🍳 In Kitchen'}</span>
                                </button>

                                {/* 4. Out for Delivery / Ready for Pickup */}
                                <button
                                  type="button"
                                  disabled={isActionBusy || order.status === 'Out for Delivery'}
                                  onClick={() =>
                                    handleStatusChange(order.id || order.referenceId, 'Out for Delivery', order)
                                  }
                                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all ${
                                    order.status === 'Out for Delivery'
                                      ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 opacity-60 cursor-not-allowed pointer-events-none'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                                  }`}
                                  title={isTakeaway ? 'Mark food ready for counter pickup' : 'Mark order out for delivery with rider'}
                                >
                                  {isTakeaway ? (
                                    <>
                                      <Package className="w-3.5 h-3.5" />
                                      <span>{order.status === 'Out for Delivery' ? '🥡 Ready for Pickup' : '🥡 Ready for Pickup'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Bike className="w-3.5 h-3.5" />
                                      <span>{order.status === 'Out for Delivery' ? '🛵 Out for Delivery' : '🛵 Out for Delivery'}</span>
                                    </>
                                  )}
                                </button>

                                {/* 5. Delivered / Completed */}
                                <button
                                  type="button"
                                  disabled={isActionBusy || order.status === 'Delivered' || order.status === 'Completed'}
                                  onClick={() =>
                                    handleStatusChange(order.id || order.referenceId, 'Delivered', order)
                                  }
                                  className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all ${
                                    order.status === 'Delivered' || order.status === 'Completed'
                                      ? 'bg-teal-100 text-teal-900 border border-teal-300 opacity-60 cursor-not-allowed pointer-events-none'
                                      : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer active:scale-95'
                                  }`}
                                  title="Mark order as delivered & thank customer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{order.status === 'Delivered' || order.status === 'Completed' ? '✅ Delivered' : 'Delivered'}</span>
                                </button>

                                {/* 6. Cancelled */}
                                <button
                                  type="button"
                                  disabled={isActionBusy || order.status === 'Cancelled'}
                                  onClick={() =>
                                    handleStatusChange(order.id || order.referenceId, 'Cancelled', order)
                                  }
                                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                                    order.status === 'Cancelled'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300 opacity-60 cursor-not-allowed pointer-events-none'
                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer active:scale-95'
                                  }`}
                                  title="Cancel order and notify customer"
                                >
                                  <span>{order.status === 'Cancelled' ? '✕ Cancelled' : 'Cancel'}</span>
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

              {/* ======================================================== */}
              {/* TAB 2: TABLE RESERVATIONS ONLY                           */}
              {/* ======================================================== */}
              {activeTab === 'bookings' && (
                <div className="space-y-4">
                  {/* WhatsApp Automation & Quick Controls Bar */}
                  <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <WhatsAppIcon className="w-4 h-4 fill-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-950">
                            ⚡ Instant Table Booking Dispatcher
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 text-[10px] font-extrabold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800/90 leading-tight">
                          Manage dine-in table reservations and send real-time WhatsApp confirmations to guests.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Switch to Food Orders ({orderTotalCount})</span>
                    </button>
                  </div>

                  {/* Search & Filters Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search table reservations by customer name, phone, ref #..."
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
                        <option value="pending">🟡 Pending ({tablePendingCount})</option>
                        <option value="confirmed">🟢 Confirmed ({tableConfirmedCount})</option>
                        <option value="completed">🔵 Completed ({tableCompletedCount})</option>
                        <option value="cancelled">⚪ Cancelled ({tableCancelledCount})</option>
                      </select>
                    </div>
                  </div>

                  {/* Bookings List Cards */}
                  {filteredTableBookings.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                        <Utensils className="w-6 h-6" />
                      </div>
                      <h5 className="font-bold text-stone-800 text-base">No table reservations found</h5>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        {searchQuery || statusFilter !== 'all'
                          ? 'No table reservations match your search. Try adjusting the filters.'
                          : 'No dine-in table reservations have been registered yet.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('add-booking')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                      >
                        + Reserve a Table
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {filteredTableBookings.map((b) => {
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
                                  className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold flex items-center gap-1 ${badgeColor}`}
                                >
                                  {b.status === 'Completed' && <Lock className="w-3 h-3 text-blue-700" />}
                                  <span>{b.status}</span>
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
                                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
                                  Table & Party Size
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
                                  Table Notes & Dietary
                                </span>
                                {b.customDish ? (
                                  <div className="font-semibold text-amber-900 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60">
                                    Dish: {b.customDish}
                                  </div>
                                ) : null}

                                {isEditingNotes ? (
                                  <div className="space-y-1.5 pt-1">
                                    <input
                                      type="text"
                                      value={tempNotes}
                                      onChange={(e) => setTempNotes(e.target.value)}
                                      placeholder="Add table # or manager note..."
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

                            {/* Card Bottom: Quick Status Control Buttons or Locked Banner */}
                            {b.status === 'Completed' ? (
                              <div className="pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 bg-blue-50/70 p-3 rounded-xl border border-blue-200/70">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                    <Lock className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                                      <span>Table Reservation Finalized</span>
                                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold border border-blue-200">
                                        Locked 🔒
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-blue-800/80">
                                      Guests served and bill cleared. Status is finalized.
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs text-blue-900 font-semibold">
                                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                  <span>Dine-In Completed</span>
                                </div>
                              </div>
                            ) : (
                              <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11px] text-stone-500 font-medium">
                                  Update Status:
                                </span>

                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={actionLoadingId === (b.id || b.referenceId) || b.status === 'Confirmed'}
                                    onClick={() =>
                                      handleStatusChange(b.id || b.referenceId, 'Confirmed', b)
                                    }
                                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all ${
                                      b.status === 'Confirmed'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 opacity-60 cursor-not-allowed pointer-events-none'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                                    }`}
                                    title={b.status === 'Confirmed' ? 'Current Status: Confirmed' : 'Confirm reservation and notify customer on WhatsApp'}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{b.status === 'Confirmed' ? '✓ Confirmed' : 'Confirm'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={actionLoadingId === (b.id || b.referenceId) || b.status === 'Completed'}
                                    onClick={() =>
                                      handleStatusChange(b.id || b.referenceId, 'Completed', b)
                                    }
                                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all ${
                                      b.status === 'Completed'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-300 opacity-60 cursor-not-allowed pointer-events-none'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                                    }`}
                                    title={b.status === 'Completed' ? 'Current Status: Completed' : 'Mark completed'}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{b.status === 'Completed' ? '✓ Completed' : 'Complete'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={actionLoadingId === (b.id || b.referenceId) || b.status === 'Pending'}
                                    onClick={() =>
                                      handleStatusChange(b.id || b.referenceId, 'Pending', b)
                                    }
                                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                                      b.status === 'Pending'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300 opacity-60 cursor-not-allowed pointer-events-none'
                                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 cursor-pointer active:scale-95'
                                    }`}
                                    title={b.status === 'Pending' ? 'Current Status: Pending' : 'Mark pending review'}
                                  >
                                    <span>{b.status === 'Pending' ? '● Pending' : 'Pending'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={actionLoadingId === (b.id || b.referenceId) || b.status === 'Cancelled'}
                                    onClick={() =>
                                      handleStatusChange(b.id || b.referenceId, 'Cancelled', b)
                                    }
                                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                                      b.status === 'Cancelled'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-300 opacity-60 cursor-not-allowed pointer-events-none'
                                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer active:scale-95'
                                    }`}
                                    title={b.status === 'Cancelled' ? 'Current Status: Cancelled' : 'Cancel reservation'}
                                  >
                                    <span>{b.status === 'Cancelled' ? '✕ Cancelled' : 'Cancel'}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 3: ALL INQUIRIES UNIFIED VIEW                        */}
              {/* ======================================================== */}
              {activeTab === 'all-inquiries' && (
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
                        placeholder="Search all records by customer name, phone, ref #, dish, notes..."
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

                    {/* Status Filter & Service Filter */}
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
                        <option value="Food">Food Orders & Delivery</option>
                        <option value="Dine-In">Dine-In Table</option>
                        <option value="Takeaway">Takeaway / Parcel</option>
                        <option value="Gathering">Party / Gathering</option>
                        <option value="Dietary">Jain / Dietary</option>
                      </select>
                    </div>
                  </div>

                  {/* All Inquiries List Cards */}
                  {filteredAllInquiries.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                        <Utensils className="w-6 h-6" />
                      </div>
                      <h5 className="font-bold text-stone-800 text-base">No records found</h5>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        {searchQuery || statusFilter !== 'all' || serviceFilter !== 'all'
                          ? 'No inquiries match your criteria.'
                          : 'No inquiries have been registered yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {filteredAllInquiries.map((b) => {
                        const isActionBusy = actionLoadingId === (b.id || b.referenceId);

                        let badgeColor =
                          'bg-amber-100 text-amber-900 border-amber-200';
                        if (b.status === 'Confirmed')
                          badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                        if (b.status === 'Completed' || b.status === 'Delivered')
                          badgeColor = 'bg-blue-100 text-blue-900 border-blue-300';
                        if (b.status === 'Preparing')
                          badgeColor = 'bg-orange-100 text-orange-900 border-orange-300';
                        if (b.status === 'Out for Delivery')
                          badgeColor = 'bg-indigo-100 text-indigo-900 border-indigo-300';
                        if (b.status === 'Cancelled')
                          badgeColor = 'bg-stone-100 text-stone-600 border-stone-200';

                        return (
                          <div
                            key={b.id || b.referenceId}
                            className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:border-emerald-300 transition-all space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-stone-900 text-amber-400 font-mono font-bold text-xs">
                                  #{b.referenceId}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 text-[11px] font-bold border border-stone-200">
                                  {b.serviceType}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${badgeColor}`}
                                >
                                  {b.status}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => sendWhatsAppUpdate(b)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1"
                                >
                                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-700" />
                                  <span className="hidden sm:inline">WhatsApp</span>
                                </button>
                                <a
                                  href={`tel:${b.userPhone}`}
                                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1"
                                >
                                  <Phone className="w-3.5 h-3.5 text-stone-600" />
                                  <span className="hidden sm:inline">Call</span>
                                </a>
                                <button
                                  type="button"
                                  disabled={isActionBusy}
                                  onClick={() => handleDeleteBooking(b)}
                                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                  Customer
                                </span>
                                <div className="font-bold text-stone-900">{b.userName}</div>
                                <div className="text-stone-600 font-mono">{b.userPhone}</div>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                  Requirements & Time
                                </span>
                                <div className="font-semibold text-emerald-800">{b.guests}</div>
                                <div className="text-stone-600">{b.timeSlot}</div>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                  Details
                                </span>
                                <div className="font-medium text-amber-900">{b.customDish || 'No specific dish'}</div>
                                <div className="text-stone-500 italic truncate max-w-[200px]">{b.notes || 'No notes'}</div>
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

                    {/* WhatsApp Notification Toggle */}
                    <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <WhatsAppIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-emerald-950">
                            Notify Customer on WhatsApp
                          </p>
                          <p className="text-[11px] text-emerald-800">
                            Automatically open and dispatch booking confirmation message to customer upon creation.
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={sendWhatsAppOnCreate}
                        onChange={(e) => setSendWhatsAppOnCreate(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-600"
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
