import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import ScavengerCode from '../models/ScavengerCode.js';
import ScannedCode from '../models/ScannedCode.js';

const router = express.Router();

/**
 * Seed initial sample scavenger hunt codes if none exist
 */
export async function seedScavengerCodes() {
  try {
    const count = await ScavengerCode.countDocuments();
    if (count === 0) {
      await ScavengerCode.insertMany([
        { code: 'HUNT_ZONE_A_101', title: 'Main Entrance Arch', locationHint: 'Near the main entrance welcoming arch', points: 1 },
        { code: 'HUNT_VIP_LOUNGE_202', title: 'VIP Lounge Secret Banner', locationHint: 'Behind the VIP lounge lounge sofa', points: 1 },
        { code: 'HUNT_STAGE_NORTH_303', title: 'North Stage Speaker Stack', locationHint: 'Left side of the main performance stage', points: 1 },
        { code: 'HUNT_FOOD_COURT_404', title: 'Gourmet Food Hub', locationHint: 'Near the central food court seating area', points: 1 },
        { code: 'HUNT_MAIN_HALL_505', title: 'Tech Innovation Expo', locationHint: 'Under the main hall giant LED screen', points: 1 },
      ]);
      console.log('Seeded default Scavenger Hunt codes');
    }
  } catch (err) {
    console.error('Error seeding scavenger codes:', err);
  }
}

/**
 * POST /api/scavenger/scan
 * Accepts { qr_string } or { code }
 * Authenticated JWT user required (req.user.id derived from token)
 * SUB-2 - Duplicate scan prevention & validation logic
 */
router.post('/scan', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }

    const rawCode = req.body.qr_string || req.body.code;
    if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
      return res.status(400).json({ success: false, message: 'QR string is required.' });
    }

    const scannedCodeStr = rawCode.trim();

    // 1. Validate scanned QR string against scavenger_codes collection
    const validCode = await ScavengerCode.findOne({ code: scannedCodeStr, isActive: true });
    if (!validCode) {
      return res.status(404).json({ success: false, message: 'Invalid QR Code' });
    }

    // 2. Query scanned_codes database table for duplicate scan matching (string AND user_id)
    const existingClaim = await ScannedCode.findOne({ qr_string: scannedCodeStr, user_id: userId });
    if (existingClaim) {
      return res.status(400).json({ success: false, message: 'Already Claimed' });
    }

    // 3. Insert record into scanned_codes table (handles concurrent duplicate race condition via compound unique index)
    try {
      await ScannedCode.create({
        qr_string: scannedCodeStr,
        user_id: userId,
        scannedAt: new Date(),
      });
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        return res.status(400).json({ success: false, message: 'Already Claimed' });
      }
      throw dbErr;
    }

    // 4. Increment user's total score column by 1 (or by validCode.points)
    const pointsToAward = validCode.points || 1;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { scavengerScore: pointsToAward } },
      { new: true }
    );

    // 5. Derive dynamic maxScore based on active scavenger hunt codes
    const totalActiveCodes = await ScavengerCode.countDocuments({ isActive: true });
    const maxScore = totalActiveCodes > 0 ? totalActiveCodes : 5;

    return res.status(200).json({
      success: true,
      message: 'Code claimed successfully!',
      score: updatedUser ? updatedUser.scavengerScore : 1,
      maxScore,
      scannedCode: {
        code: validCode.code,
        title: validCode.title,
        locationHint: validCode.locationHint,
        points: pointsToAward,
      },
    });
  } catch (err) {
    console.error('Error in POST /api/scavenger/scan:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * GET /api/scavenger/progress
 * Returns user's scavenger hunt progress, claimed codes, score, and dynamic maxScore
 */
router.get('/progress', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }

    const user = await User.findById(userId).select('scavengerScore fullName email');
    const userScore = user ? (user.scavengerScore || 0) : 0;

    const claimedRecords = await ScannedCode.find({ user_id: userId }).sort({ createdAt: -1 });
    const claimedStrings = claimedRecords.map(c => c.qr_string);

    const allCodes = await ScavengerCode.find({ isActive: true }).select('code title locationHint points');
    const totalActiveCount = allCodes.length;
    const maxScore = totalActiveCount > 0 ? totalActiveCount : 5;

    const codeListWithStatus = allCodes.map(item => ({
      code: item.code,
      title: item.title,
      locationHint: item.locationHint,
      points: item.points,
      isClaimed: claimedStrings.includes(item.code),
    }));

    return res.status(200).json({
      success: true,
      score: userScore,
      maxScore,
      claimedCount: claimedRecords.length,
      claimedCodes: claimedStrings,
      codes: codeListWithStatus,
    });
  } catch (err) {
    console.error('Error in GET /api/scavenger/progress:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * POST /api/scavenger/reset
 * Demo helper endpoint: Resets/unclaims all scavenger codes for the authenticated user
 */
router.post('/reset', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }

    // Delete all scanned codes for this user
    await ScannedCode.deleteMany({ user_id: userId });

    // Reset user score to 0
    await User.findByIdAndUpdate(userId, { scavengerScore: 0 });

    const allCodes = await ScavengerCode.find({ isActive: true });
    const maxScore = allCodes.length > 0 ? allCodes.length : 5;

    return res.status(200).json({
      success: true,
      message: 'Scavenger hunt progress reset successfully!',
      score: 0,
      maxScore,
    });
  } catch (err) {
    console.error('Error resetting scavenger progress:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
