import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import ScavengerCode from '../models/ScavengerCode.js';
import ScannedCode from '../models/ScannedCode.js';
import Voucher from '../models/Voucher.js';
import crypto from 'crypto';

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

    // 4.5. Check if total unique scans >= 6 and attendee does not already have a voucher
    const userTotalScans = await ScannedCode.countDocuments({ user_id: userId });
    let earnedVoucher = null;

    if (userTotalScans >= 6) {
      const existingVoucher = await Voucher.findOne({ user: userId });
      if (!existingVoucher) {
        const secureCode = crypto.randomBytes(8).toString('hex').toUpperCase();
        earnedVoucher = await Voucher.create({
          user: userId,
          code: secureCode,
          title: 'Food Court Quest Voucher',
          faceValue: 500.00,
          status: 'Active'
        });
      }
    }

    // 5. Total active codes in venue (can be 20+), quest target is standardized to 6
    const totalActiveCodes = await ScavengerCode.countDocuments({ isActive: true });
    const questTarget = 6;
    const maxScore = totalActiveCodes > 0 ? totalActiveCodes : questTarget;

    return res.status(200).json({
      success: true,
      message: 'Code claimed successfully!',
      score: updatedUser ? updatedUser.scavengerScore : 1,
      maxScore,
      questTarget,
      earnedVoucher: earnedVoucher ? { code: earnedVoucher.code, status: earnedVoucher.status } : null,
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
    const questTarget = 6;
    const maxScore = totalActiveCount > 0 ? totalActiveCount : 6;

    const userVoucher = await Voucher.findOne({ user: userId });

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
      questTarget,
      claimedCount: claimedRecords.length,
      isQuestCompleted: claimedRecords.length >= questTarget,
      voucher: userVoucher ? { code: userVoucher.code, status: userVoucher.status, faceValue: userVoucher.faceValue || 500 } : null,
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

    // Delete user vouchers on reset so they can test/re-trigger the voucher generation
    await Voucher.deleteMany({ user: userId });

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

/**
 * GET /api/scavenger/admin/codes
 * Organizer route: Fetch all codes with statistics
 */
router.get('/admin/codes', protect, async (req, res) => {
  try {
    const codes = await ScavengerCode.find().sort({ createdAt: -1 });
    
    // Aggregate scan counts per code
    const stats = await ScannedCode.aggregate([
      { $group: { _id: '$qr_string', totalScans: { $sum: 1 } } }
    ]);
    const scanMap = {};
    stats.forEach(s => { scanMap[s._id] = s.totalScans; });

    const enrichedCodes = codes.map(c => ({
      ...c.toObject(),
      totalScans: scanMap[c.code] || 0
    }));

    return res.status(200).json({
      success: true,
      codes: enrichedCodes
    });
  } catch (err) {
    console.error('Error fetching admin scavenger codes:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * POST /api/scavenger/admin/codes
 * Organizer route: Create a new custom Scavenger Quest Code
 */
router.post('/admin/codes', protect, async (req, res) => {
  try {
    const { title, locationHint, code, points } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    // Auto-generate code if not explicitly given
    const cleanCode = (code && code.trim()) 
      ? code.trim().toUpperCase().replace(/\s+/g, '_')
      : `HUNT_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const existing = await ScavengerCode.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A quest with this code already exists.' });
    }

    const newCode = await ScavengerCode.create({
      code: cleanCode,
      title: title.trim(),
      locationHint: locationHint ? locationHint.trim() : 'Explore venue area',
      points: Number(points) || 1,
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: 'Scavenger quest created successfully.',
      code: newCode
    });
  } catch (err) {
    console.error('Error creating admin scavenger code:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * DELETE /api/scavenger/admin/codes/:id
 * Organizer route: Delete or deactivate a scavenger code
 */
router.delete('/admin/codes/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    await ScavengerCode.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: 'Scavenger quest code removed successfully.'
    });
  } catch (err) {
    console.error('Error deleting scavenger code:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * GET /api/scavenger/vouchers
 * Returns active and redeemed digital vouchers for the authenticated attendee
 */
router.get('/vouchers', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }

    const vouchers = await Voucher.find({ user: userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      vouchers
    });
  } catch (err) {
    console.error('Error in GET /api/scavenger/vouchers:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * POST /api/scavenger/admin/redeem-voucher
 * Organizer Help/Prize Desk route: Redeem attendee voucher for physical event merchandise or gifts
 */
router.post('/admin/redeem-voucher', protect, async (req, res) => {
  try {
    const { voucherCode } = req.body;
    if (!voucherCode || !voucherCode.trim()) {
      return res.status(400).json({ success: false, message: 'Voucher code is required.' });
    }

    const cleanCode = voucherCode.trim().toUpperCase();
    const voucher = await Voucher.findOne({ code: cleanCode }).populate('user', 'fullName email');

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Invalid voucher code.' });
    }

    if (voucher.status === 'Redeemed') {
      return res.status(400).json({
        success: false,
        message: `Voucher was already redeemed on ${new Date(voucher.redeemedAt).toLocaleString()}.`,
        voucher
      });
    }

    voucher.status = 'Redeemed';
    voucher.redeemedAt = new Date();
    voucher.redeemedBy = req.user.id;
    voucher.redeemerRole = 'organizer';
    await voucher.save();

    return res.status(200).json({
      success: true,
      message: `Voucher ${voucher.code} successfully verified and marked Redeemed at Organizer Prize Desk!`,
      voucher
    });
  } catch (err) {
    console.error('Error redeeming voucher at organizer desk:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * GET /api/scavenger/leaderboard
 * Public/Attendee/Organizer route: Return Top 10 Fast-Finishers and high scorers
 */
router.get('/leaderboard', async (req, res) => {
  try {
    // 1. Find users who have claimed scavenger hunt codes
    const topUsers = await User.find({ scavengerScore: { $gt: 0 } })
      .select('fullName email scavengerScore updatedAt')
      .sort({ scavengerScore: -1, updatedAt: 1 })
      .limit(10)
      .lean();

    // 2. Enrich with total scan count and completion status (>= 6)
    const leaderboard = await Promise.all(topUsers.map(async (u, idx) => {
      const scanCount = await ScannedCode.countDocuments({ user_id: u._id });
      const voucher = await Voucher.findOne({ user: u._id });
      return {
        rank: idx + 1,
        id: u._id,
        name: u.fullName || 'Anonymous Explorer',
        score: u.scavengerScore,
        scans: scanCount,
        hasCompletedQuest: scanCount >= 6,
        isVoucherRedeemed: voucher ? voucher.status === 'Redeemed' : false,
        achievedAt: u.updatedAt
      };
    }));

    return res.status(200).json({
      success: true,
      leaderboard
    });
  } catch (err) {
    console.error('Error fetching scavenger leaderboard:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
