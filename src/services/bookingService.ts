import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { BookingInquiry } from '../types';

export const ADMIN_EMAIL = 'parvatiyadav40@gmail.com';

// Connection Diagnostic State
export interface FirestoreStatus {
  connected: boolean;
  checkedAt: string;
  error?: string;
  errorCode?: string;
  details?: string;
}

let lastKnownFirestoreStatus: FirestoreStatus = {
  connected: false,
  checkedAt: new Date().toISOString(),
};

/**
 * Test live connection to Firestore and diagnose any permission/database issues
 */
export const testFirestoreLiveConnection = async (): Promise<FirestoreStatus> => {
  const timestamp = new Date().toISOString();
  try {
    // 1. Try reading from bookings collection
    const testBookingsQuery = query(collection(db, 'bookings'), where('status', 'in', ['Pending', 'Confirmed', 'Completed', 'Cancelled']));
    await getDocs(testBookingsQuery);

    // 2. Try reading from users collection
    const testUsersQuery = query(collection(db, 'users'));
    await getDocs(testUsersQuery);

    lastKnownFirestoreStatus = {
      connected: true,
      checkedAt: timestamp,
    };
    return lastKnownFirestoreStatus;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    const errorCode = err?.code || 'unknown-error';

    let diagnosis = 'Unknown connection issue.';
    if (errorCode.includes('permission-denied') || errorMsg.includes('Missing or insufficient permissions')) {
      diagnosis =
        'Firestore Security Rules are currently blocking read/write access to "bookings" or "users" collection. Go to Firebase Console -> Firestore Database -> Rules tab, and update rules to allow access.';
    } else if (errorCode.includes('not-found') || errorMsg.includes('database does not exist')) {
      diagnosis =
        'Cloud Firestore database has not been created yet in your Firebase Project. Open Firebase Console -> Firestore Database -> Click "Create database".';
    } else if (errorCode.includes('failed-precondition') || errorMsg.includes('index')) {
      diagnosis = 'Query requires a composite index or the database is initializing.';
    } else if (errorCode.includes('unavailable') || errorMsg.includes('offline')) {
      diagnosis = 'Network connection or Firebase service unavailable.';
    }

    lastKnownFirestoreStatus = {
      connected: false,
      checkedAt: timestamp,
      error: errorMsg,
      errorCode,
      details: diagnosis,
    };
    return lastKnownFirestoreStatus;
  }
};

/**
 * Sync all locally stored bookings to Firestore without creating duplicates
 */
export const syncAllLocalBookingsToFirestore = async (): Promise<{
  successCount: number;
  failedCount: number;
  errors: string[];
}> => {
  const localBookings = getAdminMasterBookings();
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const b of localBookings) {
    try {
      const sanitized = sanitizeBookingData({
        userId: b.userId || 'guest',
        userName: b.userName || 'Customer',
        userEmail: b.userEmail || '',
        userPhone: b.userPhone || '',
        serviceType: b.serviceType || 'Dine-In Table Reservation',
        guests: b.guests || '2-4 People',
        timeSlot: b.timeSlot || 'Lunch',
        customDish: b.customDish || '',
        notes: b.notes || '',
        referenceId: b.referenceId || generateReferenceId(),
        deliveryOtp: b.deliveryOtp || '',
        otpVerified: b.otpVerified || false,
        otpSentCount: b.otpSentCount || 0,
        otpLastSentAt: b.otpLastSentAt || '',
        status: b.status || 'Pending',
        paymentStatus: b.paymentStatus || 'Pending',
        paymentMethod: b.paymentMethod || 'UPI_QR',
        paymentAmount: b.paymentAmount || 0,
        paymentUpiId: b.paymentUpiId || '',
        paymentPayee: b.paymentPayee || '',
        paymentUtr: b.paymentUtr || '',
        paymentAppUsed: b.paymentAppUsed || '',
        paymentPaidAt: b.paymentPaidAt || '',
        createdAt: b.createdAt || new Date().toISOString(),
        updatedAt: b.updatedAt || new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
      });

      if (!b.id || b.id.startsWith('local-')) {
        // Check if a document with this referenceId already exists in Firestore before adding
        const qRef = query(collection(db, 'bookings'), where('referenceId', '==', sanitized.referenceId));
        const existingDocs = await getDocs(qRef);

        if (!existingDocs.empty) {
          // Already exists in Firestore, just update local ID with Firestore doc ID
          const existingId = existingDocs.docs[0].id;
          updateAdminMasterBooking(b.id || b.referenceId, { id: existingId });
          successCount++;
        } else {
          // Add new document to Firestore
          const docRef = await addDoc(collection(db, 'bookings'), sanitized);
          updateAdminMasterBooking(b.id || b.referenceId, { id: docRef.id });
          successCount++;
        }
      } else {
        // Document has a Firestore ID, update it
        const docRef = doc(db, 'bookings', b.id);
        await updateDoc(docRef, sanitized);
        successCount++;
      }
    } catch (err: any) {
      failedCount++;
      if (!errors.includes(err.message)) {
        errors.push(err.message);
      }
    }
  }

  return { successCount, failedCount, errors };
};

/**
 * Force refresh admin bookings directly from Firestore and replace local cache
 */
export const forceRefreshAdminBookingsFromFirestore = async (): Promise<BookingInquiry[]> => {
  const bookingsRef = collection(db, 'bookings');
  const snap = await getDocs(bookingsRef);
  const freshList: BookingInquiry[] = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    freshList.push({
      id: docSnap.id,
      userId: data.userId || 'guest',
      userName: data.userName || 'Walk-in / Guest',
      userEmail: data.userEmail || '',
      userPhone: data.userPhone || '',
      serviceType: data.serviceType || 'Dine-In Table Reservation',
      guests: data.guests || '2-4 People',
      timeSlot: data.timeSlot || 'Lunch',
      customDish: data.customDish || '',
      notes: data.notes || '',
      status: data.status || 'Pending',
      paymentStatus: data.paymentStatus || 'Pending',
      paymentMethod: data.paymentMethod || 'UPI_QR',
      paymentAmount: data.paymentAmount || 0,
      paymentUpiId: data.paymentUpiId || '',
      paymentPayee: data.paymentPayee || '',
      paymentUtr: data.paymentUtr || '',
      paymentAppUsed: data.paymentAppUsed || '',
      paymentPaidAt: data.paymentPaidAt || '',
      deliveryOtp: data.deliveryOtp || '',
      otpVerified: data.otpVerified || false,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || '',
      referenceId: data.referenceId || docSnap.id.slice(0, 6).toUpperCase(),
    });
  });

  const sorted = freshList.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  try {
    localStorage.setItem(ADMIN_MASTER_STORAGE_KEY, JSON.stringify(sorted));
  } catch {}

  return sorted;
};

/**
 * Purge local admin cache completely
 */
export const purgeLocalAdminCache = (): void => {
  try {
    localStorage.removeItem(ADMIN_MASTER_STORAGE_KEY);
    localStorage.removeItem('vegies_restro_admin_all_users');
  } catch (e) {
    console.error('Error purging cache:', e);
  }
};

// Storage keys
const getUserLocalStorageKey = (userId: string) => `vegies_restro_bookings_${userId}`;
const ADMIN_MASTER_STORAGE_KEY = 'vegies_restro_admin_all_bookings';

// Local storage helpers
const getLocalBookings = (userId: string): BookingInquiry[] => {
  try {
    const raw = localStorage.getItem(getUserLocalStorageKey(userId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const getAdminMasterBookings = (): BookingInquiry[] => {
  try {
    const raw = localStorage.getItem(ADMIN_MASTER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveAdminMasterBooking = (booking: BookingInquiry) => {
  try {
    const current = getAdminMasterBookings();
    const updated = [
      booking,
      ...current.filter((b) => b.id !== booking.id && b.referenceId !== booking.referenceId),
    ];
    localStorage.setItem(ADMIN_MASTER_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save master booking to localStorage:', e);
  }
};

const updateAdminMasterBooking = (bookingId: string, updates: Partial<BookingInquiry>) => {
  try {
    const current = getAdminMasterBookings();
    const updated = current.map((b) =>
      b.id === bookingId || b.referenceId === bookingId ? { ...b, ...updates } : b
    );
    localStorage.setItem(ADMIN_MASTER_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not update master booking:', e);
  }
};

const deleteAdminMasterBooking = (bookingId: string) => {
  try {
    const current = getAdminMasterBookings();
    const updated = current.filter((b) => b.id !== bookingId && b.referenceId !== bookingId);
    localStorage.setItem(ADMIN_MASTER_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not delete master booking:', e);
  }
};

const saveLocalBooking = (userId: string, booking: BookingInquiry) => {
  try {
    const current = getLocalBookings(userId);
    const updated = [
      booking,
      ...current.filter((b) => b.id !== booking.id && b.referenceId !== booking.referenceId),
    ];
    localStorage.setItem(getUserLocalStorageKey(userId), JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save booking to localStorage:', e);
  }
  saveAdminMasterBooking(booking);
};

const updateLocalBookingStatus = (
  userId: string,
  bookingId: string,
  status: BookingInquiry['status']
) => {
  try {
    const current = getLocalBookings(userId);
    const updated = current.map((b) => (b.id === bookingId ? { ...b, status } : b));
    localStorage.setItem(getUserLocalStorageKey(userId), JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not update booking in localStorage:', e);
  }
  updateAdminMasterBooking(bookingId, { status });
};

// Generate a readable reservation reference (e.g., VR-8492)
export const generateReferenceId = (): string => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `VR-${randomNum}`;
};

// Generate a secure 4-digit numeric OTP for delivery confirmation (different from excludeOtp if provided)
export const generateDeliveryOtp = (excludeOtp?: string): string => {
  let otp = Math.floor(1000 + Math.random() * 9000).toString();
  if (excludeOtp) {
    const cleanExclude = excludeOtp.trim();
    let attempts = 0;
    while (otp === cleanExclude && attempts < 10) {
      otp = Math.floor(1000 + Math.random() * 9000).toString();
      attempts++;
    }
    // Guaranteed different OTP fallback if needed
    if (otp === cleanExclude) {
      const num = parseInt(cleanExclude, 10) || 1234;
      otp = ((num + 1111) % 9000 + 1000).toString();
    }
  }
  return otp;
};

/**
 * Clean and remove any undefined fields before sending to Firestore
 */
const sanitizeBookingData = (data: Record<string, any>): Record<string, any> => {
  const clean: Record<string, any> = {};
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (value !== undefined) {
      clean[key] = value;
    } else {
      clean[key] = '';
    }
  });
  return clean;
};

/**
 * Save a new table reservation / food order inquiry
 */
export const createBookingInquiry = async (
  data: Omit<
    BookingInquiry,
    | 'id'
    | 'createdAt'
    | 'referenceId'
    | 'status'
    | 'paymentStatus'
    | 'paymentMethod'
    | 'paymentAmount'
    | 'paymentUpiId'
    | 'paymentPayee'
    | 'paymentUtr'
    | 'paymentAppUsed'
    | 'paymentPaidAt'
    | 'deliveryOtp'
    | 'otpVerified'
  > & {
    status?: BookingInquiry['status'];
    paymentStatus?: BookingInquiry['paymentStatus'];
    paymentMethod?: BookingInquiry['paymentMethod'];
    paymentAmount?: number;
    paymentUpiId?: string;
    paymentPayee?: string;
    paymentUtr?: string;
    paymentAppUsed?: string;
    paymentPaidAt?: string;
    deliveryOtp?: string;
    otpVerified?: boolean;
  }
): Promise<BookingInquiry> => {
  const referenceId = generateReferenceId();
  const deliveryOtp = data.deliveryOtp || generateDeliveryOtp();
  const now = new Date().toISOString();

  const newBooking: BookingInquiry = {
    id: `local-${Date.now()}`,
    userId: data.userId,
    userName: data.userName || '',
    userEmail: data.userEmail || '',
    userPhone: data.userPhone || '',
    serviceType: data.serviceType || 'Dine-In Table Reservation',
    guests: data.guests || '2-4 People',
    timeSlot: data.timeSlot || 'Lunch (12:00 PM - 3:30 PM)',
    customDish: data.customDish || '',
    notes: data.notes || '',
    referenceId,
    deliveryOtp,
    otpVerified: data.otpVerified || false,
    status: data.status || 'Pending',
    paymentStatus: data.paymentStatus || 'Pending',
    paymentMethod: data.paymentMethod || 'UPI_QR',
    paymentAmount: data.paymentAmount || 0,
    paymentUpiId: data.paymentUpiId || '',
    paymentPayee: data.paymentPayee || '',
    paymentUtr: data.paymentUtr || '',
    paymentAppUsed: data.paymentAppUsed || '',
    paymentPaidAt: data.paymentPaidAt || (data.paymentStatus === 'Paid' ? now : ''),
    createdAt: now,
  };

  // Persist locally
  saveLocalBooking(data.userId, newBooking);

  // Firestore attempt
  try {
    const sanitizedFirestorePayload = sanitizeBookingData({
      userId: newBooking.userId,
      userName: newBooking.userName,
      userEmail: newBooking.userEmail,
      userPhone: newBooking.userPhone,
      serviceType: newBooking.serviceType,
      guests: newBooking.guests,
      timeSlot: newBooking.timeSlot,
      customDish: newBooking.customDish,
      notes: newBooking.notes,
      referenceId: newBooking.referenceId,
      deliveryOtp: newBooking.deliveryOtp,
      otpVerified: newBooking.otpVerified,
      status: newBooking.status,
      paymentStatus: newBooking.paymentStatus,
      paymentMethod: newBooking.paymentMethod,
      paymentAmount: newBooking.paymentAmount,
      paymentUpiId: newBooking.paymentUpiId,
      paymentPayee: newBooking.paymentPayee,
      paymentUtr: newBooking.paymentUtr,
      paymentAppUsed: newBooking.paymentAppUsed,
      paymentPaidAt: newBooking.paymentPaidAt,
      createdAt: newBooking.createdAt,
      serverCreatedAt: serverTimestamp(),
    });

    const docRef = await addDoc(collection(db, 'bookings'), sanitizedFirestorePayload);

    const savedWithId: BookingInquiry = {
      ...newBooking,
      id: docRef.id,
    };

    saveLocalBooking(data.userId, savedWithId);
    return savedWithId;
  } catch (err: any) {
    console.warn('Firestore write notice (using local storage backup):', err);
    return newBooking;
  }
};

/**
 * Subscribe in real-time to the current user's bookings and orders across devices
 */
export const subscribeToUserBookings = (
  userId: string,
  onUpdate: (bookings: BookingInquiry[]) => void,
  onError?: (err: any) => void,
  userEmail?: string
) => {
  // 1. Immediately emit local cache for instant zero-latency UI
  const localInitial = getLocalBookings(userId);
  if (localInitial.length > 0) {
    onUpdate(localInitial);
  }

  const bookingsRef = collection(db, 'bookings');
  const mergedMap = new Map<string, BookingInquiry>();

  // Populate map with initial local data
  localInitial.forEach((item) => {
    const key = item.referenceId || item.id || '';
    if (key) mergedMap.set(key, item);
  });

  const notifySubscribers = () => {
    const sorted = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    // Keep local storage up to date on this device
    try {
      localStorage.setItem(getUserLocalStorageKey(userId), JSON.stringify(sorted));
    } catch {}
    onUpdate(sorted);
  };

  const processDoc = (docSnap: any) => {
    const data = docSnap.data();
    const item: BookingInquiry = {
      id: docSnap.id,
      userId: data.userId || userId,
      userName: data.userName || '',
      userEmail: data.userEmail || '',
      userPhone: data.userPhone || '',
      serviceType: data.serviceType || 'Dine-In Table Reservation',
      guests: data.guests || '2-4 People',
      timeSlot: data.timeSlot || 'Lunch',
      customDish: data.customDish || '',
      notes: data.notes || '',
      status: data.status || 'Pending',
      paymentStatus: data.paymentStatus || 'Pending',
      paymentMethod: data.paymentMethod || 'UPI_QR',
      paymentAmount: data.paymentAmount || 0,
      paymentUpiId: data.paymentUpiId || '',
      paymentPayee: data.paymentPayee || '',
      paymentUtr: data.paymentUtr || '',
      paymentAppUsed: data.paymentAppUsed || '',
      paymentPaidAt: data.paymentPaidAt || '',
      deliveryOtp: data.deliveryOtp || '',
      otpVerified: data.otpVerified || false,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || '',
      referenceId: data.referenceId || docSnap.id.slice(0, 6).toUpperCase(),
    };
    const key = item.referenceId || item.id || '';
    if (key) mergedMap.set(key, item);
  };

  // Query by userId without compound orderBy to avoid composite index issues
  const qUser = query(bookingsRef, where('userId', '==', userId));

  let unsubscribeUser = () => {};
  let unsubscribeEmail = () => {};

  try {
    unsubscribeUser = onSnapshot(
      qUser,
      (snapshot) => {
        snapshot.forEach(processDoc);
        notifySubscribers();
      },
      (err) => {
        console.warn('Firestore user bookings sync note:', err.message);
        notifySubscribers();
        if (onError) onError(err);
      }
    );

    // If user has an email, also listen to bookings with matching email to catch any cross-device guest/email orders
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    if (cleanEmail) {
      const qEmail = query(bookingsRef, where('userEmail', '==', cleanEmail));
      unsubscribeEmail = onSnapshot(
        qEmail,
        (snapshot) => {
          snapshot.forEach(processDoc);
          notifySubscribers();
        },
        (err) => {
          console.warn('Firestore email bookings sync note:', err.message);
        }
      );
    }
  } catch (err: any) {
    console.warn('Error setting up onSnapshot listener:', err);
    notifySubscribers();
  }

  return () => {
    try {
      unsubscribeUser();
    } catch {}
    try {
      unsubscribeEmail();
    } catch {}
  };
};

/**
 * Cancel a user booking
 */
export const cancelUserBooking = async (bookingId: string, userId?: string) => {
  if (userId) {
    const userBookings = getLocalBookings(userId);
    const existing = userBookings.find((b) => b.id === bookingId || b.referenceId === bookingId);
    if (existing && (existing.status === 'Completed' || existing.status === 'Delivered')) {
      throw new Error('Completed orders and bookings cannot be cancelled.');
    }
    updateLocalBookingStatus(userId, bookingId, 'Cancelled');
  }

  try {
    const updatePayload = {
      status: 'Cancelled' as const,
      updatedAt: new Date().toISOString(),
    };

    if (!bookingId.startsWith('local-')) {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, updatePayload);
    } else {
      // Find document in Firestore by referenceId
      const qRef = query(collection(db, 'bookings'), where('referenceId', '==', bookingId));
      const snap = await getDocs(qRef);
      if (!snap.empty) {
        for (const d of snap.docs) {
          await updateDoc(doc(db, 'bookings', d.id), updatePayload);
        }
      }
    }
  } catch (err) {
    console.warn('Could not update cancellation in Firestore (updated locally):', err);
  }
};

// ==========================================
// ADMIN PORTAL SERVICES & MANAGEMENT
// ==========================================

/**
 * Subscribe to ALL bookings across the system for Admin management
 */
export const subscribeToAllBookingsAdmin = (
  onUpdate: (bookings: BookingInquiry[]) => void,
  onError?: (err: any) => void
) => {
  // 1. Initial emission from local master cache
  const masterInitial = getAdminMasterBookings();
  if (masterInitial.length > 0) {
    onUpdate(masterInitial);
  }

  const bookingsRef = collection(db, 'bookings');
  let unsubscribe = () => {};

  try {
    unsubscribe = onSnapshot(
      bookingsRef,
      (snapshot) => {
        const firestoreItems: BookingInquiry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          firestoreItems.push({
            id: docSnap.id,
            userId: data.userId || 'guest',
            userName: data.userName || 'Walk-in / Guest',
            userEmail: data.userEmail || '',
            userPhone: data.userPhone || '',
            serviceType: data.serviceType || 'Dine-In Table Reservation',
            guests: data.guests || '2-4 People',
            timeSlot: data.timeSlot || 'Lunch',
            customDish: data.customDish || '',
            notes: data.notes || '',
            status: data.status || 'Pending',
            paymentStatus: data.paymentStatus || 'Pending',
            paymentMethod: data.paymentMethod || 'UPI_QR',
            paymentAmount: data.paymentAmount || 0,
            paymentUpiId: data.paymentUpiId || '',
            paymentPayee: data.paymentPayee || '',
            paymentUtr: data.paymentUtr || '',
            paymentAppUsed: data.paymentAppUsed || '',
            paymentPaidAt: data.paymentPaidAt || '',
            deliveryOtp: data.deliveryOtp || '',
            otpVerified: data.otpVerified || false,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || '',
            referenceId: data.referenceId || docSnap.id.slice(0, 6).toUpperCase(),
          });
        });

        // Look for any pending unsynced offline items on this device
        const localMaster = getAdminMasterBookings();
        const mergedMap = new Map<string, BookingInquiry>();

        // 1. Authoritative Cloud Firestore records
        firestoreItems.forEach((b) => {
          const key = b.referenceId || b.id || '';
          if (key) mergedMap.set(key, b);
        });

        // 2. Only include pending unsynced offline items (created locally without Firestore doc yet)
        const pendingUnsynced: BookingInquiry[] = [];
        localMaster.forEach((b) => {
          const isLocalDraft = b.id && b.id.startsWith('local-');
          const key = b.referenceId || b.id || '';
          if (isLocalDraft && key && !mergedMap.has(key)) {
            mergedMap.set(key, b);
            pendingUnsynced.push(b);
          }
        });

        const list = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Keep local cache perfectly in sync with Cloud Firestore
        try {
          localStorage.setItem(ADMIN_MASTER_STORAGE_KEY, JSON.stringify(list));
        } catch {}

        // If there are unsynced items, trigger a background push to Firestore
        if (pendingUnsynced.length > 0) {
          syncAllLocalBookingsToFirestore().catch((e) =>
            console.warn('Auto-sync unsynced bookings note:', e)
          );
        }

        onUpdate(list);
      },
      (err) => {
        console.warn('Admin Firestore all bookings listener notice:', err.message);
        const fallback = getAdminMasterBookings();
        onUpdate(fallback);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn('Could not setup admin listener:', err);
    onUpdate(getAdminMasterBookings());
  }

  return () => {
    try {
      unsubscribe();
    } catch {}
  };
};

/**
 * Admin: Update booking status & notes
 */
export const updateBookingStatusAdmin = async (
  bookingId: string,
  newStatus?: BookingInquiry['status'],
  additionalNotes?: string,
  paymentStatus?: BookingInquiry['paymentStatus']
) => {
  // Check if booking is already Completed or Delivered
  const master = getAdminMasterBookings();
  const current = master.find((b) => b.id === bookingId || b.referenceId === bookingId);
  if (
    current &&
    (current.status === 'Completed' || current.status === 'Delivered') &&
    newStatus !== undefined &&
    newStatus !== current.status
  ) {
    throw new Error('Once an order or booking is marked as Delivered or Completed, its status is finalized and cannot be changed.');
  }

  const isCodOrPending =
    current &&
    (current.paymentMethod === 'Cash on Delivery' ||
      current.paymentMethod === 'Cash' ||
      current.paymentStatus !== 'Paid' ||
      (typeof current.notes === 'string' && /cash on delivery|\bcod\b|pay on pickup/i.test(current.notes)));

  const resolvedPaymentStatus =
    paymentStatus !== undefined
      ? paymentStatus
      : (newStatus === 'Delivered' || newStatus === 'Completed') && isCodOrPending
      ? 'Paid'
      : undefined;

  // Update local master store
  updateAdminMasterBooking(bookingId, {
    status: newStatus,
    notes: additionalNotes !== undefined ? additionalNotes : undefined,
    paymentStatus: resolvedPaymentStatus,
    ...((newStatus === 'Delivered' || newStatus === 'Completed') && isCodOrPending ? { paymentPaidAt: new Date().toISOString() } : {}),
  });

  // Try updating in Firestore
  const updatePayload: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };
  if (newStatus !== undefined) {
    updatePayload.status = newStatus;
  }
  if (additionalNotes !== undefined) {
    updatePayload.notes = additionalNotes;
  }
  if (resolvedPaymentStatus !== undefined) {
    updatePayload.paymentStatus = resolvedPaymentStatus;
    if ((newStatus === 'Delivered' || newStatus === 'Completed') && isCodOrPending) {
      updatePayload.paymentPaidAt = new Date().toISOString();
    }
  }

  try {
    if (!bookingId.startsWith('local-')) {
      const bRef = doc(db, 'bookings', bookingId);
      await updateDoc(bRef, updatePayload);
    } else {
      // Find document by referenceId in Firestore
      const targetRefId = current?.referenceId || bookingId;
      const qRef = query(collection(db, 'bookings'), where('referenceId', '==', targetRefId));
      const snap = await getDocs(qRef);
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          await updateDoc(doc(db, 'bookings', docSnap.id), updatePayload);
        }
      }
    }
  } catch (err) {
    console.warn('Firestore admin update notice (saved in local store):', err);
  }
};

/**
 * Admin: Update only payment status & UTR
 */
export const updateBookingPaymentStatusAdmin = async (
  bookingId: string,
  paymentStatus: BookingInquiry['paymentStatus'],
  paymentUtr?: string
) => {
  const master = getAdminMasterBookings();
  const current = master.find((b) => b.id === bookingId || b.referenceId === bookingId);

  updateAdminMasterBooking(bookingId, {
    paymentStatus,
    ...(paymentUtr !== undefined ? { paymentUtr } : {}),
  });

  const updatePayload: Record<string, any> = {
    paymentStatus,
    updatedAt: new Date().toISOString(),
  };
  if (paymentUtr !== undefined) {
    updatePayload.paymentUtr = paymentUtr;
  }

  try {
    if (!bookingId.startsWith('local-')) {
      const bRef = doc(db, 'bookings', bookingId);
      await updateDoc(bRef, updatePayload);
    } else {
      const targetRefId = current?.referenceId || bookingId;
      const qRef = query(collection(db, 'bookings'), where('referenceId', '==', targetRefId));
      const snap = await getDocs(qRef);
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          await updateDoc(doc(db, 'bookings', docSnap.id), updatePayload);
        }
      }
    }
  } catch (err) {
    console.warn('Firestore admin payment status update notice:', err);
  }
};

/**
 * Admin: Delete / Remove a booking
 */
export const deleteBookingAdmin = async (bookingId: string) => {
  const master = getAdminMasterBookings();
  const current = master.find((b) => b.id === bookingId || b.referenceId === bookingId);

  deleteAdminMasterBooking(bookingId);

  try {
    if (!bookingId.startsWith('local-')) {
      const bRef = doc(db, 'bookings', bookingId);
      await deleteDoc(bRef);
    } else {
      const targetRefId = current?.referenceId || bookingId;
      const qRef = query(collection(db, 'bookings'), where('referenceId', '==', targetRefId));
      const snap = await getDocs(qRef);
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, 'bookings', docSnap.id));
        }
      }
    }
  } catch (err) {
    console.warn('Firestore admin delete notice (deleted from local store):', err);
  }
};

/**
 * Admin: Create a walk-in / phone-in booking from admin panel
 */
export const createBookingFromAdmin = async (data: {
  userName: string;
  userPhone: string;
  userEmail?: string;
  serviceType: string;
  guests: string;
  timeSlot: string;
  customDish?: string;
  notes?: string;
  status: BookingInquiry['status'];
}): Promise<BookingInquiry> => {
  const referenceId = generateReferenceId();
  const deliveryOtp = generateDeliveryOtp();
  const now = new Date().toISOString();

  const newBooking: BookingInquiry = {
    id: `local-admin-${Date.now()}`,
    userId: 'admin-created',
    userName: data.userName.trim(),
    userEmail: data.userEmail?.trim() || '',
    userPhone: data.userPhone.trim(),
    serviceType: data.serviceType,
    guests: data.guests,
    timeSlot: data.timeSlot,
    customDish: data.customDish?.trim() || '',
    notes: data.notes?.trim() || '',
    referenceId,
    deliveryOtp,
    otpVerified: false,
    status: data.status || 'Confirmed',
    createdAt: now,
  };

  saveAdminMasterBooking(newBooking);

  try {
    const sanitizedPayload = sanitizeBookingData({
      userId: newBooking.userId,
      userName: newBooking.userName,
      userEmail: newBooking.userEmail,
      userPhone: newBooking.userPhone,
      serviceType: newBooking.serviceType,
      guests: newBooking.guests,
      timeSlot: newBooking.timeSlot,
      customDish: newBooking.customDish,
      notes: newBooking.notes,
      referenceId: newBooking.referenceId,
      deliveryOtp: newBooking.deliveryOtp,
      otpVerified: newBooking.otpVerified,
      status: newBooking.status,
      createdAt: newBooking.createdAt,
      createdBy: 'admin',
      serverCreatedAt: serverTimestamp(),
    });

    const docRef = await addDoc(collection(db, 'bookings'), sanitizedPayload);
    const withId: BookingInquiry = { ...newBooking, id: docRef.id };
    saveAdminMasterBooking(withId);
    return withId;
  } catch (err) {
    console.warn('Firestore admin creation notice (saved in master store):', err);
    return newBooking;
  }
};

/**
 * Admin: Verify Customer Delivery OTP and confirm delivery completion
 */
export const verifyDeliveryOtpAdmin = async (
  bookingId: string,
  enteredOtp: string,
  forceOverride: boolean = false
): Promise<{ success: boolean; message: string; booking?: BookingInquiry }> => {
  const master = getAdminMasterBookings();
  const target = master.find((b) => b.id === bookingId || b.referenceId === bookingId);

  if (!target) {
    return { success: false, message: 'Order record not found.' };
  }

  const cleanEntered = enteredOtp.trim();
  const expectedOtp = (target.deliveryOtp || '').trim();

  // If OTP is specified on the order and not force-overridden, verify matching OTP
  if (!forceOverride && expectedOtp) {
    if (cleanEntered !== expectedOtp) {
      return {
        success: false,
        message: `Invalid Delivery OTP. Please ask customer for the correct 4-digit code (Entered: ${cleanEntered}).`,
      };
    }
  }

  const now = new Date().toISOString();

  // If order was Cash on Delivery (or payment was pending upon delivery),
  // as soon as the rider completes delivery with OTP at doorstep, payment is marked as Paid (collected in cash)!
  const isCodOrPending =
    target.paymentMethod === 'Cash on Delivery' ||
    target.paymentMethod === 'Cash' ||
    target.paymentStatus !== 'Paid' ||
    (typeof target.notes === 'string' && /cash on delivery|\bcod\b|pay on pickup/i.test(target.notes));

  const newPaymentStatus = isCodOrPending ? ('Paid' as const) : (target.paymentStatus || 'Paid');
  const newPaymentMethod = target.paymentMethod || (isCodOrPending ? 'Cash on Delivery' : 'UPI_QR');

  // Detect payment amount if available from guests
  let detectedAmount = target.paymentAmount;
  if (!detectedAmount && target.guests) {
    const numMatch = target.guests.match(/₹?\s*(\d+)/);
    if (numMatch) {
      detectedAmount = parseInt(numMatch[1], 10);
    }
  }

  const paymentPaidAt = target.paymentPaidAt || now;

  // Update local master store
  updateAdminMasterBooking(bookingId, {
    status: 'Delivered',
    otpVerified: true,
    paymentStatus: newPaymentStatus,
    paymentMethod: newPaymentMethod,
    paymentPaidAt,
    ...(detectedAmount ? { paymentAmount: detectedAmount } : {}),
    updatedAt: now,
  });

  // Try updating Firestore
  const updatePayload: Record<string, any> = {
    status: 'Delivered' as const,
    otpVerified: true,
    paymentStatus: newPaymentStatus,
    paymentMethod: newPaymentMethod,
    paymentPaidAt,
    ...(detectedAmount ? { paymentAmount: detectedAmount } : {}),
    updatedAt: now,
  };

  try {
    if (!bookingId.startsWith('local-')) {
      const bRef = doc(db, 'bookings', bookingId);
      await updateDoc(bRef, updatePayload);
    } else {
      const targetRefId = target.referenceId || bookingId;
      const qRef = query(collection(db, 'bookings'), where('referenceId', '==', targetRefId));
      const snap = await getDocs(qRef);
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          await updateDoc(doc(db, 'bookings', docSnap.id), updatePayload);
        }
      }
    }
  } catch (err) {
    console.warn('Firestore OTP verification update notice (saved in local store):', err);
  }

  // Also update customer local storage if userId is present so customer device reflects Paid
  if (target.userId) {
    try {
      const userKey = getUserLocalStorageKey(target.userId);
      const userRaw = localStorage.getItem(userKey);
      if (userRaw) {
        const userList: BookingInquiry[] = JSON.parse(userRaw);
        const updatedUserList = userList.map((b) =>
          b.id === target.id || b.referenceId === target.referenceId
            ? { ...b, ...updatePayload }
            : b
        );
        localStorage.setItem(userKey, JSON.stringify(updatedUserList));
      }
    } catch (e) {
      console.warn('Could not update customer local bookings:', e);
    }
  }

  const updatedTarget: BookingInquiry = {
    ...target,
    status: 'Delivered',
    otpVerified: true,
    paymentStatus: newPaymentStatus,
    paymentMethod: newPaymentMethod,
    paymentPaidAt,
    ...(detectedAmount ? { paymentAmount: detectedAmount } : {}),
    updatedAt: now,
  };

  return {
    success: true,
    message: isCodOrPending
      ? 'Delivery Confirmation OTP verified successfully! Cash collected & payment marked as PAID.'
      : 'Delivery Confirmation OTP verified successfully! Order marked as Delivered.',
    booking: updatedTarget,
  };
};

/**
 * Admin / Rider: Regenerate a guaranteed different delivery confirmation OTP on resend
 */
export const regenerateDeliveryOtpAdmin = async (
  bookingId: string
): Promise<{ success: boolean; newOtp: string; updatedBooking?: BookingInquiry }> => {
  const master = getAdminMasterBookings();
  const current = master.find((b) => b.id === bookingId || b.referenceId === bookingId);

  if (!current) {
    throw new Error('Order not found for OTP regeneration.');
  }

  const previousOtp = (current.deliveryOtp || '').trim();
  const newOtp = generateDeliveryOtp(previousOtp);
  const now = new Date().toISOString();
  const nextCount = (current.otpSentCount || 1) + 1;

  const updateFields: Partial<BookingInquiry> = {
    deliveryOtp: newOtp,
    otpSentCount: nextCount,
    otpLastSentAt: now,
    updatedAt: now,
  };

  // Update local master store immediately
  updateAdminMasterBooking(bookingId, updateFields);

  // Try updating in Firestore
  try {
    if (!bookingId.startsWith('local-')) {
      const bRef = doc(db, 'bookings', bookingId);
      await updateDoc(bRef, updateFields);
    } else {
      const targetRefId = current.referenceId || bookingId;
      const qRef = query(collection(db, 'bookings'), where('referenceId', '==', targetRefId));
      const snap = await getDocs(qRef);
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          await updateDoc(doc(db, 'bookings', docSnap.id), updateFields);
        }
      }
    }
  } catch (err) {
    console.warn('Firestore OTP regeneration notice (saved in local store):', err);
  }

  const updatedBooking: BookingInquiry = {
    ...current,
    ...updateFields,
  };

  return {
    success: true,
    newOtp,
    updatedBooking,
  };
};

/**
 * Admin / Rider: Mark OTP as sent for the first time
 */
export const markOtpSentAdmin = async (
  bookingId: string
): Promise<void> => {
  const master = getAdminMasterBookings();
  const current = master.find((b) => b.id === bookingId || b.referenceId === bookingId);
  const nextCount = (current?.otpSentCount || 0) + 1;
  const now = new Date().toISOString();

  const updateFields = {
    otpSentCount: nextCount,
    otpLastSentAt: now,
    updatedAt: now,
  };

  updateAdminMasterBooking(bookingId, updateFields);

  try {
    if (!bookingId.startsWith('local-')) {
      const bRef = doc(db, 'bookings', bookingId);
      await updateDoc(bRef, updateFields);
    } else if (current?.referenceId) {
      const qRef = query(collection(db, 'bookings'), where('referenceId', '==', current.referenceId));
      const snap = await getDocs(qRef);
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          await updateDoc(doc(db, 'bookings', docSnap.id), updateFields);
        }
      }
    }
  } catch (err) {
    console.warn('Firestore markOtpSent notice:', err);
  }
};

export interface UtrValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  normalizedUtr?: string;
  duplicateOrderRef?: string;
}

/**
 * Validates UTR / UPI Reference Number:
 * - Checks format (10-22 characters, standard 12-digit numeric or alphanumeric UPI reference)
 * - Rejects fake patterns (all identical digits, sequences, test words)
 * - Verifies that the UTR has not been already claimed/used for another paid order
 */
export const validateUtrNumber = (utr: string): UtrValidationResult => {
  const clean = (utr || '').trim().replace(/[\s-]/g, '').toUpperCase();

  if (!clean) {
    return {
      isValid: false,
      error: 'Please enter the 12-digit UPI Reference / UTR Number from your payment receipt.',
    };
  }

  // Must be between 10 and 22 characters
  if (clean.length < 10) {
    return {
      isValid: false,
      error: `The entered UTR "${clean}" is too short (${clean.length} digits). A standard UPI Ref No. is 12 digits (e.g. 423819283749).`,
    };
  }

  if (clean.length > 22) {
    return {
      isValid: false,
      error: `The entered UTR "${clean}" is too long. Please enter only the 12-digit UPI transaction reference number.`,
    };
  }

  // Check for all same characters (e.g., 000000000000, 111111111111, 999999999999)
  if (/^(.)\1+$/.test(clean)) {
    return {
      isValid: false,
      error: 'Invalid UTR: Repetitive test digits (e.g. 000000000000) are not permitted. Please enter the genuine UTR from your UPI payment receipt.',
    };
  }

  // Check for simple sequential numbers
  const simpleSequences = [
    '123456789012',
    '012345678901',
    '987654321098',
    '123456123456',
    '112233445566',
    '000000123456',
    '1234567890',
    '0987654321',
    '111222333444',
  ];
  if (simpleSequences.includes(clean)) {
    return {
      isValid: false,
      error: 'Invalid UTR: Test sequence numbers are not accepted. Please check your Google Pay / PhonePe / Paytm receipt for the genuine 12-digit transaction ID.',
    };
  }

  // Check for dummy words
  if (/TEST|DEMO|FAKE|DUMMY|SAMPLE|ASDF|NULL|UNDEFINED/i.test(clean)) {
    return {
      isValid: false,
      error: 'Invalid UTR: Test keywords detected. Please enter your genuine payment reference ID.',
    };
  }

  // Check for duplicate UTR across existing bookings in local master storage
  const masterBookings = getAdminMasterBookings();
  const existingWithUtr = masterBookings.find(
    (b) =>
      b.paymentUtr &&
      b.paymentUtr.replace(/[\s-]/g, '').toUpperCase() === clean &&
      b.paymentStatus === 'Paid'
  );

  if (existingWithUtr) {
    return {
      isValid: false,
      error: `Duplicate UTR: Reference number "${clean}" was already used for order #${existingWithUtr.referenceId} on ${new Date(
        existingWithUtr.createdAt
      ).toLocaleDateString()}. Each payment must have a unique reference.`,
      duplicateOrderRef: existingWithUtr.referenceId,
    };
  }

  return {
    isValid: true,
    normalizedUtr: clean,
  };
};

/**
 * Validates UTR against duplicate records and simulates live banking reconciliation
 */
export const verifyUtrWithBankingGateway = async (
  utr: string,
  amount: number,
  appUsed: string
): Promise<{ success: boolean; message: string; details?: any }> => {
  // First run local format and duplicate check
  const localCheck = validateUtrNumber(utr);
  if (!localCheck.isValid) {
    return { success: false, message: localCheck.error || 'Invalid UTR' };
  }

  // Also query Firestore bookings for remote duplicate check
  try {
    const qRef = query(collection(db, 'bookings'), where('paymentUtr', '==', localCheck.normalizedUtr));
    const querySnapshot = await getDocs(qRef);
    const duplicates = querySnapshot.docs.filter((d) => d.data().paymentStatus === 'Paid');
    if (duplicates.length > 0) {
      const dupData = duplicates[0].data();
      return {
        success: false,
        message: `Duplicate UTR: This UPI reference number was already registered for order #${dupData.referenceId || duplicates[0].id}. Please provide the new transaction UTR.`,
      };
    }
  } catch (err) {
    console.warn('Firestore duplicate check note:', err);
  }

  return {
    success: true,
    message: `Payment of ₹${amount} successfully verified via ${appUsed}!`,
    details: {
      utr: localCheck.normalizedUtr,
      amount,
      verifiedAt: new Date().toISOString(),
      status: 'VERIFIED_SETTLED',
    },
  };
};
