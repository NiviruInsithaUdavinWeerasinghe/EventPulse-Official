import mongoose from 'mongoose';

const scannedCodeSchema = new mongoose.Schema({
  qr_string: { type: String, required: true, trim: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scannedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Compound unique index to guarantee duplicate scan prevention per user & QR string
scannedCodeSchema.index({ qr_string: 1, user_id: 1 }, { unique: true });

export default mongoose.model('ScannedCode', scannedCodeSchema);
