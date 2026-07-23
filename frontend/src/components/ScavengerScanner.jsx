import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, AlertCircle, CheckCircle, Loader2, Sparkles, Send } from 'lucide-react';

export default function ScavengerScanner({ onScanSuccess }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // States: 'idle', 'scanning', 'processing', 'success', 'error'
  const [scanState, setScanState] = useState('idle');
  const [cameraError, setCameraError] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'duplicate'|'invalid'|'error', title, message }
  const [simulatedCode, setSimulatedCode] = useState('');

  // Sample preset codes for quick testing/simulation
  const PRESET_TEST_CODES = [
    'HUNT_ZONE_A_101',
    'HUNT_VIP_LOUNGE_202',
    'HUNT_STAGE_NORTH_303',
    'HUNT_FOOD_COURT_404',
    'HUNT_MAIN_HALL_505',
    'INVALID_CODE_XYZ',
  ];

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
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Scanner Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Live Camera QR Scanner</h3>
            <p className="text-xs text-slate-400">Point your camera at any hidden venue QR code</p>
          </div>
        </div>

        {(scanState === 'success' || scanState === 'error') && (
          <button
            onClick={handleResumeScan}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <RefreshCw size={14} />
            Scan Again
          </button>
        )}
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
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all border border-slate-700 cursor-pointer"
            >
              Retry Camera
            </button>
          </div>
        )}
      </div>

      {/* Visual Feedback Alerts for Results (200, 400, 404, 500) */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 animate-slide-up ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : feedback.type === 'duplicate'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="mt-0.5">
            {feedback.type === 'success' ? (
              <CheckCircle size={18} className="text-emerald-400" />
            ) : (
              <AlertCircle size={18} className={feedback.type === 'duplicate' ? 'text-amber-400' : 'text-red-400'} />
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold">{feedback.title}</h4>
            <p className="text-xs opacity-90 mt-0.5">{feedback.message}</p>
          </div>
          <button
            onClick={handleResumeScan}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all cursor-pointer"
          >
            Scan Next
          </button>
        </div>
      )}

      {/* Simulator Mode for Testing / Environments without Webcams */}
      <div className="pt-4 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500 flex items-center gap-1">
            <Sparkles size={12} className="text-indigo-400" />
            Testing & Code Simulator
          </span>
          <span>Or click preset venue QR codes below</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_TEST_CODES.map((codeStr) => (
            <button
              key={codeStr}
              onClick={() => {
                freezeCameraFeed();
                handleParsedCode(codeStr);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-indigo-600/30 hover:border-indigo-500/40 border border-slate-700 text-xs text-slate-300 font-mono transition-all cursor-pointer"
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
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Send size={12} />
            Test Scan
          </button>
        </form>
      </div>
    </div>
  );
}
