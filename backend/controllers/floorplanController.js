import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import Floorplan from '../models/Floorplan.js';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper: Upload buffer to Cloudinary via stream
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// POST /api/floorplans/upload
export const uploadFloorplan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    const { eventName, floorLabel } = req.body;
    if (!eventName || !floorLabel) {
      return res.status(400).json({ success: false, message: 'Event name and floor label are required.' });
    }

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'eventpulse/floorplans');

    const floorplan = await Floorplan.create({
      eventName,
      floorLabel,
      imageUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
    });

    res.status(201).json({ success: true, data: floorplan });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/floorplans
export const getAllFloorplans = async (req, res) => {
  try {
    const floorplans = await Floorplan.find().sort({ uploadedAt: -1 });
    res.status(200).json({ success: true, count: floorplans.length, data: floorplans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/floorplans/:id
export const getFloorplanById = async (req, res) => {
  try {
    const floorplan = await Floorplan.findById(req.params.id);
    if (!floorplan) {
      return res.status(404).json({ success: false, message: 'Floorplan not found.' });
    }
    res.status(200).json({ success: true, data: floorplan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
