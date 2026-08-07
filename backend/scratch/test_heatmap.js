import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from '../models/Event.js';
import LocationPing from '../models/LocationPing.js';
import connectDB from '../config/db.js';
import { getHistoricalHeatmap } from '../controllers/heatmapController.js';

dotenv.config();

async function test() {
  try {
    await connectDB();
    console.log('Connected to Database.');

    // Fetch an event
    const event = await Event.findOne();
    if (!event) {
      console.error('No events found. Please run seedLocationPings.js first.');
      process.exit(1);
    }
    console.log(`Testing with Event: ${event.name} (${event._id})`);

    // Let's seed some location pings if empty
    const pingCount = await LocationPing.countDocuments({ eventId: event._id });
    console.log(`Current location pings in DB for this event: ${pingCount}`);

    // Call heatmap calculation directly for a timestamp (e.g. 10:00 AM today)
    const baseDate = new Date();
    baseDate.setHours(10);
    baseDate.setMinutes(0);
    baseDate.setSeconds(0);
    baseDate.setMilliseconds(0);

    // Let's simulate a request/response object
    const req = {
      query: {
        eventId: event._id.toString(),
        timestamp: baseDate.toISOString()
      }
    };

    let responseData = null;
    const res = {
      status: function(code) {
        console.log(`Response status code: ${code}`);
        return this;
      },
      json: function(data) {
        responseData = data;
        return this;
      }
    };

    await getHistoricalHeatmap(req, res);

    console.log('Controller Response:');
    console.log(JSON.stringify(responseData, null, 2));

    if (responseData && responseData.success) {
      console.log('Test PASSED successfully.');
    } else {
      console.error('Test FAILED.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error running heatmap test:', error);
    process.exit(1);
  }
}

test();
