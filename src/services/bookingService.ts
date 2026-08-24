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
 * Sync all locally stored bookings to Firestore
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
        status: b.status || 'Pending',
        createdAt: b.createdAt || new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
      });

      const docRef = await addDoc(collection(db, 'bookings'), sanitized);
      // Update local copy with new Firestore doc ID
      updateAdminMasterBooking(b.id || b.referenceId, { id: docRef.id });
      successCount++;
    } catch (err: any) {
      failedCount++;
      if (!errors.includes(err.message)) {
        errors.push(err.message);
      }
    }
  }

  return { successCount, failedCount, errors };
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
  data: Omit<BookingInquiry, 'id' | 'createdAt' | 'status' | 'referenceId'>
): Promise<BookingInquiry> => {
  const referenceId = generateReferenceId();
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
    status: 'Pending',
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
      status: newBooking.status,
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
 * Subscribe in real-time to the current user's bookings
 */
export const subscribeToUserBookings = (
  userId: string,
  onUpdate: (bookings: BookingInquiry[]) => void,
  onError?: (err: any) => void
) => {
  const localInitial = getLocalBookings(userId);
  if (localInitial.length > 0) {
    onUpdate(localInitial);
  }

  const bookingsRef = collection(db, 'bookings');
  const q = query(bookingsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));

  let unsubscribe = () => {};

  try {
    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: BookingInquiry[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
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
            createdAt: data.createdAt || new Date().toISOString(),
            referenceId: data.referenceId || doc.id.slice(0, 6).toUpperCase(),
          });
        });

        const local = getLocalBookings(userId);
        const mergedMap = new Map<string, BookingInquiry>();

        items.forEach((item) => mergedMap.set(item.referenceId, item));
        local.forEach((item) => {
          if (!mergedMap.has(item.referenceId)) {
            mergedMap.set(item.referenceId, item);
          }
        });

        const mergedList = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        onUpdate(mergedList);
      },
      (err) => {
        console.warn('Firestore subscription fallback to local cache:', err.message);
        const fallback = getLocalBookings(userId);
        onUpdate(fallback);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn('Error setting up onSnapshot listener:', err);
    onUpdate(getLocalBookings(userId));
  }

  return () => {
    try {
      unsubscribe();
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
    if (existing && existing.status === 'Completed') {
      throw new Error('Completed bookings cannot be cancelled.');
    }
    updateLocalBookingStatus(userId, bookingId, 'Cancelled');
  }

  if (!bookingId.startsWith('local-')) {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: 'Cancelled',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Could not update cancellation in Firestore (updated locally):', err);
    }
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
            createdAt: data.createdAt || new Date().toISOString(),
            referenceId: data.referenceId || docSnap.id.slice(0, 6).toUpperCase(),
          });
        });

        // Merge with local master cache
        const localMaster = getAdminMasterBookings();
        const mergedMap = new Map<string, BookingInquiry>();

        firestoreItems.forEach((b) => mergedMap.set(b.referenceId || b.id || '', b));
        localMaster.forEach((b) => {
          const key = b.referenceId || b.id || '';
          if (!mergedMap.has(key)) {
            mergedMap.set(key, b);
          }
        });

        const list = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Update local master cache
        try {
          localStorage.setItem(ADMIN_MASTER_STORAGE_KEY, JSON.stringify(list));
        } catch {}

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
  additionalNotes?: string
) => {
  // Check if booking is already Completed
  const master = getAdminMasterBookings();
  const current = master.find((b) => b.id === bookingId || b.referenceId === bookingId);
  if (
    current &&
    current.status === 'Completed' &&
    newStatus !== undefined &&
    newStatus !== 'Completed'
  ) {
    throw new Error('Once a booking is marked as Completed, its status is finalized and cannot be changed.');
  }

  // Update local master store
  updateAdminMasterBooking(bookingId, {
    status: newStatus,
    notes: additionalNotes !== undefined ? additionalNotes : undefined,
  });

  // Try updating in Firestore
  if (!bookingId.startsWith('local-')) {
    try {
      const bRef = doc(db, 'bookings', bookingId);
      const updatePayload: Record<string, any> = {
        updatedAt: new Date().toISOString(),
      };
      if (newStatus !== undefined) {
        updatePayload.status = newStatus;
      }
      if (additionalNotes !== undefined) {
        updatePayload.notes = additionalNotes;
      }
      await updateDoc(bRef, updatePayload);
    } catch (err) {
      console.warn('Firestore admin update notice (saved in local store):', err);
    }
  }
};

/**
 * Admin: Delete / Remove a booking
 */
export const deleteBookingAdmin = async (bookingId: string) => {
  deleteAdminMasterBooking(bookingId);

  if (!bookingId.startsWith('local-')) {
    try {
      const bRef = doc(db, 'bookings', bookingId);
      await deleteDoc(bRef);
    } catch (err) {
      console.warn('Firestore admin delete notice (deleted from local store):', err);
    }
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
