import VendorAd from '../models/VendorAd.js';
import AdImpression from '../models/AdImpression.js';

// ── EP-134: Anti-spam cooldown — same ad won't re-trigger for a user within this window
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Haversine formula — great-circle distance between two GPS points, in meters.
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// ── EP-126: Vendor creates a location-based ad ──────────────────────────────
// POST /api/vendor-ads
export const createVendorAd = async (req, res) => {
  try {
    const { eventId, vendorId, stallId, title, message, latitude, longitude, radiusMeters } = req.body;

    if (!eventId || !vendorId || !title || !message || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required ad fields.' });
    }

    const ad = await VendorAd.create({
      eventId,
      vendorId,
      stallId: stallId || '',
      title,
      message,
      latitude,
      longitude,
      radiusMeters: radiusMeters || 50,
    });

    res.status(201).json({ success: true, data: ad });
  } catch (error) {
    console.error('Create vendor ad error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── EP-126: List a vendor's own ads (for the dashboard) ─────────────────────
// GET /api/vendor-ads/vendor/:vendorId
export const getVendorAds = async (req, res) => {
  try {
    const ads = await VendorAd.find({ vendorId: req.params.vendorId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: ads.length, data: ads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── EP-126: Toggle an ad active/inactive, or update it ──────────────────────
// PUT /api/vendor-ads/:id
export const updateVendorAd = async (req, res) => {
  try {
    const ad = await VendorAd.findById(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found.' });

    const { title, message, latitude, longitude, radiusMeters, isActive } = req.body;
    if (title !== undefined) ad.title = title;
    if (message !== undefined) ad.message = message;
    if (latitude !== undefined) ad.latitude = latitude;
    if (longitude !== undefined) ad.longitude = longitude;
    if (radiusMeters !== undefined) ad.radiusMeters = radiusMeters;
    if (isActive !== undefined) ad.isActive = isActive;

    await ad.save();
    res.status(200).json({ success: true, data: ad });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── EP-126: Delete an ad ─────────────────────────────────────────────────────
// DELETE /api/vendor-ads/:id
export const deleteVendorAd = async (req, res) => {
  try {
    await VendorAd.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Ad deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── EP-129 + EP-134: Attendee-side geofence check ───────────────────────────
// Given the attendee's current GPS position, find active ads whose
// geofence radius contains that position — and filter out any ad still
// in its anti-spam cooldown window for this user.
//
// POST /api/vendor-ads/nearby
// body: { userId, eventId, latitude, longitude }
export const getNearbyAds = async (req, res) => {
  try {
    const { userId, eventId, latitude, longitude } = req.body;

    if (!userId || !eventId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'userId, eventId, latitude, and longitude are required.' });
    }

    // EP-129: pull all active ads for this event, then filter by geofence distance
    const candidateAds = await VendorAd.find({ eventId, isActive: true });

    const inRangeAds = candidateAds.filter((ad) => {
      const distance = haversineDistanceMeters(latitude, longitude, ad.latitude, ad.longitude);
      return distance <= ad.radiusMeters;
    });

    if (inRangeAds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // EP-134: filter out ads still on cooldown for this specific user
    const now = Date.now();
    const eligibleAds = [];

    for (const ad of inRangeAds) {
      const impression = await AdImpression.findOne({ adId: ad._id, userId });

      const isOnCooldown =
        impression && now - new Date(impression.shownAt).getTime() < COOLDOWN_MS;

      if (!isOnCooldown) {
        eligibleAds.push(ad);
      }
    }

    // Record/refresh an impression timestamp for every ad we're about to show,
    // so it goes on cooldown immediately (prevents duplicate rapid triggers).
    await Promise.all(
      eligibleAds.map((ad) =>
        AdImpression.findOneAndUpdate(
          { adId: ad._id, userId },
          { shownAt: new Date() },
          { upsert: true }
        )
      )
    );

    res.status(200).json({ success: true, count: eligibleAds.length, data: eligibleAds });
  } catch (error) {
    console.error('Get nearby ads error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};