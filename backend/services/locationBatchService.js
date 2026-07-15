import User from '../models/User.js';

let locationQueue = {}; // map of userId -> { latitude, longitude, fcmToken, lastPing }

/**
 * Queue a user's location ping update.
 */
export const queueLocationPing = (userId, latitude, longitude, fcmToken) => {
  locationQueue[userId] = {
    latitude,
    longitude,
    fcmToken,
    lastPing: new Date()
  };
};

/**
 * Start background batch processor.
 * Runs bulk database writes every 5 seconds to prevent server lag.
 */
export const startLocationBatchProcessor = () => {
  setInterval(async () => {
    const keys = Object.keys(locationQueue);
    if (keys.length === 0) return;

    const batch = keys.map((userId) => {
      const data = locationQueue[userId];
      const updateData = {
        latitude: data.latitude,
        longitude: data.longitude,
        lastPing: data.lastPing
      };
      if (data.fcmToken) {
        updateData.fcmToken = data.fcmToken;
      }
      return {
        updateOne: {
          filter: { _id: userId },
          update: { $set: updateData }
        }
      };
    });

    // Clear queue before async database operation to avoid losing updates
    locationQueue = {};

    try {
      await User.bulkWrite(batch);
      console.log(`[Location Batch] Successfully wrote batch of ${batch.length} location updates.`);
    } catch (error) {
      console.error('[Location Batch Error] Failed to write location updates:', error);
    }
  }, 5000);
};
