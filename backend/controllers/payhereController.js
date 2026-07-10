import crypto from 'crypto';
import dotenv from 'dotenv';
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