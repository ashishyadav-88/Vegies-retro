import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { UPI_PAYMENT_CONFIG } from '../data/restaurantData';
import {
  ShieldCheck,
  QrCode,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  CreditCard,
  Smartphone,
  ReceiptText,
  Monitor,
  Check,
} from 'lucide-react';

interface UpiPaymentCardProps {
  amount: number;
  orderRef?: string;
  customerName?: string;
  onPaymentConfirmed: (paymentData: {
    utr: string;
    appUsed: string;
    paidAmount: number;
    upiId: string;
    payeeName: string;
  }) => void;
  onPayCashDelivery?: () => void;
  onBackToEdit?: () => void;
  isSubmitting?: boolean;
}

const checkIsDesktopDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isMobileUA = /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini/i.test(
    navigator.userAgent
  );
  return !isMobileUA && window.innerWidth >= 768;
};

export const UpiPaymentCard: React.FC<UpiPaymentCardProps> = ({
  amount,
  orderRef,
  customerName,
  onPaymentConfirmed,
  onPayCashDelivery,
  onBackToEdit,
  isSubmitting = false,
}) => {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => checkIsDesktopDevice());

  // On desktop computer, show QR code mode directly! On mobile, default to app mode.
  const [paymentMode, setPaymentMode] = useState<'app' | 'qr'>(() =>
    checkIsDesktopDevice() ? 'qr' : 'app'
  );

  // Sub-step: 'scan' (step 1 - make payment) or 'utr' (step 2 - enter reference number)
  const [paymentSubStep, setPaymentSubStep] = useState<'scan' | 'utr'>('scan');

  useEffect(() => {
    const handleResize = () => {
      const desktop = checkIsDesktopDevice();
      setIsDesktop(desktop);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [appLaunchStatus, setAppLaunchStatus] = useState<string | null>(null);

  // Form states for Step 2 UTR Confirmation
  const [utrNumber, setUtrNumber] = useState('');
  const [selectedApp, setSelectedApp] = useState('Google Pay');
  const [hasPaidConfirmed, setHasPaidConfirmed] = useState(false);
  const [showUtrHelp, setShowUtrHelp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const payeeName = UPI_PAYMENT_CONFIG.payeeName;
  const upiId = UPI_PAYMENT_CONFIG.upiId;

  // Standard UPI URI format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
  const transactionNote = orderRef ? `Vegies Restro ${orderRef}` : 'Vegies Restro Food Order';
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

  useEffect(() => {
    QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating UPI QR code:', err));
  }, [upiUri]);

  const handleLaunchUpiApp = (appSchemePrefix?: string, appName: string = 'UPI App') => {
    setSelectedApp(appName);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const targetUri = appSchemePrefix ? upiUri.replace('upi://', appSchemePrefix) : upiUri;

    if (isMobile) {
      setAppLaunchStatus(`Launching ${appName}...`);
      try {
        window.location.href = targetUri;
        if (appSchemePrefix && appSchemePrefix !== 'upi://') {
          setTimeout(() => {
            window.location.href = upiUri;
          }, 600);
        }
      } catch (err) {
        console.warn('Error launching UPI URI:', err);
      }
    } else {
      setAppLaunchStatus(`On Desktop, please scan the QR code with your mobile UPI app to pay.`);
    }

    setTimeout(() => {
      setAppLaunchStatus(null);
    }, 6000);
  };

  const handleProceedToUtr = () => {
    setPaymentSubStep('utr');
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUtr = utrNumber.trim().replace(/[\s-]/g, '').toUpperCase();
    if (!cleanUtr) {
      setErrorMsg('Please enter your UPI Reference / UTR Number from your payment receipt.');
      const inputEl = document.getElementById('payment-utr-input');
      if (inputEl) inputEl.focus();
      return;
    }

    // Auto-confirm verification checkbox if not manually checked
    if (!hasPaidConfirmed) {
      setHasPaidConfirmed(true);
    }

    onPaymentConfirmed({
      utr: cleanUtr,
      appUsed: selectedApp,
      paidAmount: amount,
      upiId,
      payeeName,
    });
  };

  const upiApps = [
    { name: 'Google Pay', icon: '🟢' },
    { name: 'PhonePe', icon: '🟣' },
    { name: 'Paytm', icon: '🔵' },
    { name: 'Net Banking', icon: '🏛️' },
    { name: 'BHIM UPI', icon: '🟠' },
    { name: 'Cred / Other', icon: '💳' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Sub-step indicator pills */}
      <div className="flex items-center justify-center gap-2 p-1 bg-stone-100 rounded-2xl text-xs font-bold border border-stone-200">
        <button
          type="button"
          onClick={() => setPaymentSubStep('scan')}
          className={`flex-1 py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentSubStep === 'scan'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>1. Scan & Pay (₹{amount})</span>
        </button>

        <button
          type="button"
          onClick={() => setPaymentSubStep('utr')}
          className={`flex-1 py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentSubStep === 'utr'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ReceiptText className="w-3.5 h-3.5" />
          <span>2. Enter UTR Confirmation</span>
        </button>
      </div>

      {paymentSubStep === 'scan' ? (
        /* ================= STEP 1: TAKE PAYMENT (UPI APP OR QR CODE) ================= */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Desktop Computer Banner if user is on Desktop */}
          {isDesktop && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 text-white border border-emerald-500/40 shadow-sm flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center text-lg shrink-0">
                  <Monitor className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-emerald-300 block font-['Outfit',sans-serif] flex items-center gap-1.5">
                    <span>Desktop Detected • Scan QR to Pay</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </span>
                  <p className="text-[11px] text-stone-300">
                    Scan the QR Code on your screen with GPay, PhonePe, Paytm, or any UPI app.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentMode('qr')}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold text-white shrink-0 border border-emerald-400/40 transition-colors cursor-pointer"
              >
                {paymentMode === 'qr' ? '✓ Showing QR' : 'Show QR'}
              </button>
            </div>
          )}

          {/* Payment Method Switcher: App vs QR */}
          <div className="flex rounded-2xl bg-stone-100 p-1 border border-stone-200">
            <button
              type="button"
              onClick={() => setPaymentMode('app')}
              id="pay-via-upi-app-tab"
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                paymentMode === 'app'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Pay via UPI App (1-Click)</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('qr')}
              id="pay-via-qr-code-tab"
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                paymentMode === 'qr'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR Code {isDesktop ? '(Recommended)' : ''}</span>
            </button>
          </div>

          {/* Instruction Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-amber-900 text-sm">
                Scan QR & Pay
              </p>
              <p className="text-amber-800/90 mt-0.5">
                {paymentMode === 'app'
                  ? isDesktop
                    ? 'Note: On desktop computers, scan the QR code with your mobile UPI app.'
                    : 'Tap your favorite UPI app below to open and complete your payment of ₹' +
                      amount +
                      '.'
                  : 'Open Google Pay, PhonePe, Paytm, or any UPI scanner app on your phone to scan the QR code and pay ₹' +
                    amount +
                    '.'}
              </p>
            </div>
          </div>

          {/* Feedback message banner if app launch triggered */}
          {appLaunchStatus && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium text-center shadow-sm animate-in fade-in flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{appLaunchStatus}</span>
            </div>
          )}

          {paymentMode === 'app' ? (
            /* ============ MODE A: PAY DIRECTLY VIA UPI APPS ============ */
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Select UPI App
                </span>
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Payable: ₹{amount}
                </span>
              </div>

              {/* Primary 1-Click App Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleLaunchUpiApp('gpay://upi/pay?', 'Google Pay')}
                  className="p-3 rounded-2xl border-2 border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 active:scale-97 transition-all flex items-center gap-3 cursor-pointer group text-left bg-stone-50/60 shadow-2xs"
                >
                  <span className="w-9 h-9 rounded-xl bg-white shadow-xs border border-stone-200 flex items-center justify-center text-lg shrink-0">
                    🟢
                  </span>
                  <div className="min-w-0">
                    <span className="block font-extrabold text-stone-900 text-xs sm:text-sm group-hover:text-emerald-800">
                      Google Pay
                    </span>
                    <span className="text-[10px] text-stone-500 block truncate">Tap to launch</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchUpiApp('phonepe://pay?', 'PhonePe')}
                  className="p-3 rounded-2xl border-2 border-stone-200 hover:border-purple-500 hover:bg-purple-50/50 active:scale-97 transition-all flex items-center gap-3 cursor-pointer group text-left bg-stone-50/60 shadow-2xs"
                >
                  <span className="w-9 h-9 rounded-xl bg-white shadow-xs border border-stone-200 flex items-center justify-center text-lg shrink-0">
                    🟣
                  </span>
                  <div className="min-w-0">
                    <span className="block font-extrabold text-stone-900 text-xs sm:text-sm group-hover:text-purple-800">
                      PhonePe
                    </span>
                    <span className="text-[10px] text-stone-500 block truncate">Tap to launch</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchUpiApp('paytmmp://pay?', 'Paytm')}
                  className="p-3 rounded-2xl border-2 border-stone-200 hover:border-cyan-500 hover:bg-cyan-50/50 active:scale-97 transition-all flex items-center gap-3 cursor-pointer group text-left bg-stone-50/60 shadow-2xs"
                >
                  <span className="w-9 h-9 rounded-xl bg-white shadow-xs border border-stone-200 flex items-center justify-center text-lg shrink-0">
                    🔵
                  </span>
                  <div className="min-w-0">
                    <span className="block font-extrabold text-stone-900 text-xs sm:text-sm group-hover:text-cyan-800">
                      Paytm
                    </span>
                    <span className="text-[10px] text-stone-500 block truncate">Tap to launch</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaunchUpiApp('bhim://pay?', 'BHIM UPI')}
                  className="p-3 rounded-2xl border-2 border-stone-200 hover:border-amber-500 hover:bg-amber-50/50 active:scale-97 transition-all flex items-center gap-3 cursor-pointer group text-left bg-stone-50/60 shadow-2xs"
                >
                  <span className="w-9 h-9 rounded-xl bg-white shadow-xs border border-stone-200 flex items-center justify-center text-lg shrink-0">
                    🟠
                  </span>
                  <div className="min-w-0">
                    <span className="block font-extrabold text-stone-900 text-xs sm:text-sm group-hover:text-amber-800">
                      BHIM UPI
                    </span>
                    <span className="text-[10px] text-stone-500 block truncate">Tap to launch</span>
                  </div>
                </button>
              </div>

              {/* Any UPI App Master Button */}
              <button
                type="button"
                onClick={() => handleLaunchUpiApp(undefined, 'UPI App')}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-800 hover:to-teal-900 active:scale-98 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Open Any Installed UPI App (₹{amount})</span>
              </button>
            </div>
          ) : (
            /* ============ MODE B: SCAN UPI QR CODE ============ */
            <div className="relative rounded-3xl bg-black text-white p-5 sm:p-6 shadow-2xl border border-stone-800 flex flex-col items-center max-w-sm mx-auto overflow-hidden">
              {/* Subtle background glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-emerald-950/40 pointer-events-none" />

              {/* Top Header */}
              <div className="relative z-10 w-full text-center space-y-1 pb-4">
                <h3 className="font-extrabold tracking-tight text-white text-lg sm:text-xl flex items-center justify-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  <span>Scan to Pay</span>
                </h3>
                <p className="text-xs text-stone-300 font-medium">
                  Use any UPI app (GPay, PhonePe, Paytm, BHIM)
                </p>
              </div>

              {/* White Center QR Box with Amount Overlay */}
              <div className="relative z-10 bg-white rounded-3xl p-4 shadow-xl flex flex-col items-center justify-center w-64 h-64 border-4 border-stone-100">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="UPI QR Code"
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-stone-400 gap-2">
                    <QrCode className="w-12 h-12 animate-pulse text-stone-500" />
                    <span className="text-xs">Generating QR...</span>
                  </div>
                )}

                {/* Amount Badge Pill in Center of QR */}
                <div className="absolute -bottom-3 bg-emerald-600 text-white px-4 py-1 rounded-full text-xs font-black shadow-lg border-2 border-white flex items-center gap-1">
                  <span>Pay: ₹{amount}</span>
                </div>
              </div>

              {/* Amount Details Box */}
              <div className="relative z-10 w-full mt-6 space-y-2 text-center">
                <div className="flex items-center justify-between text-xs bg-stone-900/80 rounded-xl px-4 py-2 border border-stone-800">
                  <span className="text-stone-400">Total Payable Amount:</span>
                  <span className="font-extrabold text-white text-base">₹{amount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Step 1 Navigation */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {onBackToEdit && (
                <button
                  type="button"
                  onClick={onBackToEdit}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border border-stone-300 hover:bg-stone-200/60 text-stone-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Edit Order</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleProceedToUtr}
                id="proceed-to-utr-btn"
                className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Payment Done? Enter UTR for Confirmation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {onPayCashDelivery && (
              <div className="pt-2 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <span className="text-stone-500 text-[11px]">
                  Want to pay when food arrives?
                </span>
                <button
                  type="button"
                  onClick={onPayCashDelivery}
                  className="text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-300 transition-colors cursor-pointer"
                >
                  💵 Place Order with Cash on Delivery
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= STEP 2: ASK FOR UTR CONFIRMATION ================= */
        <form
          onSubmit={handleSubmitPayment}
          className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4 animate-in fade-in duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
            <div>
              <h4 className="font-['Outfit',sans-serif] font-bold text-stone-900 text-sm sm:text-base flex items-center gap-1.5">
                <ReceiptText className="w-4 h-4 text-emerald-600" />
                <span>Step 2: Enter UTR for Payment Confirmation</span>
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Please enter the 12-digit reference number from your payment receipt
              </p>
            </div>
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
              ₹{amount} Paid
            </span>
          </div>

          {/* Paid Summary Box */}
          <div className="p-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-700 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <span className="font-bold text-stone-900">Online UPI Payment: ₹{amount}</span>
            </div>
            <button
              type="button"
              onClick={() => setPaymentSubStep('scan')}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>View QR Code Again</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Select Which UPI App was used */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              Which App Did You Use to Pay?
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {upiApps.map((app) => {
                const isSelected = selectedApp === app.name;
                return (
                  <button
                    key={app.name}
                    type="button"
                    onClick={() => setSelectedApp(app.name)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-sm">{app.icon}</span>
                    <span className="truncate">{app.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* UTR / Transaction ID Input Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="payment-utr-input"
                className="text-xs font-bold text-stone-700 flex items-center gap-1"
              >
                <span>Enter 12-Digit UPI Ref No. / UTR Number *</span>
              </label>
              <button
                type="button"
                onClick={() => setShowUtrHelp(!showUtrHelp)}
                className="text-[11px] text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Where is UTR?</span>
              </button>
            </div>

            {showUtrHelp && (
              <div className="mb-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-950 space-y-1 animate-in fade-in">
                <p className="font-bold">How to find your 12-digit UTR / Ref No:</p>
                <p>
                  In <strong>Google Pay</strong>, <strong>PhonePe</strong>, or <strong>Paytm</strong>, open your payment receipt. Look for <strong>UPI Ref No.</strong>, <strong>UTR</strong>, or <strong>Transaction ID</strong> (e.g.{' '}
                  <span className="font-mono font-bold text-emerald-800">423819283749</span>).
                </p>
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                id="payment-utr-input"
                required
                disabled={isSubmitting}
                value={utrNumber}
                onChange={(e) => {
                  setUtrNumber(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="e.g. 423819283749 (12-digit Ref No.)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-xs text-stone-900 font-mono uppercase font-bold focus:outline-none focus:ring-2 focus:border-emerald-600 focus:ring-emerald-600/20"
              />
              {utrNumber.trim().length >= 6 && (
                <span className="absolute right-3 top-2.5 text-emerald-600">
                  <Check className="w-4 h-4" />
                </span>
              )}
            </div>
            <span className="text-[10px] text-stone-500 mt-1 block">
              Enter the 12-digit transaction reference number from your payment receipt to confirm your order.
            </span>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-stone-200 cursor-pointer select-none">
            <input
              type="checkbox"
              id="confirm-paid-checkbox"
              disabled={isSubmitting}
              checked={hasPaidConfirmed}
              onChange={(e) => setHasPaidConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs text-stone-800 leading-snug">
              I confirm that I have completed the payment of <strong>₹{amount}</strong> via {selectedApp}.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setPaymentSubStep('scan')}
              disabled={isSubmitting}
              className="px-3.5 py-3 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to QR</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              id="confirm-payment-order-submit-btn"
              className="flex-1 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payment & Place Order (₹{amount})</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
