import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import Event from '../models/Event.js';
import VendorApplication from '../models/VendorApplication.js';
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
      uploads.push(streamUpload(bannerFile.buffer, 'eventpulse/banners').then(res => {
        event.bannerImageUrl = res.secure_url;
        event.bannerPublicId = res.public_id;
      }));
    }
    if (floorMapFile) {
      uploads.push(streamUpload(floorMapFile.buffer, 'eventpulse/floormaps').then(res => {
        event.floorMapImageUrl = res.secure_url;
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

// PUT /api/events/:id/zones
export const updateEventZones = async (req, res) => {
  try {
    const { id } = req.params;
    const { zones, rawSvgContent } = req.body;
    
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    
    if (zones !== undefined) event.zones = zones;
    if (rawSvgContent !== undefined) event.rawSvgContent = rawSvgContent;
    
    await event.save();
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/vendor-applications
export const submitVendorApplication = async (req, res) => {
  try {
    const { eventId, vendorId, businessName, businessType, email, phone, description, requestedStall } = req.body;
    
    if (!eventId || !vendorId || !businessName || !businessType || !email || !phone || !description || !requestedStall) {
      return res.status(400).json({ success: false, message: 'All application fields are required.' });
    }
    
    const existingApproved = await VendorApplication.findOne({
      eventId,
      requestedStall,
      status: 'Approved'
    });
    if (existingApproved) {
      return res.status(400).json({ success: false, message: 'This stall has already been reserved and approved for another vendor.' });
    }
    
    const application = await VendorApplication.create({
      eventId,
      vendorId,
      businessName,
      businessType,
      email,
      phone,
      description,
      requestedStall,
      status: 'Pending'
    });
    
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/vendor-applications/event/:eventId
export const getEventApplications = async (req, res) => {
  try {
    const { eventId } = req.params;
    const applications = await VendorApplication.find({ eventId })
      .populate('vendorId', 'fullName email phone')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: applications.length, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/vendor-applications/:id/status
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status is required.' });
    }
    
    const application = await VendorApplication.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    
    if (status === 'Approved') {
      const existingApproved = await VendorApplication.findOne({
        eventId: application.eventId,
        requestedStall: application.requestedStall,
        status: 'Approved',
        _id: { $ne: id }
      });
      if (existingApproved) {
        return res.status(400).json({ success: false, message: 'Another application for this stall is already approved.' });
      }
      
      await VendorApplication.updateMany(
        {
          eventId: application.eventId,
          requestedStall: application.requestedStall,
          status: 'Pending',
          _id: { $ne: id }
        },
        { status: 'Rejected' }
      );
    }
    
    application.status = status;
    await application.save();
    
    res.status(200).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

