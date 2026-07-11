import mongoose from 'mongoose';

/**
 * PaymentToken — EP-59 / EP-61 (US-403)
 *
 * Stores a single-use, 60-second TTL payment QR token for each attendee wallet.
 *
 * Lifecycle:
 *   Active  → created by generatePaymentToken, displayed to attendee
 *   Used    → invalidated the moment a vendor's debit API hit lands (US-404)
 *   Expired → set automatically when a new token is generated or TTL elapsed
 */
const paymentTokenSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: [true, 'PaymentToken must reference a Wallet'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'PaymentToken must reference a User'],
    },
    // 64-char hex string: crypto.randomBytes(32).toString('hex')
    token: {
      type: String,
      required: [true, 'Token string is required'],
      unique: true,
      index: true,
    },
    // Absolute expiry timestamp — exactly 60 seconds after creation
    expiresAt: {
      type: Date,
      required: [true, 'Token expiry timestamp is required'],
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['Active', 'Used', 'Expired'],
        message: '{VALUE} is not a valid token status',
      },
      default: 'Active',
    },
    // Populated by the vendor debit endpoint (US-404) when this token is consumed
    debitedAmount: {
      type: mongoose.Schema.Types.Decimal128,
      default: null,
      get: (v) => (v != null ? v.toString() : null),
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Compound index: quickly find the latest Active token for a given wallet
paymentTokenSchema.index({ wallet: 1, status: 1, createdAt: -1 });

export default mongoose.model('PaymentToken', paymentTokenSchema);
