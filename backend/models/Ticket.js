import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  tier: {
    type: String,
    required: true,
    enum: ['VIP', 'Standard', 'General']
  },
  seat: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  qrCodeData: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Used', 'Cancelled'],
    default: 'Active'
  }
}, { timestamps: true });

export default mongoose.model('Ticket', ticketSchema);
