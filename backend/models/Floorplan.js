import mongoose from 'mongoose';

const floorplanSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    floorLabel: {
      type: String,
      required: [true, 'Floor label is required'],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Floorplan = mongoose.model('Floorplan', floorplanSchema);

export default Floorplan;
