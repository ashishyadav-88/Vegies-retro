import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { createBookingInquiry } from '../services/bookingService';
import { RESTAURANT_INFO, UPI_PAYMENT_CONFIG } from '../data/restaurantData';
import { MENU_CATEGORIES, MENU_ITEMS } from '../data/menuData';
import { BookingInquiry, MenuItem } from '../types';
import { UpiPaymentCard } from './UpiPaymentCard';
import {
  X,
  Send,
  Phone,
  MessageCircle,
  ShoppingBag,
  MapPin,
  Utensils,
  Plus,
  Minus,
  CheckCircle2,
  Lock,
  UserCheck,
  AlertCircle,
  Bookmark,
  Trash2,
  Tag,
  Clock,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Receipt,
  Copy,
  Check,
  Sparkles,
  Banknote,
  Truck,
  RotateCcw,
} from 'lucide-react';

interface OrderItemEntry {
  item: MenuItem;
  quantity: number;
  numericPrice: number;
}

interface OrderFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup', prompt?: string) => void;
  onOpenUserBookings?: () => void;
  initialCategory?: string;
  initialDish?: string;
}

export const OrderFoodModal: React.FC<OrderFoodModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  onOpenUserBookings,
  initialCategory = 'all',
  initialDish = '',
}) => {
  const { user, userProfile, updateUserProfileData } = useAuth();

  // Wizard Step: 'form' (order details) | 'payment' (UPI QR payment)
  const [orderStep, setOrderStep] = useState<'form' | 'payment'>('form');

  // Form Fields as requested
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedDishId, setSelectedDishId] = useState<string>('');
  const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>('delivery');
  const [paymentChoice, setPaymentChoice] = useState<'upi' | 'cod'>('upi');
  const [timeSlot, setTimeSlot] = useState<string>('Immediate / As Soon As Possible');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Cart / Selected items list with prices
  const [selectedItems, setSelectedItems] = useState<OrderItemEntry[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<BookingInquiry | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Helper to parse price string like '₹240' to number 240
  const parsePrice = (priceStr?: string): number => {
    if (!priceStr) return 0;
    const num = parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  };

  // Filtered menu items based on chosen food type/category
  const filteredMenuItems = useMemo(() => {
    if (selectedCategory === 'all') return MENU_ITEMS;
    return MENU_ITEMS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setOrderStep('form');
      setSubmittedOrder(null);
      setSubmitError(null);

      // Autofill customer profile
      if (userProfile) {
        if (userProfile.displayName && !name) setName(userProfile.displayName);
        if (userProfile.phoneNumber && !phone) setPhone(userProfile.phoneNumber);
      } else if (user) {
        if (user.displayName && !name) setName(user.displayName);
        if (user.phoneNumber && !phone) setPhone(user.phoneNumber);
      }

      // Initial dish selection
      if (initialDish) {
        const found = MENU_ITEMS.find((m) => m.name.toLowerCase() === initialDish.toLowerCase());
        if (found) {
          setSelectedCategory(found.category);
          setSelectedDishId(found.id);
          setSelectedItems([
            {
              item: found,
              quantity: 1,
              numericPrice: parsePrice(found.price),
            },
          ]);
        }
      } else if (selectedItems.length === 0 && filteredMenuItems.length > 0) {
        const firstItem = filteredMenuItems[0];
        setSelectedDishId(firstItem.id);
        setSelectedItems([
          {
            item: firstItem,
            quantity: 1,
            numericPrice: parsePrice(firstItem.price),
          },
        ]);
      }
    }
  }, [isOpen, user, userProfile, initialDish]);

  if (!isOpen) return null;

  // Add or switch selected dish
  const handleSelectDishFromDropdown = (dishId: string) => {
    setSelectedDishId(dishId);
    const itemToAdd = MENU_ITEMS.find((i) => i.id === dishId);
    if (!itemToAdd) return;

    setSelectedItems((prev) => {
      const exists = prev.find((entry) => entry.item.id === dishId);
      if (exists) {
        return prev;
      }
      return [
        ...prev,
        {
          item: itemToAdd,
          quantity: 1,
          numericPrice: parsePrice(itemToAdd.price),
        },
      ];
    });
  };

  const handleQuickAddDish = (item: MenuItem) => {
    setSelectedItems((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.item.id === item.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          item,
          quantity: 1,
          numericPrice: parsePrice(item.price),
        },
      ];
    });
  };

  const handleUpdateQuantity = (dishId: string, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((entry) => {
          if (entry.item.id === dishId) {
            const newQty = entry.quantity + delta;
            return newQty > 0 ? { ...entry, quantity: newQty } : null;
          }
          return entry;
        })
        .filter(Boolean) as OrderItemEntry[]
    );
  };

  const handleRemoveItem = (dishId: string) => {
    setSelectedItems((prev) => prev.filter((entry) => entry.item.id !== dishId));
  };

  // Calculations
  const subtotal = selectedItems.reduce(
    (sum, entry) => sum + entry.numericPrice * entry.quantity,
    0
  );

  // Check if Paneer Tikka Platter is part of the order
  const hasPaneerTikka = selectedItems.some(
    (entry) =>
      entry.item.id === 'starter-1' ||
      entry.item.name.toLowerCase().includes('paneer tikka')
  );

  // Delivery is free if Paneer Tikka Platter is in the order or if subtotal is above ₹400
  const deliveryFee =
    orderType === 'delivery'
      ? hasPaneerTikka || subtotal >= 400
        ? 0
        : 30
      : 0;

  const grandTotal = subtotal + deliveryFee;

  // Step 1 Form validation -> Advance to Step 2 Payment or Submit COD
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      onOpenAuth('signin', 'Please sign in or register to place and track your food order.');
      return;
    }

    if (!name.trim()) {
      setSubmitError('Please enter your name.');
      return;
    }
    if (!phone.trim()) {
      setSubmitError('Please enter your mobile phone number.');
      return;
    }
    if (orderType === 'delivery' && !address.trim()) {
      setSubmitError('Please enter your delivery address.');
      return;
    }
    if (selectedItems.length === 0) {
      setSubmitError('Please select at least one food item to order.');
      return;
    }

    setSubmitError(null);

    // If Cash on Delivery is selected, submit directly
    if (paymentChoice === 'cod') {
      await handleConfirmCODOrder();
    } else {
      setOrderStep('payment');
    }
  };

  // Submit Cash on Delivery Order
  const handleConfirmCODOrder = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const itemsDescription = selectedItems
      .map(
        (entry) =>
          `${entry.item.name} (Qty: ${entry.quantity} @ ${entry.item.price || '₹' + entry.numericPrice} = ₹${entry.numericPrice * entry.quantity})`
      )
      .join(', ');

    const categoryObj = MENU_CATEGORIES.find((c) => c.id === selectedCategory);
    const categoryName = categoryObj ? categoryObj.name : 'Various';

    const orderNotes = [
      `Order Type: ${orderType === 'delivery' ? 'Home Delivery' : 'Takeaway / Parcel Pickup'}`,
      orderType === 'delivery' ? `Delivery Address: ${address.trim()}` : null,
      `Food Category: ${categoryName}`,
      `Items: ${itemsDescription}`,
      `Subtotal: ₹${subtotal} | Delivery: ₹${deliveryFee} | Grand Total: ₹${grandTotal}`,
      `Payment Choice: Cash on Delivery / Pay on Pickup (Pay ₹${grandTotal} on arrival)`,
      specialInstructions.trim() ? `Instructions: ${specialInstructions.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const saved = await createBookingInquiry({
        userId: user.uid,
        userName: name.trim(),
        userEmail: user.email || '',
        userPhone: phone.trim(),
        serviceType: orderType === 'delivery' ? 'Food Home Delivery' : 'Food Takeaway Order',
        guests: `${selectedItems.reduce((acc, i) => acc + i.quantity, 0)} Items (₹${grandTotal})`,
        timeSlot: timeSlot,
        customDish: itemsDescription,
        notes: orderNotes,
        status: 'Confirmed',
        paymentStatus: 'Pending',
        paymentMethod: 'Cash on Delivery',
        paymentAmount: grandTotal,
      });

      if (phone.trim() && (!userProfile?.phoneNumber || userProfile.phoneNumber !== phone.trim())) {
        try {
          await updateUserProfileData(name.trim() || userProfile?.displayName || '', phone.trim());
        } catch (e) {
          console.warn('Profile sync note:', e);
        }
      }

      setSubmittedOrder(saved);

      // WhatsApp notification
      const itemsListFormatted = selectedItems
        .map(
          (entry) =>
            `   • ${entry.item.name} x ${entry.quantity} (${entry.item.price || '₹' + entry.numericPrice}) = *₹${entry.numericPrice * entry.quantity}*`
        )
        .join('\n');

      const whatsappText =
        `Hello Vegies Restro 😊\n\n` +
        `🛍️ *NEW FOOD ORDER CONFIRMED* (#${saved.referenceId})\n\n` +
        `💵 *PAYMENT METHOD:* Cash on Delivery / Pay on Pickup (₹${grandTotal})\n\n` +
        `👤 *Customer:* ${name.trim()}\n` +
        `📞 *Mobile No:* ${phone.trim()}\n` +
        (orderType === 'delivery' ? `📍 *Delivery Address:*\n${address.trim()}\n\n` : `🥡 *Takeaway Order (Pickup)*\n\n`) +
        `🍽️ *Food Type / Category:* ${categoryName}\n\n` +
        `📦 *Selected Food Items & Prices:*\n` +
        `${itemsListFormatted}\n\n` +
        `💰 *Item Total:* ₹${subtotal}\n` +
        (orderType === 'delivery' ? `🛵 *Delivery Charge:* ${deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}\n` : '') +
        `🏷️ *Grand Total:* *₹${grandTotal}*\n` +
        `⏰ *Preferred Time:* ${timeSlot}\n` +
        (specialInstructions.trim() ? `📝 *Special Note:* ${specialInstructions.trim()}\n` : '') +
        `\nPlease prepare and confirm order. Thank you! 🥗✨`;
    } catch (err: any) {
      console.error('Failed to submit food order:', err);
      setSubmitError(err?.message || 'Failed to place food order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 Final Payment Verification & Order Confirmation
  const handleConfirmPaymentAndOrder = async (paymentData: {
    utr?: string;
    appUsed: string;
    paidAmount: number;
    upiId: string;
    payeeName: string;
  }) => {
    if (!user) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // Format selected food items summary with price
    const itemsDescription = selectedItems
      .map(
        (entry) =>
          `${entry.item.name} (Qty: ${entry.quantity} @ ${entry.item.price || '₹' + entry.numericPrice} = ₹${entry.numericPrice * entry.quantity})`
      )
      .join(', ');

    const categoryObj = MENU_CATEGORIES.find((c) => c.id === selectedCategory);
    const categoryName = categoryObj ? categoryObj.name : 'Various';

    const orderNotes = [
      `Order Type: ${orderType === 'delivery' ? 'Home Delivery' : 'Takeaway / Parcel Pickup'}`,
      orderType === 'delivery' ? `Delivery Address: ${address.trim()}` : null,
      `Food Category: ${categoryName}`,
      `Items: ${itemsDescription}`,
      `Subtotal: ₹${subtotal} | Delivery: ₹${deliveryFee} | Grand Total: ₹${grandTotal}`,
      `Payment: PAID via ${paymentData.appUsed || 'UPI'}${paymentData.utr ? ` | UTR: ${paymentData.utr}` : ''} | Payee: ${paymentData.payeeName} (${paymentData.upiId})`,
      specialInstructions.trim() ? `Instructions: ${specialInstructions.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      // 1. Store in Firestore and Local Master Storage with Paid status
      const saved = await createBookingInquiry({
        userId: user.uid,
        userName: name.trim(),
        userEmail: user.email || '',
        userPhone: phone.trim(),
        serviceType: orderType === 'delivery' ? 'Food Home Delivery' : 'Food Takeaway Order',
        guests: `${selectedItems.reduce((acc, i) => acc + i.quantity, 0)} Items (₹${grandTotal})`,
        timeSlot: timeSlot,
        customDish: itemsDescription,
        notes: orderNotes,
        status: 'Confirmed',
        paymentStatus: 'Paid',
        paymentMethod: 'UPI_QR',
        paymentAmount: grandTotal,
        paymentUpiId: paymentData.upiId,
        paymentPayee: paymentData.payeeName,
        paymentUtr: paymentData.utr || '',
        paymentAppUsed: paymentData.appUsed || 'UPI App',
        paymentPaidAt: new Date().toISOString(),
      });

      // 2. Update user profile phone if updated
      if (phone.trim() && (!userProfile?.phoneNumber || userProfile.phoneNumber !== phone.trim())) {
        try {
          await updateUserProfileData(name.trim() || userProfile?.displayName || '', phone.trim());
        } catch (e) {
          console.warn('Profile sync note:', e);
        }
      }

      setSubmittedOrder(saved);

      // 3. Format WhatsApp Dispatch with Payment details
      const itemsListFormatted = selectedItems
        .map(
          (entry) =>
            `   • ${entry.item.name} x ${entry.quantity} (${entry.item.price || '₹' + entry.numericPrice}) = *₹${entry.numericPrice * entry.quantity}*`
        )
        .join('\n');

      const whatsappText =
        `Hello Vegies Restro 😊\n\n` +
        `🛍️ *NEW FOOD ORDER CONFIRMED* (#${saved.referenceId})\n\n` +
        `✅ *PAYMENT STATUS: PAID (UPI)*\n` +
        `💳 *Payment Method:* Kotak 811 UPI QR\n` +
        `👤 *Payee Name:* ${paymentData.payeeName}\n` +
        `🆔 *UPI ID:* ${paymentData.upiId}\n` +
        (paymentData.utr ? `🔢 *UPI Ref / UTR No:* ${paymentData.utr}\n` : '') +
        `📱 *App Used:* ${paymentData.appUsed || 'UPI App'}\n` +
        `💰 *Amount Paid:* *₹${grandTotal}*\n\n` +
        `👤 *Customer:* ${name.trim()}\n` +
        `📞 *Mobile No:* ${phone.trim()}\n` +
        (orderType === 'delivery' ? `📍 *Delivery Address:*\n${address.trim()}\n\n` : `🥡 *Takeaway Order (Pickup)*\n\n`) +
        (saved.deliveryOtp ? `🔐 *Delivery Verification:* Confirmation OTP will be sent via SMS upon arrival of delivery boy.\n\n` : '') +
        `🍽️ *Food Type / Category:* ${categoryName}\n\n` +
        `📦 *Selected Food Items & Prices:*\n` +
        `${itemsListFormatted}\n\n` +
        `💰 *Item Total:* ₹${subtotal}\n` +
        (orderType === 'delivery' ? `🛵 *Delivery Charge:* ${deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}\n` : '') +
        `🏷️ *Grand Total:* *₹${grandTotal}*\n` +
        `⏰ *Preferred Time:* ${timeSlot}\n` +
        (specialInstructions.trim() ? `📝 *Special Note:* ${specialInstructions.trim()}\n` : '') +
        `\nOrder is PAID via UPI. Please prepare and dispatch. Thank you! 🥗✨`;
    } catch (err: any) {
      console.error('Failed to submit food order:', err);
      setSubmitError(err?.message || 'Failed to place food order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="order-food-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 text-left my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-inner">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="font-['Outfit',sans-serif] text-lg sm:text-xl font-bold text-white leading-tight">
                  {submittedOrder
                    ? '🎉 Order Confirmed!'
                    : orderStep === 'payment'
                    ? 'UPI Payment & Confirmation'
                    : 'Order Food Online'}
                </h3>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                {submittedOrder
                  ? 'Your order has been placed and sent to the kitchen'
                  : orderStep === 'payment'
                  ? 'Scan QR or Pay via UPI to confirm order'
                  : 'Fresh, Pure Veg Delicious Food • Doorstep Delivery & Takeaway'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="order-food-modal-close-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20"
            aria-label="Close food order modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Breadcrumb */}
        {!submittedOrder && (
          <div className="grid grid-cols-2 text-center text-xs font-bold border-b border-stone-200 bg-stone-50">
            <button
              type="button"
              onClick={() => setOrderStep('form')}
              className={`py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors ${
                orderStep === 'form'
                  ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">1</span>
              <span>1. Order Details</span>
            </button>
            <div
              className={`py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors ${
                orderStep === 'payment'
                  ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600'
                  : 'text-stone-400'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                orderStep === 'payment' ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-600'
              }`}>2</span>
              <span>2. UPI Payment (₹{grandTotal})</span>
            </div>
          </div>
        )}

        {/* User Auth Banner if Not Signed In */}
        {!user && !submittedOrder && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <p className="text-xs font-semibold text-amber-900">
                Please sign in to place, pay, and track your food order with your account.
              </p>
            </div>
            <button
              type="button"
              id="order-auth-prompt-btn"
              onClick={() => onOpenAuth('signin', 'Please sign in or register to place your food order')}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs"
            >
              Sign In / Register
            </button>
          </div>
        )}

        {/* User Authenticated Indicator */}
        {user && !submittedOrder && (
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900 shrink-0">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Ordering as <strong>{userProfile?.displayName || user.displayName || user.email}</strong>
              </span>
            </div>
            {onOpenUserBookings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUserBookings();
                }}
                className="text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>My Orders</span>
              </button>
            )}
          </div>
        )}

        {/* Scrollable Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {submittedOrder ? (
            /* ================= ORDER CONFIRMATION SCREEN ================= */
            <div className="py-2 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              {/* Celebration Hero Badge */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border-2 border-emerald-300">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-mono font-extrabold text-xs border border-emerald-200">
                      Order Ref #{submittedOrder.referenceId}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(submittedOrder.referenceId);
                          setCopiedRef(true);
                          setTimeout(() => setCopiedRef(false), 2000);
                        }}
                        className="ml-1 hover:text-emerald-700 cursor-pointer"
                        title="Copy Order ID"
                      >
                        {copiedRef ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </span>

                    <span className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${
                      submittedOrder.paymentStatus === 'Paid'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {submittedOrder.paymentStatus === 'Paid' ? '✅ Paid via UPI' : '💵 Cash on Delivery'}
                    </span>
                  </div>

                  <h4 className="font-['Outfit',sans-serif] font-extrabold text-stone-900 text-xl sm:text-2xl">
                    Order Placed Successfully!
                  </h4>
                  <p className="text-stone-600 text-xs sm:text-sm max-w-md mx-auto">
                    Thank you, <strong>{name}</strong>! Your pure veg meal is confirmed and the kitchen team has started preparation.
                  </p>

                  {/* Delivery Confirmation SMS on Arrival Card */}
                  {submittedOrder.deliveryOtp && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/80 border-2 border-amber-300 flex items-center justify-between gap-3 text-left shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center text-lg font-black shadow-inner shrink-0">
                          📱
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                            <span>Doorstep SMS OTP Verification</span>
                          </p>
                          <p className="text-xs text-stone-700">
                            Your 4-digit confirmation OTP will be sent via SMS to <strong>{phone}</strong> upon arrival of our delivery boy.
                          </p>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-950 font-bold text-xs tracking-wide shadow-2xs shrink-0">
                        📲 SMS on Arrival
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Order Tracker Progress Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900 to-emerald-950 text-white shadow-md border border-stone-800 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      Live Kitchen Status
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-extrabold bg-emerald-900/60 border border-emerald-700/60 px-2.5 py-1 rounded-full text-emerald-200">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ETA: 30 - 45 Mins</span>
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="space-y-1">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center mx-auto shadow-md">
                      ✓
                    </div>
                    <span className="block text-[11px] font-bold text-emerald-300">Order Confirmed</span>
                    <span className="block text-[9px] text-stone-400">Received by Kitchen</span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center mx-auto shadow-md">
                      🍳
                    </div>
                    <span className="block text-[11px] font-bold text-amber-300">In Kitchen</span>
                    <span className="block text-[9px] text-stone-400">Cooking Fresh</span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-7 h-7 rounded-full bg-stone-800 border border-stone-700 text-stone-400 font-bold text-xs flex items-center justify-center mx-auto">
                      🛵
                    </div>
                    <span className="block text-[11px] font-bold text-stone-400">
                      {orderType === 'delivery' ? 'Out for Delivery' : 'Ready for Pickup'}
                    </span>
                    <span className="block text-[9px] text-stone-500">Packing & Dispatch</span>
                  </div>
                </div>
              </div>

              {/* Order & Payment Summary Breakdown */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-2">
                <div className="flex justify-between border-b border-stone-200 pb-1.5">
                  <span className="text-stone-500 font-medium">Order Placed Time:</span>
                  <span className="font-bold text-stone-900 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {new Date(submittedOrder.createdAt || Date.now()).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}, {new Date(submittedOrder.createdAt || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-1.5">
                  <span className="text-stone-500 font-medium">Customer:</span>
                  <span className="font-bold text-stone-900">{name} ({phone})</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-1.5">
                  <span className="text-stone-500 font-medium">Order Mode:</span>
                  <span className="font-bold text-emerald-700">
                    {orderType === 'delivery' ? 'Home Delivery' : 'Takeaway / Parcel Pickup'}
                  </span>
                </div>
                {orderType === 'delivery' && (
                  <div className="border-b border-stone-200 pb-1.5">
                    <span className="text-stone-500 font-medium block">Delivery Address:</span>
                    <span className="font-semibold text-stone-800">{address}</span>
                  </div>
                )}
                <div>
                  <span className="text-stone-500 font-medium block mb-1">Ordered Dishes:</span>
                  <div className="space-y-1 bg-white p-2.5 rounded-xl border border-stone-200">
                    {selectedItems.map((entry) => (
                      <div key={entry.item.id} className="flex justify-between text-stone-800 font-medium">
                        <span>{entry.item.name} × {entry.quantity}</span>
                        <span className="font-bold">₹{entry.numericPrice * entry.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between pt-1 border-t border-stone-200 text-stone-900 font-bold text-sm">
                  <span>Grand Total:</span>
                  <span className="text-emerald-700">₹{grandTotal}</span>
                </div>
              </div>

              {/* Post-Order Action Buttons */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={`https://wa.me/91${RESTAURANT_INFO.phone}?text=${encodeURIComponent(
                    `Hello Vegies Restro, I placed food order #${submittedOrder.referenceId} for ₹${grandTotal}. Please confirm preparation status! 🥗`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all text-center"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Open WhatsApp Receipt</span>
                </a>

                <a
                  href={`tel:${RESTAURANT_INFO.phone}`}
                  className="py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-98 text-amber-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all text-center"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span>Call Kitchen ({RESTAURANT_INFO.formattedPhone})</span>
                </a>

                {onOpenUserBookings && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUserBookings();
                    }}
                    className="py-2.5 px-3 rounded-xl border border-stone-300 hover:bg-stone-100 active:scale-98 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-emerald-700" />
                    <span>View in My Orders</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSubmittedOrder(null);
                    setOrderStep('form');
                    setSelectedItems([]);
                  }}
                  className="py-2.5 px-3 rounded-xl border border-stone-300 hover:bg-stone-100 active:scale-98 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
                  <span>Order More Dishes</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-stone-500 hover:text-stone-800 text-xs font-semibold cursor-pointer transition-colors"
              >
                Close Window
              </button>
            </div>
          ) : orderStep === 'payment' ? (
            /* STEP 2: PAYMENT WITH UPI QR CARD */
            <div className="space-y-3">
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}
              <UpiPaymentCard
                amount={grandTotal}
                orderRef={name ? `${name.split(' ')[0]}` : 'Order'}
                customerName={name}
                isSubmitting={isSubmitting}
                onPaymentConfirmed={handleConfirmPaymentAndOrder}
                onPayCashDelivery={handleConfirmCODOrder}
                onBackToEdit={() => setOrderStep('form')}
              />
            </div>
          ) : (
            /* STEP 1: ORDER FORM */
            <form onSubmit={handleProceedToPayment} className="space-y-4">
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Order Mode (Delivery vs Takeaway) */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setOrderType('delivery')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    orderType === 'delivery'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Home Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('takeaway')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    orderType === 'takeaway'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Takeaway / Parcel</span>
                </button>
              </div>

              {/* 1. Name & Mobile No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="order-name" className="block text-xs font-bold text-stone-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="order-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="order-phone" className="block text-xs font-bold text-stone-700 mb-1">
                    Mobile No. *
                  </label>
                  <input
                    type="tel"
                    id="order-phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* 2. Address (If Delivery) */}
              <div>
                <label htmlFor="order-address" className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                  <span>Delivery Address {orderType === 'delivery' ? '*' : '(Optional)'}</span>
                  <span className="text-[11px] text-stone-400 font-normal">Flat, Building, Landmark, Area</span>
                </label>
                <textarea
                  id="order-address"
                  required={orderType === 'delivery'}
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Flat 302, Sai Heritage, Near Santosh Bhuvan, Nalasopara (East)"
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                />
              </div>

              {/* 3. Type of Food (Category Selector) */}
              <div>
                <label htmlFor="order-food-type" className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Type of Food (Category)</span>
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {MENU_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          const matching = cat.id === 'all' ? MENU_ITEMS : MENU_ITEMS.filter((i) => i.category === cat.id);
                          if (matching.length > 0) {
                            setSelectedDishId(matching[0].id);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Select Food with Price */}
              <div>
                <label htmlFor="order-select-food" className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Select Food with Price *</span>
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold">100% Pure Veg</span>
                </label>

                {/* Dropdown for quick food selection */}
                <div className="flex gap-2">
                  <select
                    id="order-select-food"
                    value={selectedDishId}
                    onChange={(e) => handleSelectDishFromDropdown(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer font-medium"
                  >
                    {filteredMenuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — {item.price || 'Price on request'}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const itemToAdd = MENU_ITEMS.find((i) => i.id === selectedDishId);
                      if (itemToAdd) handleQuickAddDish(itemToAdd);
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Selected Food Items List with Quantity & Prices */}
                <div className="mt-3 space-y-2">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                    Your Order Items ({selectedItems.length})
                  </span>

                  {selectedItems.length === 0 ? (
                    <div className="p-3 rounded-xl bg-stone-50 border border-dashed border-stone-200 text-center text-xs text-stone-500">
                      No items selected. Choose a dish from above to add.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedItems.map((entry) => (
                        <div
                          key={entry.item.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <h5 className="font-bold text-stone-900 truncate">{entry.item.name}</h5>
                            </div>
                            <span className="text-[11px] text-stone-500 font-medium">
                              Unit Price: {entry.item.price || '₹' + entry.numericPrice}
                            </span>
                          </div>

                          {/* Quantity and Price */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(entry.item.id, -1)}
                                className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-stone-100 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-bold text-stone-800 text-xs">
                                {entry.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(entry.item.id, 1)}
                                className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-stone-100 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <span className="font-bold text-emerald-800 min-w-[50px] text-right">
                              ₹{entry.numericPrice * entry.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(entry.item.id)}
                              className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Selector (UPI vs Cash on Delivery) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Choose Payment Method</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('upi')}
                    className={`p-3 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between ${
                      paymentChoice === 'upi'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-xs'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs">Pay via UPI (1-Click/QR)</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                        Instant
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500">Google Pay, PhonePe, Paytm or QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentChoice('cod')}
                    className={`p-3 rounded-2xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between ${
                      paymentChoice === 'cod'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-xs'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs">Cash on Delivery</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-800">
                        COD
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500">Pay cash when food arrives</span>
                  </button>
                </div>
              </div>

              {/* Preferred Time & Special Instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="order-time" className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-500" />
                    <span>Preferred Delivery/Pickup Time</span>
                  </label>
                  <select
                    id="order-time"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
                  >
                    <option value="Immediate / As Soon As Possible">Immediate (Within 30-45 mins)</option>
                    <option value="Lunch (12:00 PM - 3:30 PM)">Lunch Time (12:00 PM - 3:30 PM)</option>
                    <option value="Evening Snacks (4:00 PM - 7:00 PM)">Evening Snacks (4:00 PM - 7:00 PM)</option>
                    <option value="Dinner (7:30 PM - 10:30 PM)">Dinner Time (7:30 PM - 10:30 PM)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="order-instructions" className="block text-xs font-bold text-stone-700 mb-1">
                    Cooking / Spice Note (Optional)
                  </label>
                  <input
                    type="text"
                    id="order-instructions"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Mild spicy, Jain preparation..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Price Calculation Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-1.5">
                <div className="flex justify-between text-stone-700">
                  <span>Item Subtotal:</span>
                  <span className="font-bold">₹{subtotal}</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="flex justify-between text-stone-700">
                    <span>Delivery Charge:</span>
                    <span className="font-bold">
                      {deliveryFee === 0 ? (
                        <span className="text-emerald-700 font-bold">
                          {hasPaneerTikka
                            ? 'FREE (Paneer Tikka Special Offer 🎉)'
                            : 'FREE (Order Above ₹400)'}
                        </span>
                      ) : (
                        `₹${deliveryFee}`
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-emerald-200 text-sm font-extrabold text-stone-900">
                  <span>Total Amount Payable:</span>
                  <span className="text-emerald-800">₹{grandTotal}</span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={selectedItems.length === 0 || isSubmitting}
                  id="order-food-proceed-payment-btn"
                  className={`flex-1 py-3.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    !user
                      ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-amber-950/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {!user ? (
                    <>
                      <Lock className="w-4 h-4 text-amber-950" />
                      <span>Sign In to Place Order (₹{grandTotal})</span>
                    </>
                  ) : paymentChoice === 'cod' ? (
                    <>
                      <Banknote className="w-4 h-4" />
                      <span>Confirm & Place Order (Cash on Delivery: ₹{grandTotal})</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Proceed to Payment (₹{grandTotal})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <a
                  href={`tel:${RESTAURANT_INFO.phone}`}
                  className="px-4 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  title="Call restaurant directly"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span className="hidden sm:inline">Call Now</span>
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
