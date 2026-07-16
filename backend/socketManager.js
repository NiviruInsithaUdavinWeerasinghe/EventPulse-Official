import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

let wss = null;
const clientSockets = new Map(); // userId -> Set of sockets (to support multiple sessions/tabs)

export const initWebSocket = (server) => {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    // Parse URL to check parameters
    const url = new URL(request.url, 'http://localhost');
    const token = url.searchParams.get('token');

    // Only handle upgrades destined for the WS route
    if (url.pathname === '/ws' || url.pathname === '/') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, request) => {
    let userId = null;

    const url = new URL(request.url, 'http://localhost');
    const token = url.searchParams.get('token');

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        if (userId) {
          if (!clientSockets.has(userId)) {
            clientSockets.set(userId, new Set());
          }
          clientSockets.get(userId).add(ws);
          
          // Send a welcome message
          ws.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket connected and authenticated.' }));
        }
      } catch (err) {
        console.error('WS authentication error:', err.message);
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Authentication failed.' }));
        ws.close();
        return;
      }
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'auth' && data.token) {
          const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
          userId = decoded.id;
          if (userId) {
            if (!clientSockets.has(userId)) {
              clientSockets.set(userId, new Set());
            }
            clientSockets.get(userId).add(ws);
            ws.send(JSON.stringify({ type: 'AUTHENTICATED', message: 'Authenticated successfully.' }));
          }
        }
      } catch (err) {
        console.error('WS message processing error:', err.message);
      }
    });

    ws.on('close', () => {
      if (userId && clientSockets.has(userId)) {
        const sockets = clientSockets.get(userId);
        sockets.delete(ws);
        if (sockets.size === 0) {
          clientSockets.delete(userId);
        }
      }
    });
  });
};

export const sendNotification = (userId, payload) => {
  if (clientSockets.has(userId)) {
    const sockets = clientSockets.get(userId);
    const messageStr = JSON.stringify(payload);
    sockets.forEach((ws) => {
      if (ws.readyState === 1) { // OPEN
        ws.send(messageStr);
      }
    });
  }
};

// Sends to every connected client across every user — used for event-wide
// broadcasts (e.g. flash sales) rather than a single targeted notification.
export const broadcastToAll = (payload) => {
  const messageStr = JSON.stringify(payload);
  clientSockets.forEach((sockets) => {
    sockets.forEach((ws) => {
      if (ws.readyState === 1) { // OPEN
        ws.send(messageStr);
      }
    });
  });
};

// 'flash_sale_broadcast' channel: every attendee client already holds one
// open WebSocket connection (see NotificationContext.jsx) multiplexed by
// `type`, so this "channel" is just a dedicated message type broadcast to
// all of them rather than a separate socket/subscription.
export const broadcastFlashSale = ({ vendorName, promoText, expiresAt }) => {
  broadcastToAll({
    channel: 'flash_sale_broadcast',
    type: 'flash_sale_broadcast',
    vendorName,
    promoText,
    expiresAt, // absolute server timestamp (ISO string) — NOW + 15 minutes
  });
};
