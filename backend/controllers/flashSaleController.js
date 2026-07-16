import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import WalletLedger from '../models/WalletLedger.js';
import FlashSale from '../models/FlashSale.js';
import VendorApplication from '../models/VendorApplication.js';
import User from '../models/User.js';
import { broadcastFlashSale } from '../socketManager.js';

// Fixed activation fee for a 15-minute broadcast banner (LKR, matches Wallet currency).
const FLASH_SALE_FEE = 250.0;
const FLASH_SALE_DURATION_MS = 15 * 60 * 1000;

// Lets the transaction body throw a specific status code instead of every
// failure collapsing to a 500 once caught outside session.withTransaction.
class FlashSaleError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// POST /api/flash-sales/purchase
// Atomically debits the vendor's wallet and activates a 15-minute flash-sale
// banner. Both writes happen inside one MongoDB transaction (Atlas replica
// set) so a crash mid-request can never charge the fee without activating
// the banner, or vice versa.
export const purchaseFlashSale = async (req, res) => {
  const { eventId, promoText } = req.body;

  if (!eventId || !promoText || !promoText.trim()) {
    return res.status(400).json({ success: false, message: 'eventId and promoText are required.' });
  }
  if (promoText.trim().length > 140) {
    return res.status(400).json({ success: false, message: 'promoText must be 140 characters or fewer.' });
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      // Must be an approved stall vendor for this event — not just any vendor account.
      const application = await VendorApplication.findOne({
        eventId,
        vendorId: req.user.id,
        status: 'Approved',
      }).session(session);

      if (!application) {
        throw new FlashSaleError(403, 'Only vendors with an approved stall at this event can activate a flash sale.');
      }

      // One broadcast at a time per vendor — stops a double-click (or retry) from stacking charges.
      const existingActive = await FlashSale.findOne({
        vendor: req.user.id,
        event: eventId,
        isActive: true,
        endTime: { $gt: new Date() },
      }).session(session);

      if (existingActive) {
        throw new FlashSaleError(409, 'You already have an active flash sale banner running for this event.');
      }

      let wallet = await Wallet.findOne({ user: req.user.id }).session(session);
      if (!wallet) {
        [wallet] = await Wallet.create([{ user: req.user.id }], { session });
      }

      if (wallet.status !== 'Active') {
        throw new FlashSaleError(400, `Wallet is currently ${wallet.status}. Flash sale purchase is not allowed.`);
      }

      const currentBalance = parseFloat(wallet.balance.toString());
      if (currentBalance < FLASH_SALE_FEE) {
        throw new FlashSaleError(
          402,
          `Insufficient wallet balance. Required LKR ${FLASH_SALE_FEE.toFixed(2)}, available LKR ${currentBalance.toFixed(2)}.`
        );
      }

      const newBalance = currentBalance - FLASH_SALE_FEE;
      wallet.balance = mongoose.Types.Decimal128.fromString(newBalance.toFixed(2));
      await wallet.save({ session });

      const now = new Date();
      const [flashSale] = await FlashSale.create(
        [
          {
            vendor: req.user.id,
            event: eventId,
            stallId: application.requestedStall,
            promoText: promoText.trim(),
            feeCharged: mongoose.Types.Decimal128.fromString(FLASH_SALE_FEE.toFixed(2)),
            startTime: now,
            endTime: new Date(now.getTime() + FLASH_SALE_DURATION_MS),
            isActive: true,
          },
        ],
        { session }
      );

      await WalletLedger.create(
        [
          {
            wallet: wallet._id,
            transactionType: 'Debit',
            amount: mongoose.Types.Decimal128.fromString(FLASH_SALE_FEE.toFixed(2)),
            balanceBefore: mongoose.Types.Decimal128.fromString(currentBalance.toFixed(2)),
            balanceAfter: mongoose.Types.Decimal128.fromString(newBalance.toFixed(2)),
            description: `Flash sale banner activated — stall ${application.requestedStall}`,
            referenceType: 'FlashSalePurchase',
            referenceId: flashSale._id.toString(),
          },
        ],
        { session }
      );

      result = {
        flashSale: {
          id: flashSale._id,
          eventId: flashSale.event,
          stallId: flashSale.stallId,
          promoText: flashSale.promoText,
          feeCharged: flashSale.feeCharged.toString(),
          startTime: flashSale.startTime,
          endTime: flashSale.endTime,
          isActive: flashSale.isActive,
        },
        wallet: {
          balance: wallet.balance.toString(),
          currency: wallet.currency,
        },
      };
    });

    // Transaction has committed at this point — the fee is charged and the
    // banner row exists. Broadcast on the 'flash_sale_broadcast' channel to
    // every connected attendee client immediately afterward.
    const vendorUser = await User.findById(req.user.id).select('fullName');
    broadcastFlashSale({
      vendorName: vendorUser?.fullName || 'A Vendor',
      promoText: result.flashSale.promoText,
      expiresAt: result.flashSale.endTime,
    });

    return res.status(201).json({
      success: true,
      message: 'Flash sale banner activated for the next 15 minutes.',
      ...result,
    });
  } catch (err) {
    if (err instanceof FlashSaleError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error('purchaseFlashSale error:', err);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// GET /api/flash-sales/active?eventId=...
// Powers the broadcast banner on the main app screen — every attendee reads this.
export const getActiveFlashSales = async (req, res) => {
  try {
    const { eventId } = req.query;
    const filter = { isActive: true, endTime: { $gt: new Date() } };
    if (eventId) filter.event = eventId;

    const flashSales = await FlashSale.find(filter)
      .populate('vendor', 'fullName')
      .sort({ startTime: -1 });

    return res.status(200).json({
      success: true,
      count: flashSales.length,
      data: flashSales.map((f) => ({
        id: f._id,
        eventId: f.event,
        vendorName: f.vendor?.fullName || 'Vendor',
        stallId: f.stallId,
        promoText: f.promoText,
        startTime: f.startTime,
        endTime: f.endTime,
      })),
    });
  } catch (err) {
    console.error('getActiveFlashSales error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
