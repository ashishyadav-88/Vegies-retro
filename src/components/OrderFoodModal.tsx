import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { createBookingInquiry } from '../services/bookingService';
import { RESTAURANT_INFO } from '../data/restaurantData';
import { MENU_CATEGORIES, MENU_ITEMS } from '../data/menuData';
import { BookingInquiry, MenuItem } from '../types';
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

  // Form Fields as requested
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedDishId, setSelectedDishId] = useState<string>('');
  const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>('delivery');
  const [timeSlot, setTimeSlot] = useState<string>('Immediate / As Soon As Possible');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Cart / Selected items list with prices
  const [selectedItems, setSelectedItems] = useState<OrderItemEntry[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<BookingInquiry | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
  const deliveryFee = orderType === 'delivery' ? (subtotal >= 400 ? 0 : 30) : 0;
  const grandTotal = subtotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
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
      specialInstructions.trim() ? `Instructions: ${specialInstructions.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      // 1. Store in Firestore and Local Master Storage
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

      // 3. Format WhatsApp Dispatch
      const itemsListFormatted = selectedItems
        .map(
          (entry) =>
            `   • ${entry.item.name} x ${entry.quantity} (${entry.item.price || '₹' + entry.numericPrice}) = *₹${entry.numericPrice * entry.quantity}*`
        )
        .join('\n');

      const whatsappText =
        `Hello Vegies Restro 😊\n\n` +
        `🛍️ *NEW FOOD ORDER* (#${saved.referenceId})\n\n` +
        `👤 *Customer:* ${name.trim()}\n` +
        `📞 *Mobile No:* ${phone.trim()}\n` +
        (orderType === 'delivery' ? `📍 *Delivery Address:*\n${address.trim()}\n\n` : `🥡 *Takeaway Order (Pickup)*\n\n`) +
        `🍽️ *Food Type / Category:* ${categoryName}\n\n` +
        `📦 *Selected Food Items & Prices:*\n` +
        `${itemsListFormatted}\n\n` +
        `💰 *Item Total:* ₹${subtotal}\n` +
        (orderType === 'delivery' ? `🛵 *Delivery Charge:* ${deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}\n` : '') +
        `🏷️ *Grand Total Payable:* *₹${grandTotal}*\n` +
        `⏰ *Preferred Time:* ${timeSlot}\n` +
        (specialInstructions.trim() ? `📝 *Special Note:* ${specialInstructions.trim()}\n` : '') +
        `\nPlease confirm and prepare my order. Thank you! 🥗✨`;

      // Auto trigger WhatsApp
      setTimeout(() => {
        window.open(
          `https://wa.me/91${RESTAURANT_INFO.phone}?text=${encodeURIComponent(whatsappText)}`,
          '_blank'
        );
      }, 700);
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
                  Order Food Online
                </h3>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                Fresh, Pure Veg Delicious Food • Doorstep Delivery & Takeaway
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

        {/* User Auth Banner if Not Signed In */}
        {!user && !submittedOrder && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <p className="text-xs font-semibold text-amber-900">
                Please sign in to place and track your food order with your account.
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
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900 shrink-0">
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
            <div className="py-6 text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-xs mb-1">
                  Order Ref #{submittedOrder.referenceId}
                </span>
                <h4 className="font-['Outfit',sans-serif] font-bold text-stone-900 text-lg sm:text-xl">
                  Order Placed Successfully!
                </h4>
                <p className="text-stone-600 text-xs sm:text-sm max-w-sm mx-auto mt-1">
                  Your food order is confirmed and logged in your profile. We have also opened WhatsApp to notify the Vegies Restro kitchen!
                </p>
              </div>

              {/* Order Bill Summary */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-2">
                <div className="flex justify-between border-b border-stone-200 pb-1.5">
                  <span className="text-stone-500 font-medium">Customer:</span>
                  <span className="font-bold text-stone-900">{name} ({phone})</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-1.5">
                  <span className="text-stone-500 font-medium">Type:</span>
                  <span className="font-bold text-emerald-700">
                    {orderType === 'delivery' ? 'Home Delivery' : 'Takeaway Pickup'}
                  </span>
                </div>
                {orderType === 'delivery' && (
                  <div className="border-b border-stone-200 pb-1.5">
                    <span className="text-stone-500 font-medium block">Delivery Address:</span>
                    <span className="font-semibold text-stone-800">{address}</span>
                  </div>
                )}
                <div>
                  <span className="text-stone-500 font-medium block mb-1">Selected Dishes:</span>
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
                    <span>View in My Orders / History</span>
                  </button>
                )}

                <a
                  href={`tel:${RESTAURANT_INFO.phone}`}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4 fill-current" />
                  <span>Call {RESTAURANT_INFO.formattedPhone} for Urgent Update</span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                        <span className="text-emerald-700 font-bold">FREE (Above ₹400)</span>
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

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || selectedItems.length === 0}
                  id="order-food-submit-btn"
                  className={`flex-1 py-3.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    !user
                      ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 shadow-amber-950/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : !user ? (
                    <>
                      <Lock className="w-4 h-4 text-amber-950" />
                      <span>Sign In & Place Order (₹{grandTotal})</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      <span>Confirm Order & Send to WhatsApp (₹{grandTotal})</span>
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
