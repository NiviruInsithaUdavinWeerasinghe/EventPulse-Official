import mongoose from 'mongoose';

// A vendor-purchased 15-minute promotional banner broadcast to every
// attendee at the event. Stored in 'active_flash_sales' regardless of
// whether it has since expired — `isActive` + `endTime` distinguish current
// broadcasts from historical ones so the ledger stays a permanent record.
const flashSaleSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    stallId: {
      type: String,
      required: [true, 'stallId is required — the flash sale is anchored to your approved stall.'],
      trim: true,
    },
    promoText: {
      type: String,
      required: [true, 'Promotional text is required'],
      trim: true,
      maxlength: 140,
    },
    feeCharged: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      get: (v) => (v != null ? v.toString() : '0.00'),
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'active_flash_sales',
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

flashSaleSchema.index({ event: 1, isActive: 1, endTime: 1 });
flashSaleSchema.index({ vendor: 1, isActive: 1 });

const FlashSale = mongoose.model('FlashSale', flashSaleSchema);

export default FlashSale;
