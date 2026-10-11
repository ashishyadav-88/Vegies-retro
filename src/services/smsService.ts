import { BookingInquiry } from '../types';
import { RESTAURANT_INFO } from '../data/restaurantData';

export interface SmsDispatchRecord {
  id: string;
  bookingId: string;
  referenceId: string;
  customerName: string;
  customerPhone: string;
  otp: string;
  messageText: string;
  status: 'Sent' | 'Delivered' | 'Failed';
  timestamp: number;
}

const STORAGE_KEY_SMS_LOGS = 'vegies_sms_dispatch_logs';

/**
 * Format SMS message to be sent to customer when the delivery boy arrives at doorstep
 */
export const formatDeliveryBoyArrivalSms = (booking: BookingInquiry): string => {
  const customerName = booking.userName?.trim() || 'Customer';
  const refId = booking.referenceId || 'VR-ORDER';
  const otp = booking.deliveryOtp || '----';

  return `Vegies Restro Alert 🛵: Hello ${customerName}, our delivery partner has arrived at your doorstep with your pure veg order #${refId}! 

🔐 Your Delivery Confirmation OTP is: ${otp}

Please share this 4-digit OTP with the delivery boy upon receiving your food packet. 

📞 Helpline: +91 ${RESTAURANT_INFO.phone}. Enjoy your delicious meal! 🥗✨`;
};

/**
 * Format SMS message for out-for-delivery dispatch
 */
export const formatOutForDeliverySms = (booking: BookingInquiry): string => {
  const customerName = booking.userName?.trim() || 'Customer';
  const refId = booking.referenceId || 'VR-ORDER';

  return `Vegies Restro Alert 🛵: Hello ${customerName}, your food order #${refId} is OUT FOR DELIVERY! Our rider is on the way with your hot meal. Note: Your confirmation OTP will be sent via SMS when the rider reaches your location. 🥗✨`;
};

/**
 * Open native SMS app or web SMS intent with customer phone number and body
 */
export const openSmsDirect = (phone: string, text: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return false;

  const phoneWithCountry =
    cleanPhone.startsWith('91') && cleanPhone.length === 12
      ? cleanPhone
      : cleanPhone.length === 10
      ? `91${cleanPhone}`
      : cleanPhone.startsWith('0') && cleanPhone.length === 11
      ? `91${cleanPhone.slice(1)}`
      : cleanPhone;

  // iOS uses '&body=', Android & others use '?body='
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  const smsUrl = `sms:+${phoneWithCountry}${separator}body=${encodeURIComponent(text)}`;

  try {
    const a = document.createElement('a');
    a.href = smsUrl;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 200);
    return true;
  } catch (err) {
    console.warn('SMS launcher notice (page preserved, no reload):', err);
    return false;
  }
};

/**
 * Send arrival SMS with OTP and save log
 */
export const triggerDeliveryArrivalSms = async (
  booking: BookingInquiry
): Promise<{ success: boolean; message: string; record: SmsDispatchRecord }> => {
  const smsText = formatDeliveryBoyArrivalSms(booking);
  const phone = booking.userPhone;

  // Launch SMS intent
  openSmsDirect(phone, smsText);

  // Save to local SMS dispatch logs
  const record: SmsDispatchRecord = {
    id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    bookingId: booking.id || booking.referenceId,
    referenceId: booking.referenceId,
    customerName: booking.userName || 'Customer',
    customerPhone: booking.userPhone,
    otp: booking.deliveryOtp || '',
    messageText: smsText,
    status: 'Sent',
    timestamp: Date.now(),
  };

  try {
    const currentLogs = getSmsLogs();
    const updated = [record, ...currentLogs.slice(0, 99)];
    localStorage.setItem(STORAGE_KEY_SMS_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save SMS log:', e);
  }

  return {
    success: true,
    message: `SMS with OTP (${booking.deliveryOtp}) dispatched to ${booking.userPhone} for rider arrival!`,
    record,
  };
};

/**
 * Retrieve recent SMS dispatch logs
 */
export const getSmsLogs = (): SmsDispatchRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SMS_LOGS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};
