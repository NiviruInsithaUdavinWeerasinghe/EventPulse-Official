import VendorAd from '../models/VendorAd.js';
import AdImpression from '../models/AdImpression.js';

// EP-134: Anti-spam cooldown — same ad won't re-trigger for a user within this window
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

// ── EP-126: Vendor creates a proximity ad anchored to their approved stall ──
// POST /api/vendor-ads
export const createVendorAd = async (req, res) => {
  try {
    const { eventId, vendorId, stallId, title, message, radiusPx } = req.body;

    if (!eventId || !vendorId || !stallId || !title || !message) {
      return res.status(400).json({ success: false, message: 'Missing required ad fields.' });
    }

    const ad = await VendorAd.create({
      eventId,
      vendorId,
      stallId,
      title,
      message,
      radiusPx: radiusPx || 80,
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

// ── EP-129: Get all active ads for an event (loaded once by MapViewer) ──────
// GET /api/vendor-ads/event/:eventId/active
export const getActiveAdsForEvent = async (req, res) => {
  try {
    const ads = await VendorAd.find({ eventId: req.params.eventId, isActive: true });
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

    const { title, message, radiusPx, isActive } = req.body;
    if (title !== undefined) ad.title = title;
    if (message !== undefined) ad.message = message;
    if (radiusPx !== undefined) ad.radiusPx = radiusPx;
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

// ── EP-134: Attempt to trigger an ad for a user (checks + applies cooldown) ─
// Called by MapViewer the instant it detects the "me" marker is within an
// ad's radius of its stall. Returns whether the ad is allowed to display.
//
// POST /api/vendor-ads/trigger
// body: { adId, userId }
export const triggerAdForUser = async (req, res) => {
  try {
    const { adId, userId } = req.body;

    if (!adId || !userId) {
      return res.status(400).json({ success: false, message: 'adId and userId are required.' });
    }

    const now = Date.now();
    const impression = await AdImpression.findOne({ adId, userId });

    const isOnCooldown =
      impression && now - new Date(impression.shownAt).getTime() < COOLDOWN_MS;

    if (isOnCooldown) {
      return res.status(200).json({ success: true, shouldShow: false, reason: 'cooldown' });
    }

    await AdImpression.findOneAndUpdate(
      { adId, userId },
      { shownAt: new Date() },
      { upsert: true }
    );

    res.status(200).json({ success: true, shouldShow: true });
  } catch (error) {
    console.error('Trigger ad error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};