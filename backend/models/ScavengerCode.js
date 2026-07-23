import mongoose from 'mongoose';

const scavengerCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  locationHint: { type: String, trim: true },
  points: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('ScavengerCode', scavengerCodeSchema);
