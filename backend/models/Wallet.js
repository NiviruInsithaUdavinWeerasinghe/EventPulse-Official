import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Wallet must belong to an Event Attendee (User)'],
    unique: true
  },
  balance: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Wallet balance is required'],
    default: () => mongoose.Types.Decimal128.fromString('0.00'),
    validate: {
      validator: function (v) {
        if (v === null || v === undefined) return false;
        const val = parseFloat(v.toString());
        return val >= 0.00;
      },
      message: 'Wallet balance cannot be negative (no overdrafts allowed).'
    },
    get: v => (v != null ? v.toString() : '0.00')
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'LKR',
    enum: {
      values: ['LKR'],
      message: 'Currency must be LKR'
    }
  },
  status: {
    type: String,
    required: [true, 'Wallet status is required'],
    enum: {
      values: ['Active', 'Inactive', 'Suspended'],
      message: '{VALUE} is not a valid wallet status'
    },
    default: 'Active'
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

export default mongoose.model('Wallet', walletSchema);
