import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, X, Wallet, MapPin, Database } from 'lucide-react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [activeAlert, setActiveAlert] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [currency, setCurrency] = useState('LKR');
  const [flashSaleBanner, setFlashSaleBanner] = useState(null);
  const alertTimeoutRef = useRef(null);
  const wsRef = useRef(null);

  // Helper to get JWT headers
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch initial wallet balance
  const updateBalance = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/wallet/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.wallet) {
          setWalletBalance(parseFloat(data.wallet.balance) || 0);
          setCurrency(data.wallet.currency || 'LKR');
        }
      }
    } catch (err) {
      console.error('Error updating balance in NotificationContext:', err);
    }
  };

  // Keep WebSocket connection open for real-time alerts
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      return;
    }

    // Load initial balance when token becomes available
    updateBalance();

    let reconnectTimeout;
    const connectWS = () => {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In development, bind to port 5000 (backend). In production, same host.
      const wsUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `ws://${window.location.hostname}:5000/?token=${currentToken}`
        : `${wsProtocol}//${window.location.host}/ws?token=${currentToken}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'TX_SUCCESS' || data.type === 'TX_REJECTED' || data.type === 'AREA_FULL_ALERT') {
            // Cancel previous timeout
            if (alertTimeoutRef.current) {
              clearTimeout(alertTimeoutRef.current);
            }

            // Set active alert details
            setActiveAlert({
              type: data.type,
              title: data.title || 'Notification',
              message: data.message,
              amount: data.amount,
              vendorName: data.vendorName || 'Stall Vendor',
              timestamp: data.timestamp || new Date(),
            });

            // Update local balance dynamically
            if (data.type === 'TX_SUCCESS' && data.remainingBalance !== undefined) {
              setWalletBalance(data.remainingBalance);
            }

            // Auto-dismiss alert after 15 seconds
            alertTimeoutRef.current = setTimeout(() => {
              setActiveAlert(null);
            }, 15000);
          } else if (data.type === 'flash_sale_broadcast') {
            // 'flash_sale_broadcast' channel — every attendee client shares
            // this one WS connection, so this fires for all of them at once.
            // Mounting the banner (and unmounting it at zero) is owned
            // entirely by FlashSaleBannerBar's own countdown interval below.
            setFlashSaleBanner({
              vendorName: data.vendorName,
              promoText: data.promoText,
              expiresAt: data.expiresAt,
            });
          }
        } catch (err) {
          console.error('WS message parse error in NotificationContext:', err);
        }
      };

      ws.onclose = () => {
        console.log('WS connection closed. Reconnecting in 5s...');
        reconnectTimeout = setTimeout(connectWS, 5000);
      };

      ws.onerror = (err) => {
        console.error('WS socket error:', err);
        ws.close();
      };
    };

    connectWS();

    // Cleanup connection on token change or unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ activeAlert, setActiveAlert, walletBalance, setWalletBalance, currency, updateBalance, flashSaleBanner, setFlashSaleBanner }}>
      {children}

      {/* ── Flash Sale Broadcast Banner (US-302-SUB-3) ──
          Mounted only while a flash sale is active; the banner's own
          countdown interval unmounts it (via onExpire) the instant the
          difference between now and expiresAt hits zero. */}
      {flashSaleBanner && (
        <FlashSaleBannerBar
          banner={flashSaleBanner}
          onExpire={() => setFlashSaleBanner(null)}
        />
      )}

      {/* ── Transaction Overlay Modal (US-406 / EP-94) ── */}
      {activeAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl p-7 text-center border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden animate-slide-up">
            
            {/* Visual timer countdown bar */}
            <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 w-full animate-shrink-width" style={{ animationDuration: '15s' }} />

            <button
              onClick={() => setActiveAlert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-none"
            >
              <X size={18} />
            </button>

            {activeAlert.type === 'AREA_FULL_ALERT' ? (
              <>
                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500 animate-pulse">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mb-2">{activeAlert.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  {activeAlert.message}
                </p>
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-center text-xs mb-2 text-rose-600 dark:text-rose-400 font-semibold">
                  We suggest avoiding this area to prevent congestion.
                </div>
              </>
            ) : activeAlert.type === 'TX_REJECTED' ? (
              <>
                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500 animate-bounce">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mb-2">Insufficient Balance</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  A checkout request for <span className="font-extrabold text-slate-900 dark:text-white">LKR {activeAlert.amount.toFixed(2)}</span> was declined due to inadequate funds.
                </p>
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-left text-xs mb-4 text-rose-600 dark:text-rose-400 leading-relaxed">
                  <strong>Action Required:</strong> Top up your wallet balance on the dashboard to proceed.
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">Payment Successful</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Processed at {activeAlert.vendorName}</p>
                <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-5">
                  LKR {activeAlert.amount.toFixed(2)}
                </p>
                <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800 rounded-xl p-4 text-left text-xs mb-2 space-y-2 text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Paid To:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeAlert.vendorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining Balance:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">LKR {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => setActiveAlert(null)}
              className="w-full mt-4 py-2.5 bg-white hover:bg-slate-100 dark:bg-white dark:hover:bg-slate-100 text-black dark:text-black font-extrabold rounded-xl text-xs border border-slate-200 dark:border-none transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Global Proximity Simulator Widget ── */}
      <FloatingProximitySimulator />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}

/* ─── Flash Sale Countdown Banner (US-302-SUB-3) ───
   Fixed, highly-visible banner mounted at the top of the screen the
   instant a 'flash_sale_broadcast' socket payload arrives. A single
   setInterval computes (expiresAt - now) every second to drive the mm:ss
   clock; the moment that difference reaches zero, it calls onExpire()
   so the parent removes this component from the tree entirely. */
function FlashSaleBannerBar({ banner, onExpire }) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(banner.expiresAt).getTime() - Date.now());

  useEffect(() => {
    const tick = () => {
      const diff = new Date(banner.expiresAt).getTime() - Date.now();
      setRemainingMs(diff);
      if (diff <= 0) {
        clearInterval(interval);
        onExpire();
      }
    };

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [banner.expiresAt, onExpire]);

  const totalSeconds = Math.max(Math.floor(remainingMs / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="fixed top-0 inset-x-0 z-[9997] bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 text-white px-4 py-3 flex items-center justify-center gap-3 shadow-[0_2px_20px_rgba(225,29,72,0.5)] border-b-2 border-white/30 animate-fade-in">
      <span className="font-extrabold text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full shrink-0 animate-pulse">
        ⚡ Flash Sale
      </span>
      <span className="text-xs sm:text-sm font-semibold truncate max-w-[55vw]">
        <strong>{banner.vendorName}</strong>: {banner.promoText}
      </span>
      <span className="text-sm font-mono font-extrabold bg-black/25 px-2.5 py-0.5 rounded shrink-0 tabular-nums">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
      <button
        onClick={onExpire}
        className="text-white/80 hover:text-white bg-transparent border-none cursor-pointer shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ─── Floating Proximity Alert Simulation Panel ─── */
function FloatingProximitySimulator() {
  const { activeAlert } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [zones, setZones] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [latitude, setLatitude] = useState('6.92725');
  const [longitude, setLongitude] = useState('79.86125');
  const [fcmToken, setFcmToken] = useState('mock_fcm_token_client_12345');
  const [isAutoPing, setIsAutoPing] = useState(false);
  const [logs, setLogs] = useState([]);
  const intervalRef = useRef(null);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 15));
  };

  const fetchZones = async () => {
    try {
      const res = await fetch('/api/location/zones');
      const data = await res.json();
      if (data.success) {
        setZones(data.data);
      }
    } catch (err) {
      addLog(`Failed to fetch zones: ${err.message}`);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setEvents(data.data);
        setSelectedEventId(prev => prev || data.data[0]._id);
      }
    } catch (err) {
      addLog(`Failed to fetch events: ${err.message}`);
    }
  };

  const seedZones = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/location/seed-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        addLog('Demo zones seeded successfully!');
        fetchZones();
      }
    } catch (err) {
      addLog(`Seeding zones failed: ${err.message}`);
    }
  };

  const toggleZoneStatus = async (zoneId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = currentStatus === 'Red' ? 'Green' : 'Red';
      const res = await fetch(`/api/location/zones/${zoneId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`Updated ${data.data.name} status to ${newStatus}`);
        fetchZones();
      }
    } catch (err) {
      addLog(`Failed to update status: ${err.message}`);
    }
  };

  const sendPing = async () => {
    try {
      const token = localStorage.getItem('token');
      const body = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        fcmToken
      };
      if (selectedEventId) body.eventId = selectedEventId;
      const res = await fetch('/api/location/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        const eventName = events.find(e => e._id === selectedEventId)?.name || 'Unknown';
        addLog(`Ping sent → Event: ${eventName} | Lat ${latitude}, Lng ${longitude}`);
      } else {
        addLog(`Ping error response: ${data.message}`);
      }
    } catch (err) {
      addLog(`Ping request failed: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchZones();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (activeAlert && activeAlert.type === 'AREA_FULL_ALERT') {
      addLog(`🚨 Alert: ${activeAlert.title} - ${activeAlert.message}`);
    }
  }, [activeAlert]);

  useEffect(() => {
    if (isAutoPing) {
      addLog('Auto-Ping started (every 30 seconds)');
      sendPing(); // Run immediately
      intervalRef.current = setInterval(sendPing, 30000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        addLog('Auto-Ping stopped');
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAutoPing, latitude, longitude, fcmToken]);

  // Don't render simulator if user is not logged in (no token)
  const token = localStorage.getItem('token');
  if (!token) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9998] font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            fetchZones();
            fetchEvents();
          }}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs shadow-2xl hover:scale-105 transition-transform cursor-pointer border-none"
        >
          <MapPin size={14} />
          <span>🛠️ Proximity Simulator</span>
        </button>
      )}

      {/* Expanded Panel */}
      {isOpen && (
        <div className="w-[380px] max-w-[calc(100vw-2rem)] max-h-[85vh] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-2xl text-slate-900 dark:text-white transition-all duration-200 flex flex-col overflow-hidden">
          {/* Header — sticky, not scrolled */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2.5 px-5 pt-5 shrink-0">
            <div className="flex items-center gap-1.5">
              <MapPin className="text-indigo-500" size={16} />
              <div>
                <h4 className="text-xs font-extrabold tracking-wide uppercase">Proximity Simulator</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Test Capacity Alerts & GPS Ping</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={seedZones}
                className="text-[10px] font-bold py-1 px-2.5 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
              >
                Seed Zones
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-none"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Zones Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Halls / Zones ({zones.length})</span>
              <button onClick={fetchZones} className="text-[9px] text-indigo-500 font-bold bg-transparent border-none cursor-pointer">
                Refresh
              </button>
            </div>

            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5">
              {zones.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">No zones. Click Seed Zones to populate.</p>
              ) : (
                zones.map((zone) => {
                  const isRed = zone.status === 'Red';
                  return (
                    <div key={zone._id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200/50 dark:border-zinc-800/60">
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold truncate">{zone.name}</p>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase inline-block mt-0.5 ${
                          isRed ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {isRed ? 'RED (FULL)' : 'GREEN (NORMAL)'}
                        </span>
                      </div>
                      
                      {/* HIGHLY VISIBLE TOGGLE BUTTON */}
                      <button
                        onClick={() => toggleZoneStatus(zone._id, zone.status)}
                        className={`text-[9px] font-extrabold py-1 px-3 rounded-lg shadow-sm border transition-all cursor-pointer ${
                          isRed
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
                            : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500'
                        }`}
                      >
                        {isRed ? '🟩 Mark Normal' : '🟥 Mark Full'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Event Selector */}
          <div>
            <label className="text-[9px] text-slate-450 font-bold block mb-0.5 uppercase">📡 Ping to Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-indigo-300 dark:border-indigo-700 rounded-lg py-1.5 px-2.5 text-[10px] text-slate-900 dark:text-white focus:outline-none font-bold cursor-pointer"
            >
              {events.length === 0 ? (
                <option value="">No events found</option>
              ) : (
                events.map(evt => (
                  <option key={evt._id} value={evt._id}>{evt.name}</option>
                ))
              )}
            </select>
          </div>

          {/* Teleport Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Teleport Presets</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => {
                  setLatitude('6.92725');
                  setLongitude('79.86125');
                  addLog('Teleport to Hall A');
                }}
                className="py-1.5 text-[9px] font-extrabold rounded-lg border bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-850 cursor-pointer"
              >
                📍 Hall A (Full)
              </button>
              <button
                onClick={() => {
                  setLatitude('6.92825');
                  setLongitude('79.86225');
                  addLog('Teleport to Hall B');
                }}
                className="py-1.5 text-[9px] font-extrabold rounded-lg border bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-850 cursor-pointer"
              >
                📍 Hall B (Green)
              </button>
              <button
                onClick={() => {
                  setLatitude('6.92900');
                  setLongitude('79.86400');
                  addLog('Teleport Far Away');
                }}
                className="py-1.5 text-[9px] font-extrabold rounded-lg border bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-850 cursor-pointer"
              >
                📍 Far Away
              </button>
            </div>
          </div>

          {/* Lat/Lng Input */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-slate-450 font-bold block mb-0.5 uppercase">Latitude</label>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg py-1 px-2.5 text-[10px] text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-450 font-bold block mb-0.5 uppercase">Longitude</label>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg py-1 px-2.5 text-[10px] text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* FCM Input */}
          <div>
            <label className="text-[9px] text-slate-450 font-bold block mb-0.5 uppercase">FCM token</label>
            <input
              type="text"
              value={fcmToken}
              onChange={(e) => setFcmToken(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg py-1 px-2.5 text-[10px] text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1 font-semibold">
            <button
              onClick={sendPing}
              className="py-2.5 rounded-xl font-extrabold text-[10px] bg-gradient-to-r from-indigo-500 to-purple-650 hover:from-indigo-600 hover:to-purple-700 text-white cursor-pointer border-none shadow-md"
            >
              Send GPS Ping
            </button>
            <button
              onClick={() => setIsAutoPing(!isAutoPing)}
              className={`py-2.5 rounded-xl font-extrabold text-[10px] border transition-all cursor-pointer ${
                isAutoPing
                  ? 'bg-rose-500/20 border-rose-500 text-rose-500'
                  : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-zinc-850'
              }`}
            >
              {isAutoPing ? '⏹ Stop Auto (30s)' : '▶ Auto Ping (30s)'}
            </button>
          </div>

          {/* Logs */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Console logs</span>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-indigo-400 font-extrabold uppercase bg-transparent border-none cursor-pointer tracking-wider"
              >
                Clear
              </button>
            </div>
            <div className="h-36 rounded-xl bg-slate-950/95 border border-slate-800 p-3 font-mono text-[11px] text-indigo-305 overflow-y-auto space-y-1 leading-normal font-semibold">
              {logs.length === 0 ? (
                <p className="text-slate-500 italic text-[10px]">No logs recorded. Ping to start.</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className={log.includes('Alert') ? 'text-rose-400 font-extrabold' : ''}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
