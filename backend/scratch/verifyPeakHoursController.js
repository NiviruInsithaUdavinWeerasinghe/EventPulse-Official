import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import { getPeakHours } from '../controllers/eventController.js';
import Event from '../models/Event.js';

dotenv.config();

async function verify() {
  try {
    await connectDB();
    const event = await Event.findOne();
    if (!event) {
      console.error("No event found.");
      process.exit(1);
    }

    const req = {
      params: { id: event._id.toString() }
    };

    const res = {
      statusCode: 200,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log('Response Status:', this.statusCode);
        console.log('Response Success:', data.success);
        console.log('Response Data length:', data.data ? data.data.length : 0);
        console.log('Sample Data Point (Hour 8):', data.data.find(d => d.hour === 8));
        console.log('Sample Data Point (Hour 14):', data.data.find(d => d.hour === 14));
        console.log('Sample Data Point (Hour 18):', data.data.find(d => d.hour === 18));
        process.exit(0);
      }
    };

    await getPeakHours(req, res);
  } catch (err) {
    console.error('Error during verification:', err);
    process.exit(1);
  }
}

verify();
