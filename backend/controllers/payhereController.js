import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import WalletLedger from '../models/WalletLedger.js';
dotenv.config();

const MERCHANT_ID     = process.env.PAYHERE_MERCHANT_ID;
const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET;

// PayHere sandbox checkout endpoint (switch to live URL in production)
const PAYHERE_CHECKOUT_URL = 'https://sandbox.payhere.lk/pay/checkout';

/**
 * EP-55: Generate a secure PayHere checkout hash + payment params.
 * This is the core "handler" that supports local credit cards via PayHere.
 *
 * PayHere requires an MD5 hash built from:
 *   merchant_id + order_id + amount + currency + uppercase(md5(merchant_secret))
 *
 * POST /api/payhere/initiate
 * body: { userId, amount, orderId }
 */
export const initiatePayHerePayment = async (req, res) => {
  try {
    const { userId, amount, orderId } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid userId and amount are required.' });
    }

    const formattedAmount = Number(amount).toFixed(2);
    const currency = 'LKR';
    const generatedOrderId = orderId || `TOPUP-${userId}-${Date.now()}`;

    // ── Build the PayHere security hash ──────────────────────────────────
    const hashedSecret = crypto
      .createHash('md5')
      .update(MERCHANT_SECRET)
      .digest('hex')
      .toUpperCase();

    const hash = crypto
      .createHash('md5')
      .update(
        MERCHANT_ID +
        generatedOrderId +
        formattedAmount +
        currency +
        hashedSecret
      )
      .digest('hex')
      .toUpperCase();

    // ── Payment params the frontend will submit to PayHere checkout ──────
    const paymentParams = {
      merchant_id: MERCHANT_ID,
      return_url: `${req.protocol}://${req.get('host').replace(/:\d+$/, ':5173')}/customer/list?topup=success`,
      cancel_url: `${req.protocol}://${req.get('host').replace(/:\d+$/, ':5173')}/customer/list?topup=cancelled`,
      notify_url: `${req.protocol}://${req.get('host')}/api/payhere/notify`,
      order_id: generatedOrderId,
      items: 'EventPulse Wallet Top-Up',
      amount: formattedAmount,
      currency,
      hash,
    };

    res.status(200).json({
      success: true,
      checkoutUrl: PAYHERE_CHECKOUT_URL,
      params: paymentParams,
    });
  } catch (error) {
    console.error('PayHere initiate error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * EP-55 helper: Verify an incoming PayHere notify webhook signature.
 * PayHere sends back its own md5sig which must match our recomputed hash,
 * otherwise the callback could be spoofed.
 *
 * Used internally by the webhook listener (EP-58 will call this).
 */
export const verifyPayHereSignature = (payload) => {
  const {
    merchant_id,
    order_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
  } = payload;

  const hashedSecret = crypto
    .createHash('md5')
    .update(MERCHANT_SECRET)
    .digest('hex')
    .toUpperCase();

  const localSig = crypto
    .createHash('md5')
    .update(
      merchant_id +
      order_id +
      payhere_amount +
      payhere_currency +
      status_code +
      hashedSecret
    )
    .digest('hex')
    .toUpperCase();

  return localSig === md5sig;
};

/**
 * EP-58: Webhook callback handler to process successful external gateway deposits.
 * Triggered by PayHere server on successful payments.
 */
export const processPayHereNotification = async (req, res) => {
  try {
    const payload = req.body;

    // Verify signature
    if (!verifyPayHereSignature(payload)) {
      console.warn('PayHere webhook signature mismatch:', payload);
      return res.status(400).json({ success: false, message: 'Invalid signature.' });
    }

    const { order_id, payhere_amount, status_code, payment_id } = payload;

    // Status code '2' represents Success in PayHere
    if (status_code === '2') {
      // Parse userId from order_id (Format: TOPUP-${userId}-${Date.now()})
      const parts = order_id.split('-');
      if (parts.length < 2 || parts[0] !== 'TOPUP') {
        return res.status(400).json({ success: false, message: 'Invalid order ID format.' });
      }
      const userId = parts[1];
      const amount = parseFloat(payhere_amount);

      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid payment amount.' });
      }

      // Find or create wallet for user
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        wallet = await Wallet.create({ user: userId });
      }

      const currentBalance = parseFloat(wallet.balance.toString());
      const newBalance = currentBalance + amount;

      // Update wallet balance
      wallet.balance = mongoose.Types.Decimal128.fromString(newBalance.toFixed(2));
      await wallet.save();

      // Create ledger entry
      await WalletLedger.create({
        wallet: wallet._id,
        transactionType: 'Credit',
        amount: mongoose.Types.Decimal128.fromString(amount.toFixed(2)),
        balanceBefore: mongoose.Types.Decimal128.fromString(currentBalance.toFixed(2)),
        balanceAfter: mongoose.Types.Decimal128.fromString(newBalance.toFixed(2)),
        description: 'Online top-up via card/payment gateway (Webhook)',
        referenceType: 'TopUp',
        referenceId: payment_id || order_id,
      });

      console.log(`Successfully processed PayHere deposit of LKR ${amount} for user ${userId}`);
    } else {
      console.log(`PayHere webhook received non-success status: ${status_code} for order ${order_id}`);
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('processPayHereNotification error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};