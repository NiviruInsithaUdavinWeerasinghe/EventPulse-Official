import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Redeemed', 'Expired'],
    default: 'Active'
  },
  redeemedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('Voucher', voucherSchema);
