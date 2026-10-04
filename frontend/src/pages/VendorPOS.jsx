import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Camera, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle, 
  ImagePlus, 
  Gift, 
  Receipt, 
  Zap, 
  HelpCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import jsQR from 'jsqr';
import { useTheme } from '../context/ThemeContext.jsx';

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function VendorPOS() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // Mode: 'payment' (standard purchase) | 'voucher' (free food court voucher claim)
  const [activeMode, setActiveMode] = useState('payment'); // 'payment' | 'voucher'

  const [billAmount, setBillAmount] = useState('');
  const [paymentToken, setPaymentToken] = useState('');
  const [status, setStatus] = useState('idle'); // idle, scanning, uploading, submitting, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [successDetails, setSuccessDetails] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadedImageSrc, setUploadedImageSrc] = useState(null);
  const [uploadDecodeStatus, setUploadDecodeStatus] = useState(null); // null | 'decoding' | 'decoded' | 'failed'

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleCheckoutSubmit = useCallback(async (tokenString) => {
    if (!tokenString || !tokenString.trim()) {
      setErrorMessage('Could not read a token. Please try again.');
      return;
    }

    const cleanToken = tokenString.trim();
    // 16 characters = Scavenger Hunt Voucher (or selected voucher mode)
    const isVoucher = cleanToken.length === 16 || activeMode === 'voucher';

    if (!isVoucher && (!billAmount || parseFloat(billAmount) <= 0)) {
      setErrorMessage('Please enter a valid bill amount before completing checkout.');
      return;
    }

    const finalAmount = isVoucher ? 0 : parseFloat(billAmount);

    setStatus('submitting');
    setErrorMessage('');
    stopCamera();

    try {
      const res = await fetch('/api/vendors/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ token: cleanToken, amount: finalAmount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus('error');
        setErrorMessage(data.message || 'Transaction failed.');
      } else {
        setStatus('success');
        setSuccessDetails({
          amount: finalAmount,
          subsidyAmount: data.transaction?.subsidyAmount || (isVoucher ? 500 : 0),
          transactionId: data.transaction?.id || data.transaction?.transactionId,
          timestamp: data.transaction?.timestamp,
          isVoucher: data.transaction?.isVoucher || isVoucher,
          description: data.transaction?.description,
        });
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error occurred. Please verify server connection.');
    }
  }, [activeMode, billAmount]);

  // Continuous frame scanner for live camera stream
  const tickCameraScan = useCallback(() => {
    if (!isMountedRef.current) return;
    try {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const canvas = canvasRef.current || document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            stopCamera();
            setPaymentToken(code.data);
            handleCheckoutSubmit(code.data);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('POS camera scan tick exception:', e);
    }
    animationFrameRef.current = requestAnimationFrame(tickCameraScan);
  }, [handleCheckoutSubmit]);

  const startCamera = async () => {
    setErrorMessage('');
    setStatus('scanning');
    setCameraActive(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device API not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        streamRef.current = stream;
        await videoRef.current.play();
        animationFrameRef.current = requestAnimationFrame(tickCameraScan);
      }
    } catch (err) {
      console.warn('POS Camera error:', err);
      setErrorMessage('Camera access unavailable. Please use image upload or enter token manually.');
      setCameraActive(false);
      setStatus('idle');
    }
  };

  // QR Image Upload & Decode
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, etc.).');
      return;
    }

    setUploadDecodeStatus('decoding');
    setErrorMessage('');
    setUploadedImageSrc(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const imgSrc = ev.target.result;
      setUploadedImageSrc(imgSrc);

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

        if (code && code.data) {
          setUploadDecodeStatus('decoded');
          setPaymentToken(code.data);
          // If in voucher mode, or if bill is already entered, auto-submit
          if (activeMode === 'voucher' || code.data.trim().length === 16 || (billAmount && parseFloat(billAmount) > 0)) {
            handleCheckoutSubmit(code.data);
          }
        } else {
          setUploadDecodeStatus('failed');
          setErrorMessage('No QR code detected in the image. Please upload a clearer image.');
        }
      };
      img.src = imgSrc;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const resetPOS = () => {
    setBillAmount('');
    setPaymentToken('');
    setStatus('idle');
    setErrorMessage('');
    setSuccessDetails(null);
    setUploadedImageSrc(null);
    setUploadDecodeStatus(null);
    stopCamera();
  };

  // In voucher mode, bill amount is NOT required ($0 charge to customer, organizer pays subsidy)
  const isInputReady = activeMode === 'voucher' || (billAmount && parseFloat(billAmount) > 0);

  const bgStyle = isDarkMode
    ? 'radial-gradient(ellipse at 60% 0%, rgba(99,102,241,0.08) 0%, transparent 55%), radial-gradient(ellipse at 0% 80%, rgba(168,85,247,0.05) 0%, transparent 50%), #030712'
    : 'radial-gradient(ellipse at 60% 0%, rgba(99,102,241,0.04) 0%, transparent 55%), radial-gradient(ellipse at 0% 80%, rgba(168,85,247,0.02) 0%, transparent 50%), #f8fafc';

  return (
    <div
      className="min-h-screen text-slate-900 dark:text-white"
      style={{
        background: bgStyle,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Hidden canvas for image and frame QR decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Container - Standardized to max-w-6xl px-6 py-10 */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* ── Header / Navigation Banner ────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-200 dark:border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => navigate('/vendor/portal')}
                className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                <ArrowLeft size={12} /> Vendor Portal
              </button>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">•</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Contactless Stall Terminal
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-3">
              Stall Checkout (POS) 💳
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl font-normal">
              Charge attendee digital wallets or redeem 6-marker Scavenger Hunt food court vouchers with organizer-backed subsidies.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            className="flex items-center gap-2 p-1.5 rounded-2xl border shrink-0 backdrop-blur-xl"
            style={{
              background: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.04)',
            }}
          >
            <button
              onClick={() => { setActiveMode('payment'); resetPOS(); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                activeMode === 'payment'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-900 font-extrabold shadow-lg shadow-emerald-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent'
              }`}
            >
              <Receipt size={15} />
              Standard Sale
            </button>
            <button
              onClick={() => { setActiveMode('voucher'); resetPOS(); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                activeMode === 'voucher'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold shadow-lg shadow-amber-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent'
              }`}
            >
              <Gift size={15} />
              Redeem Food Voucher
            </button>
          </div>
        </div>

        {/* ── Main Content Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left / Center Terminal (8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">

            {/* Mode Banner Indicator */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                activeMode === 'voucher'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  activeMode === 'voucher' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                }`}>
                  {activeMode === 'voucher' ? <Gift size={18} /> : <Zap size={18} />}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {activeMode === 'voucher' ? 'Food Court Voucher Mode' : 'Standard Digital Wallet Sale'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeMode === 'voucher'
                      ? 'No bill amount required. Free food reward; organizer reimburses you LKR 500.00.'
                      : 'Enter customer bill total, then scan attendee QR or upload QR screenshot.'}
                  </p>
                </div>
              </div>
              <span className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                activeMode === 'voucher'
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-500 dark:text-amber-300'
                  : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
              }`}>
                {activeMode === 'voucher' ? 'Organizer Subsidy' : 'Attendee Wallet'}
              </span>
            </div>

            {/* Terminal Card */}
            <div
              className="rounded-3xl border p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden transition-all shadow-xl"
              style={{
                background: isDarkMode ? 'rgba(15, 23, 42, 0.65)' : '#ffffff',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              }}
            >

              {/* ── SUCCESS VIEW ─────────────────────────────────────── */}
              {status === 'success' ? (
                <div className="text-center py-8">
                  <div className={`w-20 h-20 border rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce ${
                    successDetails?.isVoucher
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-500'
                      : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
                  }`}>
                    <CheckCircle className="w-12 h-12" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                    {successDetails?.isVoucher ? '🎉 Food Court Voucher Redeemed!' : 'Payment Received!'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    {successDetails?.isVoucher
                      ? 'Free attendee meal issued. Organizer reimbursement credited to your ledger.'
                      : 'Transaction recorded and debited from attendee digital wallet.'}
                  </p>

                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 max-w-sm mx-auto mb-6 text-left space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Customer Charged:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        LKR {successDetails?.amount.toFixed(2)}
                      </span>
                    </div>
                    {successDetails?.isVoucher && (
                      <div className="flex justify-between items-center text-xs text-amber-500 font-bold border-t border-slate-200 dark:border-white/5 pt-2">
                        <span>Organizer Reimbursement:</span>
                        <span>+ LKR {successDetails?.subsidyAmount?.toFixed(2) || '500.00'}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs border-t border-slate-200 dark:border-white/5 pt-2">
                      <span className="text-slate-500 dark:text-slate-400">Transaction Ref:</span>
                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {String(successDetails?.transactionId || 'TXN-SETTLED')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Timestamp:</span>
                      <span className="text-[11px] text-slate-700 dark:text-slate-300">
                        {new Date(successDetails?.timestamp || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={resetPOS}
                    className={`w-full max-w-sm mx-auto py-3.5 font-black rounded-xl transition-all cursor-pointer shadow-lg text-sm ${
                      successDetails?.isVoucher
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/25'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/25'
                    }`}
                  >
                    Next Checkout →
                  </button>
                </div>

              ) : status === 'error' && errorMessage === 'Insufficient Wallet Balance' ? (
                /* ── INSUFFICIENT BALANCE ERROR ──────────────────────── */
                <div className="text-center py-8 animate-fade-in">
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/25 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <AlertCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
                  </div>
                  <h2 className="text-xl font-extrabold text-red-500 dark:text-red-400 mb-2">Insufficient Wallet Balance</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                    The attendee's digital wallet does not hold sufficient funds for <span className="font-bold text-slate-900 dark:text-white">LKR {parseFloat(billAmount || 0).toFixed(2)}</span>.
                  </p>
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-left text-xs mb-8 text-red-700 dark:text-red-300/80 leading-relaxed max-w-sm mx-auto">
                    <span className="font-bold">Suggested action:</span> Request the attendee to top up their wallet or complete payment via cash/card.
                  </div>
                  <div className="flex gap-3 max-w-sm mx-auto">
                    <button
                      onClick={() => setStatus('idle')}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-all cursor-pointer text-xs"
                    >
                      Back to POS
                    </button>
                    <button
                      onClick={resetPOS}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-red-500/20 text-xs"
                    >
                      Reset POS
                    </button>
                  </div>
                </div>

              ) : (
                /* ── STANDARD SCANNER / POS INTERFACE ────────────────── */
                <div className="space-y-6">

                  {/* Bill Amount Input (Only when in Payment Mode) */}
                  {activeMode === 'payment' ? (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Enter Bill Total (LKR)
                        </label>
                        <span className="text-[11px] text-slate-400">Step 1 of 2</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-base">LKR</span>
                        <input
                          id="bill-amount-input"
                          type="number"
                          placeholder="0.00"
                          value={billAmount}
                          disabled={status === 'scanning' || status === 'submitting'}
                          onChange={(e) => { setBillAmount(e.target.value); setErrorMessage(''); }}
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] rounded-2xl py-4 pl-16 pr-4 text-2xl font-black text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 transition-all"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Voucher Mode Callout */
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift size={16} />
                        <span className="font-bold">Scavenger Hunt Food Court Voucher</span>
                      </div>
                      <span className="font-extrabold bg-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                        LKR 500.00 Face Value
                      </span>
                    </div>
                  )}

                  {/* Error Notification Banner */}
                  {errorMessage && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 px-4 py-3.5 rounded-2xl flex items-start gap-3 text-xs leading-normal">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Notice: </span>
                        {errorMessage}
                      </div>
                    </div>
                  )}

                  {/* SCANNING STATE (Camera Viewfinder) */}
                  {status === 'scanning' ? (
                    <div className="space-y-4">
                      <div className="relative aspect-square w-full max-w-[320px] mx-auto bg-black rounded-3xl overflow-hidden border-2 border-emerald-500/30 shadow-2xl">
                        {cameraActive ? (
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                            <Camera className="w-10 h-10 mb-2 animate-pulse text-emerald-400" />
                            <span className="text-xs font-semibold">Connecting Camera Feed...</span>
                          </div>
                        )}
                        {/* Animated Laser Scanning Line */}
                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/50 animate-pulse top-1/2" />
                      </div>
                      <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-semibold animate-pulse">
                        Align attendee QR code inside the viewfinder
                      </p>
                      <button
                        onClick={() => { stopCamera(); setStatus('idle'); }}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        Cancel Camera Scan
                      </button>
                    </div>

                  ) : status === 'submitting' ? (
                    /* SUBMITTING STATE */
                    <div className="text-center py-12 space-y-4">
                      <RefreshCw className="w-10 h-10 mx-auto text-emerald-500 animate-spin" />
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                        Verifying signature & settling ledger...
                      </p>
                    </div>

                  ) : (
                    /* IDLE CONTROLS (Camera Scan, Upload Image, Manual Code) */
                    <div className="space-y-4">

                      {/* Primary Option 1: Live Camera Scan */}
                      <button
                        id="scan-camera-btn"
                        onClick={startCamera}
                        disabled={!isInputReady}
                        className={`w-full py-4 text-slate-950 font-black rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg ${
                          activeMode === 'voucher'
                            ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                            : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Camera className="w-5 h-5" />
                        {activeMode === 'voucher' ? 'Scan Voucher with Camera' : 'Scan Wallet QR with Camera'}
                      </button>

                      {/* Option 2: Upload QR Image */}
                      <div>
                        <input
                          ref={fileInputRef}
                          id="qr-image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={!isInputReady}
                        />
                        <button
                          id="upload-qr-btn"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!isInputReady}
                          className="w-full py-3.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-600 dark:text-indigo-400 font-extrabold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
                        >
                          <ImagePlus className="w-4 h-4" />
                          Upload QR Screenshot / Image
                        </button>

                        {/* Image Preview & Decode Status */}
                        {uploadedImageSrc && (
                          <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative">
                            <img src={uploadedImageSrc} alt="Uploaded QR" className="w-full object-contain max-h-48" />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              {uploadDecodeStatus === 'decoding' && (
                                <div className="flex flex-col items-center gap-2 text-white">
                                  <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                                  <span className="text-xs font-semibold">Decoding QR Matrix...</span>
                                </div>
                              )}
                              {uploadDecodeStatus === 'decoded' && (
                                <div className="flex flex-col items-center gap-2 text-emerald-400">
                                  <CheckCircle className="w-6 h-6" />
                                  <span className="text-xs font-bold">QR Detected!</span>
                                </div>
                              )}
                              {uploadDecodeStatus === 'failed' && (
                                <div className="flex flex-col items-center gap-2 text-red-400">
                                  <AlertCircle className="w-6 h-6" />
                                  <span className="text-xs font-bold">No Valid QR Detected</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Direct Submit Button if QR Decoded but not submitted */}
                        {uploadDecodeStatus === 'decoded' && paymentToken && status === 'idle' && (
                          <button
                            onClick={() => handleCheckoutSubmit(paymentToken)}
                            className={`w-full mt-3 py-3.5 font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs ${
                              paymentToken.trim().length === 16 || activeMode === 'voucher'
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                            {paymentToken.trim().length === 16 || activeMode === 'voucher'
                              ? '🎟️ Confirm Voucher Redemption (LKR 0.00)'
                              : `Confirm Payment (LKR ${parseFloat(billAmount || 0).toFixed(2)})`}
                          </button>
                        )}
                      </div>

                      {/* Option 3: Manual Input */}
                      <div className="border-t border-slate-200 dark:border-white/5 pt-4">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                          ─ Manual Code Entry ─
                        </p>
                        <div className="flex gap-2">
                          <input
                            id="manual-token-input"
                            type="text"
                            placeholder={activeMode === 'voucher' ? 'e.g. VOUCH-XXXX-XXXX' : 'Paste 64-character token...'}
                            value={paymentToken}
                            onChange={(e) => setPaymentToken(e.target.value)}
                            disabled={!isInputReady}
                            className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/[0.08] rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 disabled:opacity-40 font-mono"
                          />
                          <button
                            id="manual-submit-btn"
                            onClick={() => handleCheckoutSubmit(paymentToken)}
                            disabled={!isInputReady || !paymentToken.trim()}
                            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-xs font-black text-slate-950 cursor-pointer transition-colors shadow-sm"
                          >
                            Submit
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>
          </div>

          {/* Right Column: Settlement Guide & Security Assurance (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">

            {/* Scavenger Hunt Voucher Guide Card */}
            <div
              className="rounded-3xl border p-6 backdrop-blur-xl space-y-4"
              style={{
                background: isDarkMode ? 'rgba(15, 23, 42, 0.65)' : '#ffffff',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Food Court Rewards Policy
                  </h3>
                  <p className="text-[11px] text-slate-400">Zero-cost attendee redemption</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-1">
                  <span className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1">
                    🎟️ 100% Organizer Funded
                  </span>
                  <p className="text-[11px]">
                    Vendors do not pay out of pocket. For every verified 6-marker voucher scanned, your stall receives a <strong>LKR 500.00</strong> direct subsidy.
                  </p>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>No bill input required in voucher mode.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Vouchers are single-use and tamper-proof.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Instant credit reflected in your wallet ledger.</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span>View financial audit:</span>
                <button
                  onClick={() => navigate('/vendor/analytics')}
                  className="inline-flex items-center gap-1 font-bold text-indigo-500 hover:underline cursor-pointer"
                >
                  Analytics <ExternalLink size={10} />
                </button>
              </div>
            </div>

            {/* Double-entry Ledger Guarantee */}
            <div
              className="rounded-3xl border p-6 backdrop-blur-xl flex items-start gap-3.5"
              style={{
                background: isDarkMode ? 'rgba(15, 23, 42, 0.4)' : '#ffffff',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              }}
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Cryptographic POS Ledger
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Every scan verifies token expiration, single-use nonce signatures, and real-time dual-entry double accounting.
                </p>
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
