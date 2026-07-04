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
const streamUpload = (buffer, folder, isSvg) => {
  return new Promise((resolve, reject) => {
    const options = { folder, resource_type: 'auto' };
    if (isSvg) {
      options.format = 'svg';
    }
    const stream = cloudinary.uploader.upload_stream(
      options,
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

/**
 * Inject stable `id="vector-shape-N"` attributes on SVG shape elements that
 * have no id, so the MapViewer can reliably reference them by id.
 * Uses pure regex — no DOM parser needed on the server.
 */
const assignMissingShapeIds = (svgStr) => {
  const shapeTagRe = /<(path|rect|polygon|circle|ellipse)(\s[^>]*)?>/gi;
  let counter = 0;
  return svgStr.replace(shapeTagRe, (match, tag, attrs) => {
    attrs = attrs || '';
    // Already has an id attribute — leave it alone
    if (/\bid\s*=/i.test(attrs)) return match;
    const newId = `vector-shape-${counter++}`;
    return `<${tag} id="${newId}"${attrs}>`;
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

    const isSvg = floorMapFile.mimetype === 'image/svg+xml' || floorMapFile.originalname.endsWith('.svg');
    const floorMapFileType = isSvg ? 'svg' : 'raster';
    
    let rawSvgContent = null;
    if (isSvg) {
      rawSvgContent = floorMapFile.buffer.toString('utf8');
      rawSvgContent = rawSvgContent.replace(/<\?xml.*\?>/gi, '').trim();
      // Assign stable IDs to any shapes that lack them so the viewer can
      // reference them by id from the very first load.
      rawSvgContent = assignMissingShapeIds(rawSvgContent);
    }

    // Upload both images in parallel
    const [bannerResult, floorMapResult] = await Promise.all([
      streamUpload(bannerFile.buffer, 'eventpulse/banners', false),
      streamUpload(floorMapFile.buffer, 'eventpulse/floormaps', isSvg),
    ]);

    const event = await Event.create({
      name,
      description: description || '',
      date: date ? new Date(date) : null,
      bannerImageUrl: bannerResult.secure_url,
      bannerPublicId: bannerResult.public_id,
      floorMapUrl: floorMapResult.secure_url,
      floorMapPublicId: floorMapResult.public_id,
      floorMapFileType,
      rawSvgContent,
      zones: []
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

// PUT /api/events/:id
export const updateEvent = async (req, res) => {
  try {
    const { name, description, date } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (name) event.name = name;
    if (description !== undefined) event.description = description;
    if (date !== undefined) event.date = date ? new Date(date) : null;

    const bannerFile = req.files?.banner?.[0];
    const floorMapFile = req.files?.floorMap?.[0];

    const uploads = [];
    if (bannerFile) {
      uploads.push(streamUpload(bannerFile.buffer, 'eventpulse/banners', false).then(res => {
        event.bannerImageUrl = res.secure_url;
        event.bannerPublicId = res.public_id;
      }));
    }
    if (floorMapFile) {
      const isSvg = floorMapFile.mimetype === 'image/svg+xml' || floorMapFile.originalname.endsWith('.svg');
      event.floorMapFileType = isSvg ? 'svg' : 'raster';
      if (isSvg) {
        let raw = floorMapFile.buffer.toString('utf8');
        raw = raw.replace(/<\?xml.*\?>/gi, '').trim();
        // Same ID assignment as in createEvent
        event.rawSvgContent = assignMissingShapeIds(raw);
      } else {
        event.rawSvgContent = null;
      }
      uploads.push(streamUpload(floorMapFile.buffer, 'eventpulse/floormaps', isSvg).then(res => {
        event.floorMapUrl = res.secure_url;
        event.floorMapPublicId = res.public_id;
      }));
    }

    if (uploads.length > 0) {
      await Promise.all(uploads);
    }

    await event.save();
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/events/:id/zones
export const updateEventZones = async (req, res) => {
  try {
    const { zones, rawSvgContent } = req.body;
    if (!Array.isArray(zones)) {
      return res.status(400).json({ success: false, message: 'Zones must be an array.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    event.zones = zones;
    if (rawSvgContent !== undefined) {
      event.rawSvgContent = rawSvgContent;
    }
    await event.save();
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

import Ticket from '../models/Ticket.js';
import User from '../models/User.js';

// POST /api/events/:id/purchase
export const purchaseTicket = async (req, res) => {
  try {
    const { userId, tier, seat, price } = req.body;
    const eventId = req.params.id;

    if (!userId || !tier || !seat || !price) {
      return res.status(400).json({ success: false, message: 'All purchase fields are required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.walletBalance < price) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
    }

    // Deduct balance
    user.walletBalance -= price;
    await user.save();

    // Create ticket
    const qrPayload = JSON.stringify({ userId, eventId, tier, seat, timestamp: Date.now() });
    const ticket = await Ticket.create({
      user: userId,
      event: eventId,
      tier,
      seat,
      price,
      qrCodeData: qrPayload,
      status: 'Active'
    });

    res.status(201).json({ success: true, ticket, walletBalance: user.walletBalance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/events/user/:userId/tickets
export const getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.params.userId }).populate('event').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

