import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import Event from '../models/Event.js';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper: stream a buffer to Cloudinary
const streamUpload = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
};

// POST /api/events
export const createEvent = async (req, res) => {
  try {
    const { name, description, date } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Event name is required.' });
    }

    const bannerFile = req.files?.banner?.[0];
    const floorMapFile = req.files?.floorMap?.[0];

    if (!bannerFile) {
      return res.status(400).json({ success: false, message: 'Banner image is required.' });
    }
    if (!floorMapFile) {
      return res.status(400).json({ success: false, message: 'Floor map image is required.' });
    }

    // Upload both images in parallel
    const [bannerResult, floorMapResult] = await Promise.all([
      streamUpload(bannerFile.buffer, 'eventpulse/banners'),
      streamUpload(floorMapFile.buffer, 'eventpulse/floormaps'),
    ]);

    const event = await Event.create({
      name,
      description: description || '',
      date: date ? new Date(date) : null,
      bannerImageUrl: bannerResult.secure_url,
      bannerPublicId: bannerResult.public_id,
      floorMapUrl: floorMapResult.secure_url,
      floorMapPublicId: floorMapResult.public_id,
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/events
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: events.length, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/events/:id
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
