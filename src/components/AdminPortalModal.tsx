import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToAllBookingsAdmin,
  updateBookingStatusAdmin,
  deleteBookingAdmin,
  createBookingFromAdmin,
  verifyDeliveryOtpAdmin,
  regenerateDeliveryOtpAdmin,
  markOtpSentAdmin,
  testFirestoreLiveConnection,
  syncAllLocalBookingsToFirestore,
  forceRefreshAdminBookingsFromFirestore,
  purgeLocalAdminCache,
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
  shouldTriggerWhatsAppForStatus,
  triggerDeliveryArrivalWhatsApp,
  formatDeliveryBoyArrivalWhatsAppOtp,
} from '../services/whatsappService';
import {
  triggerDeliveryArrivalSms,
  formatDeliveryBoyArrivalSms,
} from '../services/smsService';
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
  Printer,
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
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 200);
  } catch (err) {
    console.error('Error opening WhatsApp (page preserved, no reload):', err);
  }
  return true;
};

/**
 * Helper to extract Address from notes strictly without order details
 */
export const extractDeliveryAddress = (notes?: string): string | null => {
  if (!notes || typeof notes !== 'string') return null;
  const raw = notes.trim();
  if (!raw) return null;

  // Split lines by newline or pipe delimiter
  const lines = raw.split(/\r?\n|\|/).map((l) => l.trim()).filter(Boolean);

  // 1. Look for explicit Delivery Address / Address line
  const explicitAddrLine = lines.find((l) =>
    /^(delivery\s*address|address)\s*:/i.test(l)
  );

  if (explicitAddrLine) {
    const cleaned = explicitAddrLine.replace(/^(delivery\s*address|address)\s*:\s*/i, '').trim();
    if (cleaned) return cleaned;
  }

  // 2. Look for regex match on single line
  const addrMatch = raw.match(/delivery\s*address:\s*([^\r\n|]+)/i);
  if (addrMatch && addrMatch[1]?.trim()) {
    return addrMatch[1].trim();
  }

  const generalAddrMatch = raw.match(/address:\s*([^\r\n|]+)/i);
  if (generalAddrMatch && generalAddrMatch[1]?.trim()) {
    return generalAddrMatch[1].trim();
  }

  // 3. Fallback: Check lines for physical location keywords while excluding order metadata
  const metadataKeywords = [
    'order type:',
    'food category:',
    'category:',
    'items:',
    'subtotal:',
    'delivery:',
    'grand total:',
    'total:',
    'payment:',
    'instructions:',
    'instruction:',
    'special instructions:',
    'kot:',
    'rider:',
    'otp:',
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    const isMetadata = metadataKeywords.some((prefix) => lower.startsWith(prefix));
    if (!isMetadata) {
      if (
        lower.includes('flat') ||
        lower.includes('room') ||
        lower.includes('bldg') ||
        lower.includes('building') ||
        lower.includes('plot') ||
        lower.includes('house') ||
        lower.includes('road') ||
        lower.includes('nagar') ||
        lower.includes('colony') ||
        lower.includes('apartment') ||
        lower.includes('apt') ||
        lower.includes('sector') ||
        lower.includes('gali') ||
        lower.includes('chowk') ||
        lower.includes('lane') ||
        lower.includes('near') ||
        lower.includes('behind') ||
        lower.includes('opposite') ||
        lower.includes('opp.') ||
        lower.includes('cross') ||
        lower.includes('society')
      ) {
        return line.replace(/^(address|delivery address)\s*:\s*/i, '').trim();
      }
    }
  }

  return null;
};

/**
 * Helper to extract cooking notes / instructions without metadata or address
 */
export const extractCookingNotes = (notes?: string): string | null => {
  if (!notes || typeof notes !== 'string') return null;
  const lines = notes.split(/\r?\n|\|/).map((l) => l.trim()).filter(Boolean);

  const instrLine = lines.find((l) =>
    /^(instructions|instruction|special\s*instructions|cooking\s*notes|note|cooking\s*note)\s*:/i.test(l)
  );

  if (instrLine) {
    const cleaned = instrLine
      .replace(/^(instructions|instruction|special\s*instructions|cooking\s*notes|note|cooking\s*note)\s*:\s*/i, '')
      .trim();
    if (cleaned) return cleaned;
  }

  const metadataKeywords = [
    'order type:',
    'delivery address:',
    'address:',
    'food category:',
    'category:',
    'items:',
    'subtotal:',
    'delivery fee:',
    'grand total:',
    'total:',
    'payment:',
    'kot:',
    'otp:',
  ];

  const candidate = lines.find((l) => {
    const lower = l.toLowerCase();
    return (
      !metadataKeywords.some((prefix) => lower.startsWith(prefix)) &&
      !lower.includes('flat') &&
      !lower.includes('nagar') &&
      !lower.includes('bldg') &&
      !lower.includes('road') &&
      !lower.includes('apartment') &&
      !lower.includes('society') &&
      !lower.includes('colony')
    );
  });

  return candidate || null;
};

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({ isOpen, onClose }) => {
  const { user, userProfile, isAdmin, signInAdminDirect, signInWithGoogle, logout } = useAuth();

  // Login form states for unauthenticated admin (pre-filled with official admin email)
  const [emailInput, setEmailInput] = useState(ADMIN_EMAIL);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sync email input if empty when opening modal
  useEffect(() => {
    if (isOpen && !emailInput) {
      setEmailInput(ADMIN_EMAIL);
    }
  }, [isOpen]);

  // Admin Dashboard views & data
  const [activeTab, setActiveTab] = useState<'orders' | 'bookings' | 'all-inquiries' | 'users' | 'add-booking' | 'metrics'>('orders');
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
  const [viewingKitchenSlipOrder, setViewingKitchenSlipOrder] = useState<BookingInquiry | null>(null);

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

  // Delivery Confirmation OTP Verification Modal State
  const [otpVerifyTarget, setOtpVerifyTarget] = useState<BookingInquiry | null>(null);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpVerifyError, setOtpVerifyError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [whatsappOtpToast, setWhatsappOtpToast] = useState<{ message: string; phone: string; otp: string } | null>(null);
  const [isSendingArrivalOtp, setIsSendingArrivalOtp] = useState<string | null>(null);

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
  const [sendWhatsAppOnCreate, setSendWhatsAppOnCreate] = useState<boolean>(false);
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

  const handleForceRefreshCloud = async () => {
    setIsLoadingBookings(true);
    setSyncFeedback(null);
    try {
      const freshList = await forceRefreshAdminBookingsFromFirestore();
      setBookings(freshList);
      await runCloudHealthCheck();
      setSyncFeedback(`Real-time Cloud Sync complete! Retrieved ${freshList.length} orders directly from Firestore.`);
    } catch (err: any) {
      console.warn('Cloud refresh note:', err);
      setSyncFeedback(`Cloud fetch note: ${err.message || 'Updated from cloud'}`);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const handlePurgeLocalCache = async () => {
    if (!window.confirm('Are you sure you want to purge local device cache? All live bookings will be re-downloaded directly from Cloud Firestore to ensure 100% device match.')) {
      return;
    }
    setIsLoadingBookings(true);
    try {
      purgeLocalAdminCache();
      const freshList = await forceRefreshAdminBookingsFromFirestore();
      setBookings(freshList);
      setSyncFeedback(`Local cache cleared! Downloaded ${freshList.length} genuine Cloud Firestore records.`);
    } catch (err: any) {
      setSyncFeedback(`Cache purge note: ${err.message}`);
    } finally {
      setIsLoadingBookings(false);
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
  // Only sent on Order Confirmation and Delivery Confirmation per user specification
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

    // Rule: Once status is marked as Delivered or Completed, it cannot be changed
    if (
      targetBooking &&
      (targetBooking.status === 'Delivered' || targetBooking.status === 'Completed') &&
      newSt !== targetBooking.status
    ) {
      alert(
        `Status cannot be changed: Order #${targetBooking.referenceId} has already been marked as ${targetBooking.status} and is finalized.`
      );
      return;
    }

    // Rule: Once a status is set, it cannot be clicked again for the same status
    if (targetBooking && targetBooking.status === newSt) {
      return;
    }

    // Check if status qualifies for WhatsApp (Only Order Confirmation and Delivery Confirmation)
    const shouldSendWhatsApp = shouldTriggerWhatsAppForStatus(newSt);

    // 1. Prepare message and trigger WhatsApp only for confirmation and delivery
    let generatedMessage = '';
    if (targetBooking && shouldSendWhatsApp) {
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

      if (targetBooking && shouldSendWhatsApp) {
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

  // OTP Verification & Delivery Confirmation Handler
  const handleVerifyOtpSubmit = async (forceOverride: boolean = false) => {
    if (!otpVerifyTarget) return;
    setIsVerifyingOtp(true);
    setOtpVerifyError(null);

    const bookingId = otpVerifyTarget.id || otpVerifyTarget.referenceId;

    try {
      const res = await verifyDeliveryOtpAdmin(bookingId, enteredOtp, forceOverride);

      if (!res.success) {
        setOtpVerifyError(res.message);
        setIsVerifyingOtp(false);
        return;
      }

      // Prepare updated booking object with paymentStatus Paid for COD/completed orders
      const updatedBooking: BookingInquiry = res.booking || {
        ...otpVerifyTarget,
        status: 'Delivered',
        otpVerified: true,
        paymentStatus: 'Paid',
        paymentMethod: otpVerifyTarget.paymentMethod || 'Cash on Delivery',
        paymentPaidAt: new Date().toISOString(),
      };

      // Immediately update local React state so "PAID" badge and Delivered status show right away
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId || b.referenceId === bookingId ? updatedBooking : b))
      );

      // Trigger WhatsApp Delivery Confirmation message
      const deliveryMsg = formatStatusWhatsAppMessage(updatedBooking, 'Delivered');

      if (autoWhatsAppOnStatus && updatedBooking.userPhone) {
        openWhatsAppDirect(updatedBooking.userPhone, deliveryMsg);
      }

      await sendWhatsAppDirectInBackground(updatedBooking, 'Delivered');

      // Set alert banner
      setLastWhatsAppAlert({
        bookingId: updatedBooking.id || updatedBooking.referenceId,
        referenceId: updatedBooking.referenceId,
        customerName: updatedBooking.userName || 'Customer',
        customerPhone: updatedBooking.userPhone || '',
        newStatus: 'Delivered',
        messageText: deliveryMsg,
        dispatched: true,
        timestamp: Date.now(),
      });

      // Close modal
      setOtpVerifyTarget(null);
      setEnteredOtp('');
      setOtpVerifyError(null);
    } catch (err: any) {
      setOtpVerifyError(err?.message || 'Failed to verify delivery OTP.');
    } finally {
      setIsVerifyingOtp(false);
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

  // Send WhatsApp OTP on Delivery Boy Arrival (Guarantees different OTP on resend)
  const handleSendArrivalWhatsApp = async (order: BookingInquiry, forceResend: boolean = false) => {
    if (!order.deliveryOtp) {
      alert('No delivery confirmation OTP is available for this order.');
      return;
    }

    const orderId = order.id || order.referenceId;
    setIsSendingArrivalOtp(orderId);

    try {
      const isResend = forceResend || Boolean(order.otpSentCount && order.otpSentCount > 0);
      let targetOrder: BookingInquiry = order;

      if (isResend) {
        // Regenerate a guaranteed DIFFERENT OTP on resend & update in local store & Firestore
        const resGen = await regenerateDeliveryOtpAdmin(orderId);
        if (resGen.updatedBooking) {
          targetOrder = resGen.updatedBooking;
        } else {
          targetOrder = {
            ...order,
            deliveryOtp: resGen.newOtp,
            otpSentCount: (order.otpSentCount || 1) + 1,
            otpLastSentAt: new Date().toISOString(),
          };
        }

        // If the OTP verification modal is open for this order, immediately update its state to the new OTP!
        if (otpVerifyTarget && (otpVerifyTarget.id === order.id || otpVerifyTarget.referenceId === order.referenceId)) {
          setOtpVerifyTarget(targetOrder);
          setEnteredOtp('');
          setOtpVerifyError(null);
        }
      } else {
        await markOtpSentAdmin(orderId);
        targetOrder = {
          ...order,
          otpSentCount: 1,
          otpLastSentAt: new Date().toISOString(),
        };
      }

      const res = await triggerDeliveryArrivalWhatsApp(targetOrder);
      setWhatsappOtpToast({
        message: isResend
          ? `🔄 New Doorstep OTP (${targetOrder.deliveryOtp}) generated & resent to customer via WhatsApp!`
          : res.message,
        phone: targetOrder.userPhone,
        otp: targetOrder.deliveryOtp || '',
      });
      setTimeout(() => setWhatsappOtpToast(null), 6000);

      // Immediately update local React state
      setBookings((prev) =>
        prev.map((b) => (b.id === orderId || b.referenceId === orderId ? targetOrder : b))
      );
    } catch (err: any) {
      alert(`Error dispatching arrival WhatsApp OTP: ${err.message}`);
    } finally {
      setIsSendingArrivalOtp(null);
    }
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

      // Dispatch WhatsApp message strictly only if status is Delivered
      if (sendWhatsAppOnCreate && created.userPhone && (newStatus === 'Delivered' || newStatus === 'Completed')) {
        const msg = formatStatusWhatsAppMessage(created, newStatus, created.notes);
        openWhatsAppDirect(created.userPhone, msg);
        await sendWhatsAppDirectInBackground(created, newStatus, created.notes);
      }

      setCreateSuccessMsg(
        `Booking #${created.referenceId} for ${created.userName} registered with status "${newStatus}"!`
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
    kot += `  ${RESTAURANT_INFO.name.toUpperCase()} - KITCHEN ORDER TICKET\n`;
    kot += `=====================================\n`;
    kot += `Order Ref: #${order.referenceId}\n`;
    kot += `Type: ${isTakeaway ? '🥡 TAKEAWAY (PARCEL)' : '🛵 HOME DELIVERY'}\n`;
    kot += `Order Placed Time: ${new Date(order.createdAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}, ${new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}\n`;
    kot += `Delivery / Pickup Slot: ${order.timeSlot}\n`;
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
    const paymentMode =
      order.paymentMethod === 'Cash on Delivery'
        ? 'CASH ON DELIVERY (COD)'
        : order.paymentMethod === 'Cash'
        ? 'CASH'
        : order.paymentAppUsed
        ? `UPI (${order.paymentAppUsed.toUpperCase()})`
        : order.paymentStatus === 'Paid'
        ? 'ONLINE UPI'
        : order.paymentMethod || 'PAY ON DELIVERY / COUNTER';

    kot += `MODE OF PAYMENT: ${paymentMode}\n`;
    if (order.paymentStatus === 'Paid') {
      if (order.paymentUtr) {
        kot += `UPI REF/UTR: ${order.paymentUtr}\n`;
      }
      kot += `PAYEE: ${RESTAURANT_INFO.name}\n`;
    }
    kot += `-------------------------------------\n`;
    kot += `BILL TOTAL: ${order.guests || 'N/A'}\n`;
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
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter manager password or PIN"
                      autoComplete="current-password"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 pr-10"
                    />
                    <button
                      type="button"
                      id="admin-password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-800 p-1.5 rounded-lg hover:bg-stone-200/60 transition-colors z-10 cursor-pointer flex items-center justify-center"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    id="admin-submit-login-btn"
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

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-stone-200"></div>
                    <span className="flex-shrink mx-3 text-[11px] text-stone-400 font-medium uppercase">Or</span>
                    <div className="flex-grow border-t border-stone-200"></div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsLoggingIn(true);
                        setLoginError(null);
                        await signInWithGoogle();
                      } catch (err: any) {
                        console.error('Google sign-in error:', err);
                        setLoginError(err.message || 'Google sign-in failed');
                      } finally {
                        setIsLoggingIn(false);
                      }
                    }}
                    className="w-full py-3 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 active:scale-98 text-stone-700 font-bold text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-2xs"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google (Parvati Yadav)</span>
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
            <div className="p-3 sm:p-4 md:p-5 bg-white border-b border-stone-200 space-y-3 sm:space-y-4 shrink-0">
              {/* KPIs dynamically adjusted by active tab with smooth horizontal sliding across mobile, tablet and desktop */}
              {activeTab === 'orders' ? (
                <div className="flex overflow-x-auto pb-1.5 gap-2 sm:gap-2.5 no-scrollbar scroll-smooth w-full select-none xl:grid xl:grid-cols-6">
                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-emerald-600" />
                      Total Orders
                    </span>
                    <span className="text-xl font-extrabold text-emerald-950">{orderTotalCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-800 font-semibold">Pending Review</span>
                      {orderPendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </div>
                    <span className="text-xl font-extrabold text-amber-900">{orderPendingCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <span className="text-[11px] text-emerald-800 font-semibold">Confirmed</span>
                    <span className="text-xl font-extrabold text-emerald-900">{orderConfirmedCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-orange-800 font-semibold flex items-center gap-1">
                        <ChefHat className="w-3 h-3 text-orange-600" />
                        In Kitchen
                      </span>
                      {orderPreparingCount > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />}
                    </div>
                    <span className="text-xl font-extrabold text-orange-900">{orderPreparingCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <span className="text-[11px] text-indigo-800 font-semibold flex items-center gap-1">
                      <Bike className="w-3 h-3 text-indigo-600" />
                      On Delivery
                    </span>
                    <span className="text-xl font-extrabold text-indigo-900">{orderOutForDeliveryCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <span className="text-[11px] text-teal-800 font-semibold">Delivered / Done</span>
                    <span className="text-xl font-extrabold text-teal-900">{orderDeliveredCount}</span>
                  </div>
                </div>
              ) : activeTab === 'bookings' ? (
                <div className="flex overflow-x-auto pb-1.5 gap-2 sm:gap-2.5 no-scrollbar scroll-smooth w-full select-none xl:grid xl:grid-cols-5">
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <span className="text-[11px] text-stone-500 font-semibold">Table Bookings</span>
                    <span className="text-xl font-extrabold text-stone-900">{tableTotalCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-800 font-semibold">Pending Review</span>
                      {tablePendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </div>
                    <span className="text-xl font-extrabold text-amber-900">{tablePendingCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <span className="text-[11px] text-emerald-800 font-semibold">Confirmed Tables</span>
                    <span className="text-xl font-extrabold text-emerald-900">{tableConfirmedCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <span className="text-[11px] text-blue-800 font-semibold">Completed Dine-in</span>
                    <span className="text-xl font-extrabold text-blue-900">{tableCompletedCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <span className="text-[11px] text-rose-700 font-semibold">Cancelled</span>
                    <span className="text-xl font-extrabold text-rose-800">{tableCancelledCount}</span>
                  </div>
                </div>
              ) : (
                <div className="flex overflow-x-auto pb-1.5 gap-2 sm:gap-2.5 no-scrollbar scroll-smooth w-full select-none xl:grid xl:grid-cols-5">
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <span className="text-[11px] text-stone-500 font-semibold">Total Inquiries</span>
                    <span className="text-xl font-extrabold text-stone-900">{totalCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-800 font-semibold">Pending Action</span>
                      {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                    </div>
                    <span className="text-xl font-extrabold text-amber-900">{pendingCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <span className="text-[11px] text-emerald-800 font-semibold">Confirmed</span>
                    <span className="text-xl font-extrabold text-emerald-900">{confirmedCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <span className="text-[11px] text-blue-800 font-semibold">Completed / Done</span>
                    <span className="text-xl font-extrabold text-blue-900">{completedCount}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col shrink-0 min-w-[140px] sm:min-w-[160px] flex-1">
                    <span className="text-[11px] text-rose-700 font-semibold">Cancelled</span>
                    <span className="text-xl font-extrabold text-rose-800">{cancelledCount}</span>
                  </div>
                </div>
              )}

              {/* Navigation Tabs with smooth touch sliding across mobile and tablet */}
              <div className="w-full pt-1">
                <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200 overflow-x-auto no-scrollbar scroll-smooth w-full select-none">
                  {/* Tab: Food Orders (Dedicated) */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                    className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                    className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                    className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                    className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      activeTab === 'add-booking'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ New Entry</span>
                  </button>

                  {/* Tab: Analytics */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('metrics')}
                    className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      activeTab === 'metrics'
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Analytics</span>
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
                  {/* WhatsApp Arrival OTP Toast Notification */}
                  {whatsappOtpToast && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 text-white shadow-lg border border-emerald-500/50 animate-in fade-in flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                          <WhatsAppIcon className="w-4 h-4 fill-current" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-300 block flex items-center gap-1.5">
                            <span>{whatsappOtpToast.message || '🛵 Delivery Boy Arrival WhatsApp OTP Dispatched!'}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          </span>
                          <p className="text-[11px] text-stone-300">
                            Sent to <strong className="text-white">{whatsappOtpToast.phone}</strong> • Doorstep OTP: <span className="font-mono font-bold text-emerald-300 bg-black/40 px-1.5 py-0.5 rounded border border-emerald-500/40">{whatsappOtpToast.otp}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWhatsappOtpToast(null)}
                        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 text-xs flex items-center justify-center cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

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

                                {/* Payment Status Badge */}
                                {order.paymentStatus === 'Paid' ? (
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full border text-[11px] font-extrabold flex items-center gap-1 ${
                                      order.paymentMethod === 'Cash on Delivery'
                                        ? 'border-emerald-300 bg-emerald-100 text-emerald-950'
                                        : 'border-blue-300 bg-blue-100 text-blue-900'
                                    }`}
                                    title={
                                      order.paymentMethod === 'Cash on Delivery'
                                        ? `Cash on Delivery collected by rider upon doorstep OTP delivery • Status: Paid${order.paymentPaidAt ? ` at ${new Date(order.paymentPaidAt).toLocaleTimeString('en-IN')}` : ''}`
                                        : `Paid via ${order.paymentAppUsed || 'UPI'} • UTR: ${order.paymentUtr || 'Recorded'} • Payee: ${order.paymentPayee || 'PARVATI DEVI'}`
                                    }
                                  >
                                    <ShieldCheck className={`w-3 h-3 ${order.paymentMethod === 'Cash on Delivery' ? 'text-emerald-700' : 'text-blue-700'}`} />
                                    <span>
                                      {order.paymentMethod === 'Cash on Delivery'
                                        ? `PAID (COD Collected${order.paymentAmount ? `: ₹${order.paymentAmount}` : ''})`
                                        : `PAID ${order.paymentAmount ? `₹${order.paymentAmount}` : ''}`}
                                    </span>
                                    {order.paymentUtr && (
                                      <span className="font-mono font-semibold text-[10px] text-blue-800">
                                        ({order.paymentUtr})
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900 text-[10px] font-bold flex items-center gap-1">
                                    <span>{order.paymentMethod === 'Cash on Delivery' ? '💵 COD (Pay on Arrival)' : '🟡 Payment Pending'}</span>
                                  </span>
                                )}

                                <span className="text-[11px] text-stone-600 font-semibold flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>
                                    {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true,
                                    })}, {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                    })}
                                  </span>
                                </span>
                              </div>

                              {/* Quick Action Tools */}
                              <div className="flex items-center gap-1.5">
                                {/* Kitchen Ticket (KOT) */}
                                <button
                                  type="button"
                                  onClick={() => setViewingKitchenSlipOrder(order)}
                                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View and print Kitchen Slip (KOT)"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-stone-600" />
                                  <span>Kitchen Slip</span>
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
                                <div className="pt-1.5 space-y-1 text-stone-600">
                                  <div className="flex items-center gap-1.5 text-stone-800 font-medium">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Placed: <strong>{new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}, {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-stone-600">
                                    <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                    <span>Slot: <strong>{order.timeSlot}</strong></span>
                                  </div>
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

                            {/* Order Card Bottom: Comprehensive Status Pipeline Update Buttons or Locked Banner */}
                            {order.status === 'Delivered' || order.status === 'Completed' ? (
                              <div className="pt-2.5 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                                    <Lock className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                                      <span>Order Delivered to Customer</span>
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                                        Status Locked 🔒
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-emerald-800/90">
                                      Order handed over to customer.
                                      {order.paymentMethod === 'Cash on Delivery'
                                        ? ' 💵 Cash collected by rider on delivery • Payment marked as DONE (Paid).'
                                        : ' Payment verified & finalized.'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-bold bg-white/90 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>Delivered &amp; Finalized</span>
                                </div>
                              </div>
                            ) : (
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

                                  {/* Rider Arrival WhatsApp OTP Button */}
                                  {!isTakeaway && order.deliveryOtp && order.status !== 'Delivered' && order.status !== 'Completed' && order.status !== 'Cancelled' && (
                                    <button
                                      type="button"
                                      disabled={isSendingArrivalOtp === (order.id || order.referenceId)}
                                      onClick={() => handleSendArrivalWhatsApp(order, Boolean(order.otpSentCount && order.otpSentCount > 0))}
                                      className={`px-3 py-1 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer border disabled:opacity-60 ${
                                        order.otpSentCount && order.otpSentCount > 0
                                          ? 'bg-amber-600 hover:bg-amber-700 border-amber-500'
                                          : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500'
                                      }`}
                                      title={
                                        order.otpSentCount && order.otpSentCount > 0
                                          ? `Resend a new different doorstep WhatsApp OTP to customer (Sent ${order.otpSentCount} time${order.otpSentCount > 1 ? 's' : ''})`
                                          : `Send doorstep WhatsApp OTP (${order.deliveryOtp}) directly to customer on delivery boy arrival`
                                      }
                                    >
                                      {isSendingArrivalOtp === (order.id || order.referenceId) ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      ) : (
                                        <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                                      )}
                                      <span>
                                        {isSendingArrivalOtp === (order.id || order.referenceId)
                                          ? 'Sending OTP...'
                                          : order.otpSentCount && order.otpSentCount > 0
                                          ? '🔄 Resend WhatsApp OTP'
                                          : '🛵 Send WhatsApp OTP'}
                                      </span>
                                    </button>
                                  )}

                                  {/* 5. Delivered / OTP Verification */}
                                  <button
                                    type="button"
                                    disabled={isActionBusy || order.status === 'Delivered' || order.status === 'Completed'}
                                    onClick={() => {
                                      if (order.deliveryOtp && !order.otpVerified && order.status !== 'Delivered') {
                                        setOtpVerifyTarget(order);
                                        setEnteredOtp('');
                                        setOtpVerifyError(null);
                                      } else {
                                        handleStatusChange(order.id || order.referenceId, 'Delivered', order);
                                      }
                                    }}
                                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all ${
                                      order.status === 'Delivered' || order.status === 'Completed'
                                        ? 'bg-teal-100 text-teal-900 border border-teal-300 opacity-60 cursor-not-allowed pointer-events-none'
                                        : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer active:scale-95'
                                    }`}
                                    title="Verify Customer Delivery OTP and mark as Delivered"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>
                                      {order.status === 'Delivered' || order.status === 'Completed'
                                        ? '✅ Delivered'
                                        : order.deliveryOtp
                                        ? '🔐 Verify OTP & Deliver'
                                        : 'Delivered'}
                                    </span>
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
                            )}
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
                                <span className="text-[11px] text-stone-600 font-semibold flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>
                                    {new Date(b.createdAt).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true,
                                    })}, {new Date(b.createdAt).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                    })}
                                  </span>
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
                                <div className="text-stone-700 flex items-center gap-1.5 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                  <span>Reserved Slot: <strong>{b.timeSlot}</strong></span>
                                </div>
                                <div className="text-stone-500 flex items-center gap-1.5 text-[11px]">
                                  <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                  <span>Booked: <strong>{new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}, {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong></span>
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
                            Notify Customer on WhatsApp (Delivered Status Only)
                          </p>
                          <p className="text-[11px] text-emerald-800">
                            WhatsApp message is only dispatched if status is set to Delivered.
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

        {/* ======================================================== */}
        {/* OTP VERIFICATION MODAL FOR DELIVERY CONFIRMATION         */}
        {/* ======================================================== */}
        {otpVerifyTarget && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center text-xl font-bold shadow-xs">
                    🔐
                  </div>
                  <div>
                    <h4 className="font-extrabold text-stone-900 text-base">Verify Delivery OTP</h4>
                    <p className="text-xs text-stone-500">Order #{otpVerifyTarget.referenceId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpVerifyTarget(null);
                    setEnteredOtp('');
                    setOtpVerifyError(null);
                  }}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500">Customer:</span>
                  <span className="font-bold text-stone-900">{otpVerifyTarget.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Phone:</span>
                  <span className="font-mono font-semibold text-stone-800">{otpVerifyTarget.userPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Order Amount:</span>
                  <span className="font-extrabold text-emerald-800">{otpVerifyTarget.guests}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-stone-200/60">
                  <span className="text-stone-500">Payment Mode:</span>
                  <span className="font-bold text-xs">
                    {otpVerifyTarget.paymentMethod === 'Cash on Delivery' || otpVerifyTarget.paymentStatus !== 'Paid' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px] inline-flex items-center gap-1">
                        💵 Cash on Delivery (Collect {otpVerifyTarget.guests || 'Payment'})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-extrabold text-[11px] inline-flex items-center gap-1">
                        ✓ Paid via UPI Online
                      </span>
                    )}
                  </span>
                </div>
                {(otpVerifyTarget.paymentMethod === 'Cash on Delivery' || otpVerifyTarget.paymentStatus !== 'Paid') && (
                  <div className="p-2 mt-1 rounded-xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                    <span>💵</span>
                    <span>
                      Collect cash payment from customer. As soon as you verify the delivery OTP, payment will automatically be updated to <strong>PAID</strong>.
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Enter 4-Digit Customer OTP:
                  </label>
                  <button
                    type="button"
                    disabled={isSendingArrivalOtp === (otpVerifyTarget.id || otpVerifyTarget.referenceId)}
                    onClick={() => handleSendArrivalWhatsApp(otpVerifyTarget, true)}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-colors"
                    title="Resend a new different 4-digit OTP to customer on WhatsApp"
                  >
                    {isSendingArrivalOtp === (otpVerifyTarget.id || otpVerifyTarget.referenceId) ? (
                      <div className="w-3 h-3 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                    ) : (
                      <WhatsAppIcon className="w-3.5 h-3.5 fill-current text-emerald-600" />
                    )}
                    <span>
                      {isSendingArrivalOtp === (otpVerifyTarget.id || otpVerifyTarget.referenceId)
                        ? 'Sending OTP...'
                        : otpVerifyTarget.otpSentCount && otpVerifyTarget.otpSentCount > 0
                        ? '🔄 Resend OTP to Customer'
                        : '🛵 Send OTP to Customer'}
                    </span>
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => {
                    setEnteredOtp(e.target.value);
                    if (otpVerifyError) setOtpVerifyError(null);
                  }}
                  placeholder="e.g. 4821"
                  className="w-full text-center text-2xl tracking-widest font-mono font-black px-4 py-3 rounded-2xl border-2 border-stone-300 focus:border-amber-500 focus:outline-none bg-stone-50 focus:bg-white"
                  autoFocus
                />
                <p className="text-[11px] text-stone-500 text-center">
                  Ask customer for the 4-digit verification code received on their WhatsApp.
                </p>
                {otpVerifyError && (
                  <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {otpVerifyError}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  disabled={isVerifyingOtp || !enteredOtp.trim()}
                  onClick={() => handleVerifyOtpSubmit(false)}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isVerifyingOtp ? 'Verifying OTP...' : 'Verify OTP & Complete Delivery'}</span>
                </button>

                <button
                  type="button"
                  disabled={isVerifyingOtp}
                  onClick={() => handleVerifyOtpSubmit(true)}
                  className="w-full py-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
                  title="Override OTP if customer is unable to check SMS/WhatsApp"
                >
                  Rider Override (Customer Phone Unreachable)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* KITCHEN ORDER TICKET (KOT) / SLIP MODAL                  */}
        {/* ======================================================== */}
        {viewingKitchenSlipOrder && (
          <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[92vh] flex flex-col text-stone-900">
              {/* Slip Modal Header */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold shadow-xs">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-stone-900 text-base">Kitchen Slip (KOT)</h4>
                    <p className="text-xs text-stone-500">Order #{viewingKitchenSlipOrder.referenceId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingKitchenSlipOrder(null)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Thermal Slip Styled Receipt Body */}
              <div
                id="printable-kitchen-slip"
                className="overflow-y-auto p-4 sm:p-5 rounded-2xl bg-stone-50 border-2 border-dashed border-stone-300 font-mono text-xs space-y-3 shadow-inner"
              >
                <div className="text-center pb-2 border-b border-dashed border-stone-400 space-y-1">
                  <div className="text-base font-black tracking-wider uppercase text-stone-900">
                    {RESTAURANT_INFO.name}
                  </div>
                  <div className="text-[11px] font-bold text-stone-600 uppercase">
                    *** KITCHEN ORDER TICKET (KOT) ***
                  </div>
                  <div className="text-[10px] text-stone-500">
                    {RESTAURANT_INFO.address.landmark}, {RESTAURANT_INFO.address.area} • Ph: {RESTAURANT_INFO.phone}
                  </div>
                </div>

                <div className="space-y-1 text-[11px] border-b border-dashed border-stone-400 pb-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">KOT REF:</span>
                    <span className="font-bold text-stone-900">#{viewingKitchenSlipOrder.referenceId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">ORDER TYPE:</span>
                    <span className="font-bold text-stone-900 uppercase">
                      {viewingKitchenSlipOrder.serviceType.toLowerCase().includes('takeaway')
                        ? '🥡 Takeaway (Parcel)'
                        : '🛵 Home Delivery'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">MODE OF PAYMENT:</span>
                    <span className="font-bold text-stone-900 uppercase">
                      {viewingKitchenSlipOrder.paymentMethod === 'Cash on Delivery'
                        ? 'Cash on Delivery (COD)'
                        : viewingKitchenSlipOrder.paymentMethod === 'Cash'
                        ? 'Cash'
                        : viewingKitchenSlipOrder.paymentAppUsed
                        ? `UPI (${viewingKitchenSlipOrder.paymentAppUsed.toUpperCase()})`
                        : viewingKitchenSlipOrder.paymentStatus === 'Paid'
                        ? 'Online UPI'
                        : viewingKitchenSlipOrder.paymentMethod || 'Pay on Delivery'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">ORDER PLACED TIME:</span>
                    <span className="font-bold text-stone-900">
                      {new Date(viewingKitchenSlipOrder.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}, {new Date(viewingKitchenSlipOrder.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">SLOT / ETA:</span>
                    <span className="font-bold text-stone-900">{viewingKitchenSlipOrder.timeSlot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">CUSTOMER:</span>
                    <span className="font-bold text-stone-900">
                      {viewingKitchenSlipOrder.userName} ({viewingKitchenSlipOrder.userPhone})
                    </span>
                  </div>
                  {!viewingKitchenSlipOrder.serviceType.toLowerCase().includes('takeaway') &&
                    extractDeliveryAddress(viewingKitchenSlipOrder.notes) && (
                      <div className="pt-1">
                        <span className="text-stone-500 block">DELIVER TO:</span>
                        <span className="font-bold text-stone-900 block pl-1">
                          {extractDeliveryAddress(viewingKitchenSlipOrder.notes)}
                        </span>
                      </div>
                    )}
                </div>

                {/* Items */}
                <div className="space-y-1.5 border-b border-dashed border-stone-400 pb-2">
                  <div className="font-bold text-stone-700 text-[11px] uppercase tracking-wide">
                    ITEMS TO PREPARE:
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200 text-stone-900 font-bold whitespace-pre-line text-xs">
                    {viewingKitchenSlipOrder.customDish || 'Standard Meal / Custom Order'}
                  </div>
                </div>

                {/* Cooking Instructions */}
                {extractCookingNotes(viewingKitchenSlipOrder.notes) && (
                  <div className="space-y-1 border-b border-dashed border-stone-400 pb-2">
                    <span className="font-bold text-amber-900 text-[10px] uppercase">
                      ⚠️ SPECIAL KITCHEN INSTRUCTIONS:
                    </span>
                    <p className="text-stone-800 font-semibold text-[11px] bg-amber-50 p-2 rounded border border-amber-200">
                      {extractCookingNotes(viewingKitchenSlipOrder.notes)}
                    </p>
                  </div>
                )}

                {/* Payment Breakdown with PAYEE */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-stone-400 pb-2">
                  {viewingKitchenSlipOrder.paymentUtr && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">UPI REF / UTR:</span>
                      <span className="font-mono font-bold text-stone-900">{viewingKitchenSlipOrder.paymentUtr}</span>
                    </div>
                  )}
                  <div className="flex justify-between bg-emerald-50/80 p-1.5 rounded border border-emerald-200">
                    <span className="text-emerald-950 font-bold">PAYEE NAME:</span>
                    <span className="font-black text-emerald-900 uppercase">{RESTAURANT_INFO.name}</span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-sm text-stone-900">
                    <span>BILL AMOUNT:</span>
                    <span className="text-emerald-700">{viewingKitchenSlipOrder.guests || 'N/A'}</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-stone-400 pt-1">
                  Thank You • Fresh Pure Veg Food from {RESTAURANT_INFO.name}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleCopyKOT(viewingKitchenSlipOrder);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Copy className="w-4 h-4 text-stone-600" />
                  <span>
                    {copiedKOTId === (viewingKitchenSlipOrder.id || viewingKitchenSlipOrder.referenceId)
                      ? 'KOT Copied! ✓'
                      : 'Copy KOT Slip'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingKitchenSlipOrder(null)}
                  className="px-4 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
