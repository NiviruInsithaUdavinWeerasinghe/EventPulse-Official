import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ShieldCheck, AlertCircle, RefreshCw, CheckCircle, ImagePlus } from 'lucide-react';
import jsQR from 'jsqr';

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function VendorPOS() {
  const navigate = useNavigate();
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

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setErrorMessage('');
    setStatus('scanning');
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch {
      setErrorMessage('Camera access unavailable. Please use image upload or manual token input below.');
      setCameraActive(false);
      setStatus('idle');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleCheckoutSubmit = async (tokenString) => {
    if (!tokenString || !tokenString.trim()) {
      setErrorMessage('Could not read a token. Please try again.');
      return;
    }
    if (!billAmount || parseFloat(billAmount) <= 0) {
      setErrorMessage('Please enter a valid bill amount.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');
    stopCamera();

    try {
      const res = await fetch('/api/vendors/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ token: tokenString.trim(), amount: parseFloat(billAmount) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus('error');
        setErrorMessage(data.message || 'Transaction failed.');
      } else {
        setStatus('success');
        setSuccessDetails({
          amount: parseFloat(billAmount),
          transactionId: data.transaction?.transactionId,
          timestamp: data.transaction?.timestamp,
        });
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error occurred. Please try again.');
    }
  };

  // ── QR Image Upload & Decode ───────────────────────────────────────────────
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
        // Draw image onto a hidden canvas to extract pixel data for jsQR
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
          // Auto-submit if bill is already valid
          if (billAmount && parseFloat(billAmount) > 0) {
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
    // Reset file input so same file can be re-uploaded
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

  const isBillValid = billAmount && parseFloat(billAmount) > 0;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6">
      {/* Hidden canvas for image QR decoding */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="w-full max-w-md bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sm:p-8 mt-6">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/vendor/portal')}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-50">Stall Checkout (POS)</h1>
            <p className="text-xs text-slate-500">Process contactless payments instantly</p>
          </div>
        </div>

        {/* ── SUCCESS VIEW ─────────────────────────────────────── */}
        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mb-2">Payment Successful</h2>
            <p className="text-3xl font-extrabold text-slate-50 mb-6">
              LKR {successDetails?.amount.toFixed(2)}
            </p>
            <div className="bg-white/5 border border-white/[0.06] rounded-xl p-4 text-left text-xs mb-8 space-y-2 text-slate-400">
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <span className="font-mono text-slate-200">{String(successDetails?.transactionId)}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span className="text-slate-200">
                  {successDetails?.timestamp
                    ? new Date(successDetails.timestamp).toLocaleString()
                    : new Date().toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={resetPOS}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              Next Checkout
            </button>
          </div>

        ) : status === 'error' && errorMessage === 'Insufficient Wallet Balance' ? (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/25 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-extrabold text-red-400 mb-2">Insufficient Wallet Balance</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              The attendee's digital wallet does not hold sufficient funds to pay the bill of <span className="font-bold text-slate-200">LKR {parseFloat(billAmount).toFixed(2)}</span>.
            </p>
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-left text-xs mb-8 text-red-300/80 leading-relaxed">
              <span className="font-bold">Suggested action:</span> Please ask the attendee to top up their wallet or complete payment via cash/card.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStatus('idle')}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold rounded-xl transition-all cursor-pointer"
              >
                Back to POS
              </button>
              <button
                onClick={resetPOS}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-red-500/20"
              >
                Reset POS
              </button>
            </div>
          </div>

        ) : (
          <div className="space-y-6">

            {/* ── Bill Amount Input ──────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Enter Bill Total (LKR)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">LKR</span>
                <input
                  id="bill-amount-input"
                  type="number"
                  placeholder="0.00"
                  value={billAmount}
                  disabled={status === 'scanning' || status === 'submitting'}
                  onChange={(e) => { setBillAmount(e.target.value); setErrorMessage(''); }}
                  className="w-full bg-white/5 border border-white/[0.08] rounded-xl py-3.5 pl-14 pr-4 text-lg font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
                />
              </div>
            </div>

            {/* ── Error Alert ───────────────────────────────────── */}
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3.5 rounded-xl flex items-start gap-3 text-xs leading-normal">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Transaction Alert: </span>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* ── SCANNING STATE ────────────────────────────────── */}
            {status === 'scanning' ? (
              <div className="space-y-4">
                <div className="relative aspect-square w-full max-w-[280px] mx-auto bg-black rounded-2xl overflow-hidden border border-white/10">
                  {cameraActive ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 p-4 text-center">
                      <Camera className="w-8 h-8 mb-2 animate-pulse" />
                      <span className="text-xs">Connecting Camera...</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 h-0.5 bg-emerald-500 shadow-md shadow-emerald-500/50 animate-bounce top-1/2" />
                </div>
                <p className="text-center text-xs text-slate-400 animate-pulse">
                  Position attendee QR code in the viewfinder
                </p>
                <button
                  onClick={() => { stopCamera(); setStatus('idle'); }}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel Scan
                </button>
              </div>

            ) : status === 'submitting' ? (
              <div className="text-center py-10 space-y-4">
                <RefreshCw className="w-8 h-8 mx-auto text-emerald-400 animate-spin" />
                <p className="text-sm font-semibold text-slate-400">Processing secure transaction...</p>
              </div>

            ) : (
              /* ── IDLE STATE — All Options ───────────────────── */
              <div className="space-y-3">

                {/* Option 1: Camera Scan */}
                <button
                  id="scan-camera-btn"
                  onClick={startCamera}
                  disabled={!isBillValid}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                >
                  <Camera className="w-5 h-5" />
                  Scan with Camera
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
                    disabled={!isBillValid}
                  />
                  <button
                    id="upload-qr-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isBillValid}
                    className="w-full py-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-300 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ImagePlus className="w-5 h-5" />
                    Upload QR Code Image
                  </button>

                  {/* Image Preview & Decode Status */}
                  {uploadedImageSrc && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-white/10 relative">
                      <img src={uploadedImageSrc} alt="Uploaded QR" className="w-full object-contain max-h-44" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        {uploadDecodeStatus === 'decoding' && (
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                            <span className="text-xs text-slate-300 font-semibold">Decoding QR...</span>
                          </div>
                        )}
                        {uploadDecodeStatus === 'decoded' && (
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                            <span className="text-xs text-emerald-300 font-semibold">QR Code Detected!</span>
                          </div>
                        )}
                        {uploadDecodeStatus === 'failed' && (
                          <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="w-6 h-6 text-red-400" />
                            <span className="text-xs text-red-300 font-semibold">No QR Found</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Show submit button if QR decoded but bill amount wasn't set at time of scan */}
                  {uploadDecodeStatus === 'decoded' && paymentToken && isBillValid && status === 'idle' && (
                    <button
                      onClick={() => handleCheckoutSubmit(paymentToken)}
                      className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Confirm Payment — LKR {parseFloat(billAmount).toFixed(2)}
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-white/5 pt-4">
                  <p className="text-xs font-semibold text-slate-500 mb-3 text-center">─ Manual Token Input ─</p>
                  <div className="flex gap-2">
                    <input
                      id="manual-token-input"
                      type="text"
                      placeholder="Paste 64-char token..."
                      value={paymentToken}
                      onChange={(e) => setPaymentToken(e.target.value)}
                      disabled={!isBillValid}
                      className="flex-1 bg-white/5 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 font-mono"
                    />
                    <button
                      id="manual-submit-btn"
                      onClick={() => handleCheckoutSubmit(paymentToken)}
                      disabled={!isBillValid || !paymentToken}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 disabled:bg-slate-900 disabled:text-slate-700 disabled:border-transparent disabled:cursor-not-allowed rounded-xl text-xs font-bold text-slate-200 cursor-pointer transition-colors"
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Double-entry ledger verified checkout.</span>
        </div>

      </div>
    </div>
  );
}
