import LocationPing from '../models/LocationPing.js';
import mongoose from 'mongoose';

export async function getHistoricalHeatmap(req, res) {
  try {
    const { eventId, timestamp } = req.query;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'eventId query parameter is required.' });
    }

    if (!timestamp) {
      return res.status(400).json({ success: false, message: 'timestamp query parameter is required.' });
    }

    console.log('[HEATMAP BACKEND] Received request for event:', eventId, 'at timestamp:', timestamp);
    const targetDate = new Date(timestamp);
    if (isNaN(targetDate.getTime())) {
      console.warn('[HEATMAP BACKEND] Invalid timestamp:', timestamp);
      return res.status(400).json({ success: false, message: 'Invalid timestamp format.' });
    }

    // Smart date alignment: find the latest ping in the DB for this event
    const latestPing = await LocationPing.findOne({
      eventId: new mongoose.Types.ObjectId(eventId)
    }).sort({ timestamp: -1 });

    let queryDate = targetDate;
    if (latestPing) {
      queryDate = new Date(latestPing.timestamp);
      // Align target hour and minutes from requested timestamp onto the latest ping's date
      queryDate.setHours(targetDate.getHours());
      queryDate.setMinutes(targetDate.getMinutes());
      queryDate.setSeconds(targetDate.getSeconds());
      queryDate.setMilliseconds(targetDate.getMilliseconds());
      console.log('[HEATMAP BACKEND] Aligned query date to latest ping date:', queryDate.toISOString());
    } else {
      console.log('[HEATMAP BACKEND] No pings in DB. Querying target date directly:', targetDate.toISOString());
    }

    // Set 5-minute window: queryDate ± 2.5 minutes
    const startTime = new Date(queryDate.getTime() - 2.5 * 60 * 1000);
    const endTime = new Date(queryDate.getTime() + 2.5 * 60 * 1000);
    console.log('[HEATMAP BACKEND] Parsed targetDate:', targetDate.toString());
    console.log('[HEATMAP BACKEND] Time window boundaries: [', startTime.toISOString(), 'to', endTime.toISOString(), ']');

    // Fetch pings
    const pings = await LocationPing.find({
      eventId: new mongoose.Types.ObjectId(eventId),
      timestamp: { $gte: startTime, $lte: endTime }
    });

    console.log('[HEATMAP BACKEND] DB Query returned pings count:', pings.length);
    if (pings.length > 0) {
      console.log('[HEATMAP BACKEND] Samples of raw pings in window:', pings.slice(0, 5).map(p => ({ lat: p.latitude, lon: p.longitude, time: p.timestamp })));
    }

    const step = 0.0005; // ~55m grid step
    const clusters = {};

    pings.forEach(ping => {
      if (ping.latitude != null && ping.longitude != null) {
        const latBin = Math.floor(ping.latitude / step) * step;
        const lonBin = Math.floor(ping.longitude / step) * step;
        const key = `${latBin.toFixed(6)},${lonBin.toFixed(6)}`;

        if (!clusters[key]) {
          clusters[key] = {
            latBin,
            lonBin,
            count: 0
          };
        }
        clusters[key].count++;
      }
    });

    // Convert to GeoJSON FeatureCollection
    const features = Object.values(clusters).map(cluster => {
      const { latBin, lonBin, count } = cluster;

      // Assign density state
      let density = 'Green';
      if (count > 15) {
        density = 'Red';
      } else if (count > 5) {
        density = 'Yellow';
      }

      return {
        type: 'Feature',
        properties: {
          density,
          count
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lonBin, latBin],
              [lonBin + step, latBin],
              [lonBin + step, latBin + step],
              [lonBin, latBin + step],
              [lonBin, latBin] // Close polygon
            ]
          ]
        }
      };
    });

    console.log('[HEATMAP BACKEND] GeoJSON clusters generated:', features.length);
    if (features.length > 0) {
      console.log('[HEATMAP BACKEND] Sample cluster feature properties:', features.slice(0, 3).map(f => f.properties));
    }

    return res.json({
      success: true,
      data: {
        type: 'FeatureCollection',
        features
      }
    });
  } catch (error) {
    console.error('Error fetching historical heatmap:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving historical heatmap.' });
  }
}
