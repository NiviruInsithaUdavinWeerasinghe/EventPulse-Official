import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, X, Wallet } from 'lucide-react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [activeAlert, setActiveAlert] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [currency, setCurrency] = useState('LKR');
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
          
          if (data.type === 'TX_SUCCESS' || data.type === 'TX_REJECTED') {
            // Cancel previous timeout
            if (alertTimeoutRef.current) {
              clearTimeout(alertTimeoutRef.current);
            }

            // Set active alert details
            setActiveAlert({
              type: data.type,
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
    <NotificationContext.Provider value={{ activeAlert, setActiveAlert, walletBalance, setWalletBalance, currency, updateBalance }}>
      {children}

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

            {activeAlert.type === 'TX_REJECTED' ? (
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
              className="w-full mt-4 py-2.5 bg-slate-150 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-250 font-bold rounded-xl text-xs transition-colors cursor-pointer border-none"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
