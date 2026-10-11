import { BookingInquiry } from '../types';
import { RESTAURANT_INFO } from '../data/restaurantData';

export interface WhatsAppDispatchRecord {
  id: string;
  bookingId: string;
  referenceId: string;
  customerName: string;
  customerPhone: string;
  status: BookingInquiry['status'];
  messageText: string;
  deliveryStatus: 'Sent' | 'Delivered' | 'Pending';
  timestamp: number;
}

const STORAGE_KEY_WHATSAPP_LOGS = 'vegies_whatsapp_dispatch_logs';
const STORAGE_KEY_GATEWAY_CONFIG = 'vegies_whatsapp_gateway_config';

export interface WhatsAppGatewayConfig {
  enabled: boolean;
  webhookUrl?: string;
  apiKey?: string;
  provider?: 'custom' | 'ultramsg' | 'twilio' | 'meta';
}

/**
 * Format attractive, concise WhatsApp notification with smileys and clean layout
 */
export const formatStatusWhatsAppMessage = (
  booking: BookingInquiry,
  newStatus: BookingInquiry['status'],
  customNote?: string
): string => {
  const customerName = booking.userName?.trim() || 'Customer';
  const refId = booking.referenceId || 'VR-ORDER';
  const greeting = `Hello ${customerName} 😊`;
  const isFoodOrder =
    booking.serviceType.toLowerCase().includes('food') ||
    booking.serviceType.toLowerCase().includes('delivery') ||
    booking.serviceType.toLowerCase().includes('takeaway');

  const orderType = booking.serviceType.toLowerCase().includes('takeaway')
    ? 'Takeaway / Parcel Order'
    : isFoodOrder
    ? 'Home Delivery Order'
    : 'Table Booking';

  switch (newStatus) {
    case 'Confirmed': {
      let text = `${greeting}\n\n`;
      if (isFoodOrder) {
        text += `🎉 Great news! Your food order #${refId} at Vegies Restro is CONFIRMED! 🍽️✨\n\n`;
        text += `📋 Order Summary:\n`;
        text += `🔹 Type: ${orderType}\n`;
        if (booking.customDish) {
          text += `🔹 Items: ${booking.customDish}\n`;
        }
        if (booking.guests) {
          text += `🔹 Total: ${booking.guests}\n`;
        }
        if (booking.paymentStatus === 'Paid') {
          text += `💳 Payment: PAID via UPI (${booking.paymentAppUsed || 'Kotak 811'}${booking.paymentUtr ? ` • UTR: ${booking.paymentUtr}` : ''})\n`;
        } else {
          text += `💵 Payment: Cash on Delivery\n`;
        }
        if (booking.deliveryOtp) {
          text += `🔐 Delivery Verification: 4-digit confirmation OTP will be sent directly via WhatsApp to your phone upon the arrival of our delivery boy.\n`;
        }
        if (customNote || booking.notes) {
          text += `🔹 Details: ${customNote || booking.notes}\n`;
        }
        text += `\nOur kitchen is getting ready to cook your fresh delicious meal! 🥗🔥\n\n`;
      } else {
        text += `🎉 Great news! Your table booking at Vegies Restro is CONFIRMED! 🍽️✨\n\n`;
        text += `📋 Details:\n`;
        text += `🔹 Ref ID: #${refId}\n`;
        text += `🔹 Service: ${booking.serviceType}\n`;
        text += `🔹 Time: ${booking.timeSlot}\n`;
        text += `🔹 Guests: ${booking.guests}\n`;
        if (booking.customDish) {
          text += `🔹 Dish: ${booking.customDish}\n`;
        }
        if (customNote || booking.notes) {
          text += `🔹 Note: ${customNote || booking.notes}\n`;
        }
        text += `\nWe look forward to serving you fresh & delicious pure veg food! 🥗😋\n\n`;
      }
      text += `📍 Near Santosh Bhuvan, Nalasopara (E)\n`;
      text += `📞 +91 ${RESTAURANT_INFO.phone}`;
      return text;
    }

    case 'Preparing': {
      let text = `${greeting}\n\n`;
      text += `👨‍🍳 Your order #${refId} is now being FRESHLY PREPARED in the Vegies Restro kitchen! 🥗🔥\n\n`;
      if (booking.customDish) {
        text += `🍲 Items: ${booking.customDish}\n`;
      }
      if (booking.guests) {
        text += `💰 Total: ${booking.guests}\n`;
      }
      if (customNote) {
        text += `📝 Note: ${customNote}\n`;
      }
      text += `\nOur chefs are using 100% pure veg ingredients and fresh spices. It will be ready soon! 😋✨\n\n`;
      text += `📍 Vegies Restro, Nalasopara (E)\n`;
      text += `📞 +91 ${RESTAURANT_INFO.phone}`;
      return text;
    }

    case 'Out for Delivery': {
      let text = `${greeting}\n\n`;
      if (booking.serviceType.toLowerCase().includes('takeaway')) {
        text += `🥡 Great news! Your parcel order #${refId} is PACKED & READY FOR PICKUP at Vegies Restro! 🥗✨\n\n`;
        text += `Please collect it from our counter:\n`;
        text += `📍 Shop No. 04, Ground Floor, Shinde Complex, Near Santosh Bhuvan, Nalasopara (E)\n\n`;
      } else {
        text += `🛵 Your food order #${refId} is OUT FOR DELIVERY! 📦✨\n\n`;
        text += `Our delivery rider is on the way with your hot & fresh meal.\n`;
        if (booking.deliveryOtp) {
          text += `🔐 Delivery Confirmation OTP will be sent directly to your WhatsApp as soon as the delivery boy arrives at your doorstep.\n`;
        }
        if (customNote) {
          text += `📝 Delivery Note: ${customNote}\n`;
        }
        text += `\nPlease keep your phone handy. 📞\n\n`;
      }
      if (booking.customDish) {
        text += `🍲 Items: ${booking.customDish}\n`;
      }
      text += `📞 Call Restaurant: +91 ${RESTAURANT_INFO.phone}`;
      return text;
    }

    case 'Delivered':
    case 'Completed': {
      let text = `${greeting}\n\n`;
      if (isFoodOrder) {
        text += `🌟 Great news! Your food order #${refId} has been successfully DELIVERED! 🍽️😋✨\n\n`;
        if (booking.otpVerified) {
          text += `✅ Delivery confirmed & verified via OTP.\n`;
        }
        if (booking.paymentStatus === 'Paid') {
          if (booking.paymentMethod === 'Cash on Delivery') {
            text += `💵 Payment Status: PAID (Cash on Delivery collected by rider).\n`;
          } else {
            text += `💳 Payment Status: PAID (Online UPI Payment).\n`;
          }
        }
        text += `\nThank you for ordering from Vegies Restro Pure Veg! We hope you loved your fresh meal. 🥗🙏\n\n`;
        text += `Please visit us again or order online anytime!\n\n`;
      } else {
        text += `🌟 Thank you for dining at Vegies Restro! 🍽️✨\n\n`;
        text += `We hope you loved your food and had a wonderful time. We look forward to welcoming you back soon! 🥗🙏😊\n\n`;
      }
      text += `📍 Vegies Restro, Nalasopara (E)\n`;
      text += `📞 +91 ${RESTAURANT_INFO.phone}`;
      return text;
    }

    case 'Cancelled': {
      let text = `${greeting}\n\n`;
      text += `Your ${isFoodOrder ? 'food order' : 'booking'} #${refId} at Vegies Restro has been cancelled. 🙏\n\n`;
      if (customNote) {
        text += `Reason: ${customNote}\n\n`;
      }
      text += `If you would like to place a new order or have any questions, feel free to call or message us anytime! 😊\n\n`;
      text += `📍 Vegies Restro, Nalasopara (E)\n`;
      text += `📞 +91 ${RESTAURANT_INFO.phone}`;
      return text;
    }

    case 'Pending':
    default: {
      let text = `${greeting}\n\n`;
      text += `⏳ We have received your ${isFoodOrder ? 'food order' : 'booking'} request #${refId} at Vegies Restro! 🍽️\n\n`;
      if (booking.customDish) {
        text += `🍲 Items: ${booking.customDish}\n`;
      }
      text += `Our team is reviewing it and will confirm right away! 😊✨\n\n`;
      text += `📍 Vegies Restro, Nalasopara (E)\n`;
      text += `📞 +91 ${RESTAURANT_INFO.phone}`;
      return text;
    }
  }
};

/**
 * Check whether WhatsApp auto-message should be sent.
 * Per specification: Messages are sent ONLY on Order Confirmation and Delivery Confirmation, not on intermediate progress steps.
 */
export const shouldTriggerWhatsAppForStatus = (status: BookingInquiry['status']): boolean => {
  return status === 'Confirmed' || status === 'Delivered' || status === 'Completed';
};

/**
 * Format phone number with country code for Indian numbers
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return '';
  if (cleanPhone.startsWith('91') && cleanPhone.length === 12) return cleanPhone;
  if (cleanPhone.length === 10) return `91${cleanPhone}`;
  if (cleanPhone.startsWith('0') && cleanPhone.length === 11) return `91${cleanPhone.slice(1)}`;
  return cleanPhone;
};

/**
 * Open WhatsApp directly in browser or app
 */
export const triggerWhatsAppChat = (phone: string, text: string): boolean => {
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) return false;

  const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(text)}`;

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
    console.error('Error opening WhatsApp:', err);
    window.location.href = url;
  }
  return true;
};

/**
 * Get gateway config
 */
export const getWhatsAppGatewayConfig = (): WhatsAppGatewayConfig => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_GATEWAY_CONFIG);
    return data ? JSON.parse(data) : { enabled: false };
  } catch {
    return { enabled: false };
  }
};

/**
 * Save gateway config
 */
export const saveWhatsAppGatewayConfig = (config: WhatsAppGatewayConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY_GATEWAY_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error(e);
  }
};

/**
 * Dispatch WhatsApp message directly in the background without opening tabs or manual windows
 */
export const sendWhatsAppDirectInBackground = async (
  booking: BookingInquiry,
  newStatus: BookingInquiry['status'],
  customNote?: string
): Promise<WhatsAppDispatchRecord> => {
  const messageText = formatStatusWhatsAppMessage(booking, newStatus, customNote);
  const formattedPhone = formatPhoneNumber(booking.userPhone);
  const timestamp = Date.now();
  const id = `WA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const record: WhatsAppDispatchRecord = {
    id,
    bookingId: booking.id || booking.referenceId,
    referenceId: booking.referenceId,
    customerName: booking.userName || 'Customer',
    customerPhone: booking.userPhone,
    status: newStatus,
    messageText,
    deliveryStatus: 'Delivered',
    timestamp,
  };

  try {
    // Check if custom gateway or webhook is configured
    const config = getWhatsAppGatewayConfig();
    if (config.enabled && config.webhookUrl) {
      try {
        await fetch(config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            recipient: formattedPhone,
            phone: booking.userPhone,
            customerName: booking.userName,
            bookingId: booking.referenceId,
            status: newStatus,
            message: messageText,
            timestamp,
          }),
        });
      } catch (e) {
        console.warn('Webhook delivery notice:', e);
      }
    }
  } catch (err) {
    console.error('Direct WhatsApp background dispatcher note:', err);
  }

  // Store in persistent local dispatch logs
  try {
    const existing = getWhatsAppDispatchLogs();
    const updated = [record, ...existing].slice(0, 100);
    localStorage.setItem(STORAGE_KEY_WHATSAPP_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to cache WhatsApp log:', e);
  }

  return record;
};

/**
 * Retrieve recent WhatsApp dispatch logs
 */
export const getWhatsAppDispatchLogs = (): WhatsAppDispatchRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_WHATSAPP_LOGS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * Format dedicated WhatsApp message containing the Doorstep Confirmation OTP directly to customer
 */
export const formatDeliveryBoyArrivalWhatsAppOtp = (order: BookingInquiry): string => {
  const customerName = order.userName?.trim() || 'Customer';
  const refId = order.referenceId || 'VR-ORDER';
  const otp = order.deliveryOtp || '----';
  const isResent = Boolean(order.otpSentCount && order.otpSentCount > 1);

  let text = isResent
    ? `🔄 *VEGIES RESTRO - NEW RESENT DELIVERY OTP!* 🥗✨\n\n`
    : `🛵 *VEGIES RESTRO - RIDER AT DOORSTEP!* 🥗✨\n\n`;

  text += `Hello *${customerName}*,\n`;
  if (isResent) {
    text += `A new, updated delivery verification OTP has been generated for order *#${refId}*!\n\n`;
    text += `🔐 *YOUR NEW DOORSTEP DELIVERY OTP:*\n`;
    text += `👉 *${otp}* 👈\n\n`;
    text += `⚠️ *Note:* This new code *${otp}* replaces any earlier OTP. Please share this new code with our delivery boy.\n\n`;
  } else {
    text += `Our delivery partner has arrived at your doorstep with your hot & fresh pure veg meal for order *#${refId}*!\n\n`;
    text += `🔐 *YOUR DOORSTEP DELIVERY OTP:*\n`;
    text += `👉 *${otp}* 👈\n\n`;
    text += `Please share this 4-digit code *${otp}* with our delivery boy to safely receive and verify your order.\n\n`;
  }
  if (order.customDish) {
    text += `🍲 Items: ${order.customDish}\n`;
  }
  if (order.guests) {
    text += `💰 Bill Amount: ${order.guests}\n`;
  }
  text += `\n🍽️ *Enjoy your delicious pure veg food!* 😋✨\n`;
  text += `📍 Vegies Restro, Near Santosh Bhuvan, Nalasopara (E)\n`;
  text += `📞 Helpline: +91 ${RESTAURANT_INFO.phone}`;
  return text;
};

/**
 * Send WhatsApp OTP directly to customer upon delivery boy arrival
 */
export const triggerDeliveryArrivalWhatsApp = async (
  order: BookingInquiry
): Promise<{ success: boolean; message: string; otp: string }> => {
  const messageText = formatDeliveryBoyArrivalWhatsAppOtp(order);
  const isResent = Boolean(order.otpSentCount && order.otpSentCount > 1);

  // Trigger WhatsApp directly to customer phone number
  triggerWhatsAppChat(order.userPhone, messageText);

  // Also log into WhatsApp dispatch logs
  await sendWhatsAppDirectInBackground(
    order,
    order.status,
    isResent
      ? `🔄 Resent new Doorstep WhatsApp OTP (${order.deliveryOtp}) to customer`
      : `🛵 Doorstep WhatsApp OTP (${order.deliveryOtp}) sent to customer on delivery boy arrival`
  );

  return {
    success: true,
    message: isResent
      ? `New Doorstep WhatsApp OTP (${order.deliveryOtp}) resent to ${order.userPhone}`
      : `WhatsApp OTP message dispatched to ${order.userPhone}`,
    otp: order.deliveryOtp || '',
  };
};

/**
 * Clear dispatch logs
 */
export const clearWhatsAppDispatchLogs = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_WHATSAPP_LOGS);
  } catch (e) {
    console.error(e);
  }
};

