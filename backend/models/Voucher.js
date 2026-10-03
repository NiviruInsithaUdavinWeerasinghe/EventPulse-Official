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
  faceValue: {
    type: Number,
    default: 500.00 // Organizer subsidy credited to vendor or prize value
  },
  title: {
    type: String,
    default: 'Food Court Quest Voucher'
  },
  redeemedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  redeemerRole: {
    type: String,
    enum: ['vendor', 'organizer', null],
    default: null
  },
  redeemedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('Voucher', voucherSchema);
