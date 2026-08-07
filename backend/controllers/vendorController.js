import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import WalletLedger from '../models/WalletLedger.js';
import PaymentToken from '../models/PaymentToken.js';
import User from '../models/User.js';
import VendorApplication from '../models/VendorApplication.js';
import Voucher from '../models/Voucher.js';
import { sendNotification } from '../socketManager.js';

/**
 * EP-80 (US-404)
 * Process checkout payment scanned from an attendee's QR token.
 * POST /api/vendors/checkout
 * Request body: { token, amount }
 */
export const processVendorCheckout = async (req, res) => {
  try {
    const { token, amount } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Payment token is required.' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount.' });
    }

    // ── Intercept Voucher scan reward redemption (must check BEFORE amount > 0 guard) ──
    const voucher = await Voucher.findOne({ code: token });
    if (voucher) {
      if (voucher.status !== 'Active') {
        return res.status(400).json({
          success: false,
          message: `This voucher code has already been ${voucher.status.toLowerCase()}.`,
        });
      }

      // Mark voucher as Redeemed
      voucher.status = 'Redeemed';
      voucher.redeemedAt = new Date();
      await voucher.save();

      // Look up user's wallet
      const wallet = await Wallet.findOne({ user: voucher.user }).populate('user');
      const customerUserId = voucher.user.toString();
      const currentBalance = wallet ? parseFloat(wallet.balance.toString()) : 0;

      // Create a zero-value ledger entry
      let ledgerId = null;
      if (wallet) {
        const ledger = await WalletLedger.create({
          wallet: wallet._id,
          transactionType: 'Debit',
          amount: mongoose.Types.Decimal128.fromString('0.00'),
          balanceBefore: mongoose.Types.Decimal128.fromString(currentBalance.toFixed(2)),
          balanceAfter: mongoose.Types.Decimal128.fromString(currentBalance.toFixed(2)),
          description: `Digital Voucher Redeemed: ${voucher.code}`,
          referenceType: 'Voucher',
          referenceId: voucher._id.toString(),
        });
        ledgerId = ledger._id.toString();
      }

      // Fetch vendor details
      const vendorUser = await User.findById(req.user.id);
      const vendorName = vendorUser ? vendorUser.fullName : 'Stall Vendor';

      // Find active approved vendor application
      const vendorApp = await VendorApplication.findOne({ vendorId: req.user.id, status: 'Approved' }).sort({ updatedAt: -1 });
      const eventId = vendorApp ? vendorApp.eventId : null;

      // Broadcast success to attendee's screen (triggers global success modal overlay)
      sendNotification(customerUserId, {
        type: 'TX_SUCCESS',
        message: 'Voucher redeemed successfully!',
        amount: 0,
        vendorName,
        remainingBalance: currentBalance,
        timestamp: new Date(),
      });

      // Broadcast real-time success to vendor dashboard
      sendNotification(req.user.id.toString(), {
        type: 'VENDOR_SALE_SUCCESS',
        message: 'Voucher checkout recorded.',
        sale: {
          transactionId: ledgerId || voucher._id.toString(),
          customerName: wallet && wallet.user ? wallet.user.fullName : 'Customer',
          grossAmount: 0,
          platformSplit: 0,
          netAmount: 0,
          timestamp: new Date(),
          eventId: eventId ? eventId.toString() : null,
          isVoucher: true
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Voucher redeemed successfully.',
        transaction: {
          id: ledgerId || voucher._id.toString(),
          amount: 0,
          description: `Voucher Redeemed: ${voucher.code}`,
          isVoucher: true,
          timestamp: voucher.redeemedAt,
        }
      });
    }

    // Guard: standard payment must be positive
    if (numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount. Must be a positive number.' });
    }

    // 1. Find the payment token
    const paymentToken = await PaymentToken.findOne({ token });

    if (!paymentToken) {
      return res.status(404).json({ success: false, message: 'Payment token not found.' });
    }

    // 2. Validate token status and expiry
    if (paymentToken.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `This payment token has already been ${paymentToken.status.toLowerCase()}.`,
      });
    }

    if (new Date() >= paymentToken.expiresAt) {
      // Lazy expire token
      paymentToken.status = 'Expired';
      await paymentToken.save();
      return res.status(400).json({ success: false, message: 'This payment token has expired.' });
    }

    // 3. Look up attendee's wallet
    const wallet = await Wallet.findById(paymentToken.wallet).populate('user');
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Associated wallet not found.' });
    }

    if (wallet.status !== 'Active') {
      return res.status(400).json({ success: false, message: 'Associated wallet is not active.' });
    }

    const currentBalance = parseFloat(wallet.balance.toString());
    const customerUserId = wallet.user?._id ? wallet.user._id.toString() : wallet.user?.toString();

    // US-405: Check if balance is adequate
    if (currentBalance < numAmount) {
      if (customerUserId) {
        // Send WebSocket rejection event to attendee
        sendNotification(customerUserId, {
          type: 'TX_REJECTED',
          message: 'Insufficient Wallet Balance',
          amount: numAmount,
          timestamp: new Date(),
        });
      }

      return res.status(400).json({ success: false, message: 'Insufficient Wallet Balance' });
    }

    // 4. Perform atomic balance deduction and ledger writing
    const newBalance = currentBalance - numAmount;
    wallet.balance = mongoose.Types.Decimal128.fromString(newBalance.toFixed(2));
    
    // Mongoose schema validator will throw an error and abort if balance goes negative
    await wallet.save();

    // Find active approved vendor application to associate with eventId
    const vendorApp = await VendorApplication.findOne({ vendorId: req.user.id, status: 'Approved' }).sort({ updatedAt: -1 });
    const eventId = vendorApp ? vendorApp.eventId : null;

    // Mark the payment token as Used
    paymentToken.status = 'Used';
    paymentToken.debitedAmount = mongoose.Types.Decimal128.fromString(numAmount.toFixed(2));
    paymentToken.vendorId = req.user.id; // vendor user id from protect middleware
    if (eventId) {
      paymentToken.eventId = eventId;
    }
    await paymentToken.save();

    // Create WalletLedger debit entry
    const ledger = await WalletLedger.create({
      wallet: wallet._id,
      transactionType: 'Debit',
      amount: mongoose.Types.Decimal128.fromString(numAmount.toFixed(2)),
      balanceBefore: mongoose.Types.Decimal128.fromString(currentBalance.toFixed(2)),
      balanceAfter: mongoose.Types.Decimal128.fromString(newBalance.toFixed(2)),
      description: `POS Checkout Payment to Vendor`,
      referenceType: 'VendorPayment',
      referenceId: paymentToken._id.toString(),
    });

    // Fetch vendor user profile details to get their full name
    const vendorUser = await User.findById(req.user.id);
    const vendorName = vendorUser ? vendorUser.fullName : 'Stall Vendor';

    // Broadcast success event to the attendee's client screen
    if (customerUserId) {
      sendNotification(customerUserId, {
        type: 'TX_SUCCESS',
        message: 'Transaction completed successfully.',
        amount: numAmount,
        vendorName,
        remainingBalance: newBalance,
        timestamp: ledger.createdAt,
      });
    }

    // Calculate Platform Split and Net Earnings
    const platformSplitPercentage = process.env.PLATFORM_SPLIT_PERCENTAGE ? parseFloat(process.env.PLATFORM_SPLIT_PERCENTAGE) : 5.0;
    const grossAmount = numAmount;
    const platformSplit = grossAmount * (platformSplitPercentage / 100.0);
    const netAmount = grossAmount - platformSplit;

    // Broadcast real-time success event to the vendor's dashboard
    sendNotification(req.user.id.toString(), {
      type: 'VENDOR_SALE_SUCCESS',
      message: 'New sale recorded.',
      sale: {
        transactionId: ledger._id.toString(),
        customerName: wallet.user ? wallet.user.fullName : 'Customer',
        grossAmount,
        platformSplit,
        netAmount,
        timestamp: ledger.createdAt,
        eventId: eventId ? eventId.toString() : null,
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Transaction completed successfully.',
      transaction: {
        transactionId: ledger._id,
        amount: numAmount,
        currency: wallet.currency,
        timestamp: ledger.createdAt,
      },
    });
  } catch (error) {
    console.error('processVendorCheckout error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * US-407-SUB-3
 * Retrieve vendor's successfully completed sales performance data.
 * GET /api/vendors/sales-performance?eventId=...
 */
export const getSalesPerformance = async (req, res) => {
  try {
    const { eventId } = req.query;

    // Security: Filter strictly by the authenticated vendor's ID
    const query = { vendorId: req.user.id, status: 'Used' };
    
    // Filtering: If eventId is provided, filter by it
    if (eventId) {
      query.eventId = eventId;
    }

    // Fetch successful sales in oldest-to-newest order to calculate cumulative progression metrics
    const tokens = await PaymentToken.find(query)
      .populate('user', 'fullName')
      .sort({ createdAt: 1 });

    const platformSplitPercentage = process.env.PLATFORM_SPLIT_PERCENTAGE ? parseFloat(process.env.PLATFORM_SPLIT_PERCENTAGE) : 5.0;

    let totalGrossSales = 0;
    let totalPlatformFee = 0;
    let totalNetEarnings = 0;
    
    const chartData = [];
    const timeline = [];

    for (const token of tokens) {
      const gross = parseFloat(token.debitedAmount?.toString() || '0');
      const fee = gross * (platformSplitPercentage / 100.0);
      const net = gross - fee;

      totalGrossSales += gross;
      totalPlatformFee += fee;
      totalNetEarnings += net;

      // Cumulative data point for visualization
      chartData.push({
        timestamp: token.createdAt,
        grossAmount: parseFloat(gross.toFixed(2)),
        netAmount: parseFloat(net.toFixed(2)),
        cumulativeNet: parseFloat(totalNetEarnings.toFixed(2)),
      });

      timeline.push({
        transactionId: token._id.toString(),
        customerName: token.user ? token.user.fullName : 'Customer',
        grossAmount: parseFloat(gross.toFixed(2)),
        platformSplit: parseFloat(fee.toFixed(2)),
        netAmount: parseFloat(net.toFixed(2)),
        timestamp: token.createdAt,
        eventId: token.eventId ? token.eventId.toString() : null,
      });
    }

    // Sort timeline chronologically descending (newest first) for visual feed display
    timeline.reverse();

    return res.status(200).json({
      success: true,
      summary: {
        grossSales: parseFloat(totalGrossSales.toFixed(2)),
        platformFee: parseFloat(totalPlatformFee.toFixed(2)),
        netEarnings: parseFloat(totalNetEarnings.toFixed(2)),
        totalSales: timeline.length,
      },
      timeline,
      chartData,
    });
  } catch (error) {
    console.error('getSalesPerformance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve sales performance data.',
      error: error.message,
    });
  }
};

