import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { useTheme } from '../context/ThemeContext.jsx';
import { Camera, RefreshCw, AlertCircle, CheckCircle, Loader2, Sparkles, Send, Upload, Image as ImageIcon } from 'lucide-react';

export default function ScavengerScanner({ onScanSuccess, codes = [] }) {
  const { isDarkMode } = useTheme();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const animationFrameRef = useRef(null);

  // States: 'idle', 'scanning', 'processing', 'success', 'error'
  const [scanState, setScanState] = useState('idle');
  const [cameraError, setCameraError] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'duplicate'|'invalid'|'error', title, message }
  const [simulatedCode, setSimulatedCode] = useState('');

  // Use real codes from database passed from parent, with fallback
  const activeCodesList = codes && codes.length > 0
    ? codes.map(c => c.code)
    : ['HUNT_ZONE_A_101', 'HUNT_VIP_LOUNGE_202', 'HUNT_STAGE_NORTH_303', 'HUNT_FOOD_COURT_404', 'HUNT_MAIN_HALL_505'];

  // Initialize camera stream
  const startCamera = async () => {
    setCameraError(null);
    setScanState('scanning');
    setFeedback(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported in this browser context.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        requestAnimationFrame(tickScan);
      }
    } catch (err) {
      console.warn('Camera initialization notice:', err);
      let msg = 'Could not access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in browser settings or use test scan mode below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera hardware found on this device. You can test scanning using simulated QR codes below.';
      } else {
        msg = err.message || 'Camera error encountered. Use test scanner mode below.';
      }
      setCameraError(msg);
      setScanState('idle');
    }
  };

  // Stop video stream & cancel frame scanning tick
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Freeze camera feed immediately upon detection (SUB-1 requirement)
  const freezeCameraFeed = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  // Continuous frame scanning loop using jsQR
  const tickScan = () => {
    try {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const canvas = canvasRef.current || document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            // QR detected! Freeze camera feed immediately
            freezeCameraFeed();
            handleParsedCode(code.data);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Frame scan tick error:', e);
    }
    animationFrameRef.current = requestAnimationFrame(tickScan);
  };

  // Decode QR code from uploaded image file
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input value so user can upload the same file again if desired
    e.target.value = '';

    setScanState('processing');
    setFeedback(null);
    freezeCameraFeed();

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          handleParsedCode(code.data);
        } else {
          setScanState('error');
          setFeedback({
            type: 'invalid',
            title: 'No QR Code Detected',
            message: 'Could not detect a clear QR code in this image. Please upload a clear photo or screenshot.',
          });
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Send parsed QR string to backend validation API (SUB-1 + SUB-2)
  const handleParsedCode = async (qrString) => {
    setScanState('processing');
    setFeedback(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFeedback({
          type: 'error',
          title: 'Unauthorized',
          message: 'Please log in to claim scavenger hunt codes.',
        });
        setScanState('error');
        return;
      }

      const res = await fetch('/api/scavenger/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qr_string: qrString }),
      });

      const data = await res.json();

      if (res.status === 200 && data.success) {
        setScanState('success');
        setFeedback({
          type: 'success',
          title: 'Success!',
          message: data.message || 'Scavenger code claimed successfully!',
          score: data.score,
        });

        // Trigger celebratory animation callback
        if (onScanSuccess) {
          onScanSuccess(data);
        }
      } else if (res.status === 400) {
        // SUB-2: Duplicate scan prevention error handling ('Already Claimed')
        setScanState('error');
        setFeedback({
          type: 'duplicate',
          title: 'Already Claimed',
          message: data.message || 'Already Claimed',
        });
      } else if (res.status === 404) {
        // Validation error: Invalid QR Code
        setScanState('error');
        setFeedback({
          type: 'invalid',
          title: 'Invalid QR Code',
          message: data.message || 'This QR code is not part of the active Scavenger Hunt.',
        });
      } else if (res.status === 401) {
        setScanState('error');
        setFeedback({
          type: 'error',
          title: 'Unauthorized',
          message: 'Session expired or invalid login. Please re-authenticate.',
        });
      } else {
        setScanState('error');
        setFeedback({
          type: 'error',
          title: 'Scan Error',
          message: data.message || 'Server error processing QR scan.',
        });
      }
    } catch (err) {
      console.error('Scan API fetch error:', err);
      setScanState('error');
      setFeedback({
        type: 'error',
        title: 'Network Error',
        message: 'Unable to connect to validation server. Please check connection.',
      });
    }
  };

  // Resume camera & state for next scan
  const handleResumeScan = () => {
    stopCamera();
    startCamera();
  };

  useEffect(() => {
    // Start camera automatically on component mount
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div 
      className="w-full rounded-3xl p-6 sm:p-8 backdrop-blur-xl border space-y-6 transition-all"
      style={{
        background: isDarkMode 
          ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.7) 0%, rgba(10, 15, 30, 0.85) 100%)' 
          : '#ffffff',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
        boxShadow: isDarkMode 
          ? '0 16px 40px -10px rgba(0,0,0,0.5)' 
          : '0 10px 30px -5px rgba(0,0,0,0.04)',
      }}
    >
      {/* Scanner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: isDarkMode ? 'rgba(99,102,241,0.15)' : '#e0e7ff',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            <Camera size={20} className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Live Camera QR Scanner</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Scan via real webcam or upload any saved QR image file</p>
          </div>
        </div>

        {/* Hidden File Input for Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload a QR code image / screenshot"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer"
            style={{
              background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1',
              color: isDarkMode ? '#e2e8f0' : '#334155',
            }}
          >
            <Upload size={14} className="text-indigo-500 dark:text-indigo-400" />
            Upload Image
          </button>

          {(scanState === 'success' || scanState === 'error') && (
            <button
              onClick={handleResumeScan}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-500/20 cursor-pointer border-none"
            >
              <RefreshCw size={14} />
              Scan Again
            </button>
          )}
        </div>
      </div>

      {/* Main Camera Viewfinder & Freeze Overlay */}
      <div className="relative w-full max-w-md mx-auto aspect-square rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl flex items-center justify-center">
        {/* Hidden HTML5 Canvas used for frame analysis */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Video Feed */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Viewfinder Target Framing Graphics */}
        {scanState === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-12">
            <div className="w-full h-full border-2 border-indigo-500/60 rounded-3xl relative animate-pulse shadow-[0_0_30px_rgba(99,102,241,0.3)]">
              {/* Corners */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />
              {/* Laser scanning line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent absolute top-1/2 left-0 animate-bounce shadow-[0_0_15px_#818cf8]" />
            </div>
          </div>
        )}

        {/* Loading Spinner Overlay (SUB-1 requirement) */}
        {scanState === 'processing' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-3" />
            <h4 className="text-base font-bold text-white mb-1">Validating QR Code...</h4>
            <p className="text-xs text-slate-400">Verifying code with event server</p>
          </div>
        )}

        {/* Camera Permission / Error Banner inside Viewfinder */}
        {cameraError && scanState !== 'processing' && (
          <div className="absolute inset-0 bg-slate-950/90 p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
            <AlertCircle className="w-10 h-10 text-amber-400" />
            <p className="text-xs font-semibold text-slate-300 max-w-xs">{cameraError}</p>
            <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all border border-slate-700 cursor-pointer"
              >
                Retry Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all border-none cursor-pointer flex items-center gap-1.5"
              >
                <Upload size={13} />
                Upload QR Image
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visual Feedback Alerts for Results (200, 400, 404, 500) */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 animate-slide-up ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
              : feedback.type === 'duplicate'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300'
              : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-300'
          }`}
        >
          <div className="mt-0.5">
            {feedback.type === 'success' ? (
              <CheckCircle size={18} className="text-emerald-500 dark:text-emerald-400" />
            ) : (
              <AlertCircle size={18} className={feedback.type === 'duplicate' ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-400'} />
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold">{feedback.title}</h4>
            <p className="text-xs opacity-90 mt-0.5">{feedback.message}</p>
          </div>
          <button
            onClick={handleResumeScan}
            className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-xs font-bold transition-all cursor-pointer text-slate-800 dark:text-white border-none"
          >
            Scan Next
          </button>
        </div>
      )}

      {/* Simulator Mode for Testing / Environments without Webcams */}
      <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Sparkles size={12} className="text-indigo-500 dark:text-indigo-400" />
            Testing & Code Simulator
          </span>
          <span>Click any preset venue QR code below</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeCodesList.map((codeStr) => (
            <button
              key={codeStr}
              onClick={() => {
                freezeCameraFeed();
                handleParsedCode(codeStr);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-500/10 dark:hover:bg-indigo-600/30 hover:border-indigo-500/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono transition-all cursor-pointer"
            >
              {codeStr}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (simulatedCode.trim()) {
              freezeCameraFeed();
              handleParsedCode(simulatedCode.trim());
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Type custom QR string to test..."
            value={simulatedCode}
            onChange={(e) => setSimulatedCode(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all border-none shadow-md shadow-indigo-500/20"
          >
            <Send size={12} />
            Test Scan
          </button>
        </form>
      </div>
    </div>
  );
}

