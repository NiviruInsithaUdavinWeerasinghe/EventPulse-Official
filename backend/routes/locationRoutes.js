import express from 'express';
import { protect } from '../middleware/auth.js';
import VenueZone from '../models/VenueZone.js';
import { queueLocationPing } from '../services/locationBatchService.js';
import { sendFcmNotification } from '../services/fcmService.js';
import { sendNotification as sendWsNotification } from '../socketManager.js';
import Ticket from '../models/Ticket.js';
import Event from '../models/Event.js';
import LocationPing from '../models/LocationPing.js';

const router = express.Router();

// Enforce a cooldown in memory to avoid spamming the user with duplicate push/socket alerts
const alertCooldowns = new Map(); // key: `${userId}_${zoneId}`, value: timestamp (ms)
const ALERT_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown per zone

/**
 * SUB-1 + SUB-2 + SUB-3: GPS location ping endpoint.
 * POST /api/location/ping
 * Body: { latitude, longitude, fcmToken }
 */
router.post('/ping', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, fcmToken } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required.' });
    }

    // 1. Queue location update in the asynchronous/batched memory service (SUB-1)
    queueLocationPing(userId, latitude, longitude, fcmToken);

    // 2. Perform spatial query asynchronously in the background (SUB-2 & SUB-3)
    // Run this process after responding or do not await it, keeping the endpoint lightweight.
    runSpatialCheck(userId, parseFloat(latitude), parseFloat(longitude), fcmToken);

    // 3. Record historical LocationPing for peak hours analytics (US-601)
    try {
      let eventIdToUse = null;

      // If a specific eventId was passed from the Proximity Simulator, use it directly
      if (req.body.eventId) {
        eventIdToUse = req.body.eventId;
      } else {
        // Otherwise resolve from user's latest ticket, or fall back to the most recent event
        const latestTicket = await Ticket.findOne({ user: userId }).sort({ createdAt: -1 });
        if (latestTicket) {
          eventIdToUse = latestTicket.event;
        } else {
          const defaultEvent = await Event.findOne().sort({ createdAt: -1 });
          if (defaultEvent) {
            eventIdToUse = defaultEvent._id;
          }
        }
      }

      if (eventIdToUse) {
        await LocationPing.create({
          eventId: eventIdToUse,
          userId: userId,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          timestamp: new Date()
        });
      }
    } catch (dbErr) {
      console.error('[Location Historical Ping Save Error]:', dbErr);
    }

    // Respond immediately to prevent server lag or blocking the client request (optimized)
    return res.status(200).json({ success: true, message: 'Ping received and queued.' });
  } catch (error) {
    console.error('[Ping Endpoint Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Background runner for spatial proximity matching and alert dispatch.
 */
async function runSpatialCheck(userId, latitude, longitude, fcmToken) {
  try {
    // SUB-2: Find all venue polygons marked with a 'Red' (Full) status within 50 meters of user coordinate
    // Note: GeoJSON coordinates are in [longitude, latitude] order
    const nearbyFullZones = await VenueZone.find({
      status: 'Red',
      geometry: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: 50 // 50 meters
        }
      }
    });

    if (nearbyFullZones.length === 0) return;

    const now = Date.now();

    for (const zone of nearbyFullZones) {
      const cooldownKey = `${userId}_${zone._id}`;
      const lastAlerted = alertCooldowns.get(cooldownKey) || 0;

      if (now - lastAlerted > ALERT_COOLDOWN_MS) {
        // Enforce cooldown
        alertCooldowns.set(cooldownKey, now);

        const title = 'Area Full';
        const body = `${zone.name} is currently at maximum capacity.`;

        // SUB-3: Dispatch Firebase Push Notification (if token is registered)
        if (fcmToken) {
          sendFcmNotification(fcmToken, title, body);
        } else {
          console.log(`[FCM Skip] User ${userId} has no registered fcmToken. Skip FCM dispatch.`);
        }

        // Real-time WebSocket delivery to ensure frontend shows the alert immediately
        sendWsNotification(userId, {
          type: 'AREA_FULL_ALERT',
          title: title,
          message: body,
          timestamp: new Date()
        });

        console.log(`[Alert Dispatched] Sent full capacity alert for ${zone.name} to User ${userId}.`);
      } else {
        console.log(`[Alert Suppressed] Alert for ${zone.name} to User ${userId} is within cooldown window.`);
      }
    }
  } catch (error) {
    console.error('[Spatial Proximity Check Error]:', error);
  }
}

/**
 * GET /api/location/zones
 * Fetch list of all zones (for frontend display/toggle)
 */
router.get('/zones', async (req, res) => {
  try {
    const zones = await VenueZone.find({});
    res.status(200).json({ success: true, data: zones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/location/zones/:id/status
 * Toggle capacity status of a zone
 */
router.put('/zones/:id/status', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Green', 'Yellow', 'Red'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const updated = await VenueZone.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Zone not found.' });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/location/seed-zones
 * Seed sample Colombo-based venue zones
 */
router.post('/seed-zones', protect, async (req, res) => {
  try {
    // Delete existing ones to prevent duplicates during seeding
    await VenueZone.deleteMany({});

    // Sample zones near Colombo (Sri Lanka)
    // Hall A: Center is Colombo Exhibition Center (lat: 6.9272, lng: 79.8612)
    // Hall B: Center is near SLECC (lat: 6.9282, lng: 79.8622)
    // Hall C: Center is BMICH (lat: 6.9015, lng: 79.8732)
    const seedData = [
      {
        name: 'Exhibition Hall A',
        status: 'Green',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [79.8608, 6.9268],
            [79.8616, 6.9268],
            [79.8616, 6.9276],
            [79.8608, 6.9276],
            [79.8608, 6.9268] // Close the polygon loop
          ]]
        }
      },
      {
        name: 'Convention Hall B',
        status: 'Green',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [79.8618, 6.9278],
            [79.8626, 6.9278],
            [79.8626, 6.9286],
            [79.8618, 6.9286],
            [79.8618, 6.9278]
          ]]
        }
      },
      {
        name: 'Main Conference Center C',
        status: 'Green',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [79.8728, 6.9011],
            [79.8736, 6.9011],
            [79.8736, 6.9019],
            [79.8728, 6.9019],
            [79.8728, 6.9011]
          ]]
        }
      }
    ];

    const inserted = await VenueZone.insertMany(seedData);
    res.status(201).json({ success: true, data: inserted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
