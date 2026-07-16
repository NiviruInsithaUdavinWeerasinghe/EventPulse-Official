import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import User from '../models/User.js';
import Event from '../models/Event.js';
import UserBookmark from '../models/UserBookmark.js';

const runTest = async () => {
  try {
    await connectDB();
    console.log('MongoDB Connected.');

    // 1. Find a customer user and an event
    let user = await User.findOne({ role: 'customer' });
    if (!user) {
      // Create a temporary customer
      user = await User.create({
        fullName: 'Test Customer',
        email: `test_customer_${Date.now()}@example.com`,
        phone: '1234567890',
        password: 'password123',
        role: 'customer'
      });
      console.log(`Created temporary test customer: ${user._id}`);
    }

    let event = await Event.findOne();
    if (!event) {
      // Create a temporary event
      event = await Event.create({
        name: 'Test Event',
        bannerImageUrl: 'http://example.com/banner.png',
        bannerPublicId: 'banner_1',
        floorMapUrl: 'http://example.com/map.png',
        floorMapPublicId: 'map_1',
      });
      console.log(`Created temporary test event: ${event._id}`);
    }

    console.log(`Testing with User ID: ${user._id}, Event ID: ${event._id}`);

    // Clean up any existing bookmark
    await UserBookmark.deleteMany({ user_id: user._id, event_id: event._id });

    // 2. Insert bookmark
    const bookmark = await UserBookmark.create({
      user_id: user._id,
      event_id: event._id
    });
    console.log('Successfully inserted bookmark:', bookmark._id);

    // 3. Test uniqueness constraint (should fail)
    try {
      await UserBookmark.create({
        user_id: user._id,
        event_id: event._id
      });
      console.error('ERROR: Uniqueness constraint failed! Duplicate bookmark was created.');
    } catch (err) {
      console.log('SUCCESS: Duplicate bookmark prevented by unique index constraint as expected.', err.message);
    }

    // Clean up
    await UserBookmark.deleteOne({ _id: bookmark._id });
    console.log('Cleaned up test bookmark.');
    
    process.exit(0);
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  }
};

runTest();
