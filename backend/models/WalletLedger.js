import mongoose from 'mongoose';

const walletLedgerSchema = new mongoose.Schema({
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: [true, 'Ledger entry must reference a Wallet ID']
  },
  transactionType: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: {
      values: ['Credit', 'Debit'],
      message: '{VALUE} is not a valid transaction type'
    }
  },
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Transaction amount is required'],
    validate: {
      validator: function (v) {
        if (v === null || v === undefined) return false;
        const val = parseFloat(v.toString());
        return val > 0.00; // Transactions must have positive value
      },
      message: 'Transaction amount must be strictly greater than 0.00.'
    },
    get: v => (v != null ? v.toString() : '0.00')
  },
  balanceBefore: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Balance before is required'],
    validate: {
      validator: function (v) {
        if (v === null || v === undefined) return false;
        const val = parseFloat(v.toString());
        return val >= 0.00;
      },
      message: 'Balance before cannot be negative.'
    },
    get: v => (v != null ? v.toString() : '0.00')
  },
  balanceAfter: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Balance after is required'],
    validate: {
      validator: function (v) {
        if (v === null || v === undefined) return false;
        const val = parseFloat(v.toString());
        return val >= 0.00;
      },
      message: 'Balance after cannot be negative.'
    },
    get: v => (v != null ? v.toString() : '0.00')
  },
  description: {
    type: String,
    trim: true
  },
  referenceType: {
    type: String,
    required: [true, 'Reference type is required'],
    enum: {
      values: ['TicketPurchase', 'TopUp', 'Refund', 'VendorPayment', 'ManualAdjustment', 'EntryActivation'],
      message: '{VALUE} is not a valid reference type'
    }
  },
  referenceId: {
    type: String,
    required: [true, 'Reference ID is required']
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Index to retrieve transaction logs for a wallet sorted chronologically
walletLedgerSchema.index({ wallet: 1, createdAt: -1 });

export default mongoose.model('WalletLedger', walletLedgerSchema);
