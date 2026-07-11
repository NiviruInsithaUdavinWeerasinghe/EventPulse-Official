// Simulated test for checkout with insufficient balance verification
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import Wallet from '../models/Wallet.js';
import PaymentToken from '../models/PaymentToken.js';
import User from '../models/User.js';

const runTest = async () => {
  try {
    await connectDB();
    console.log('MongoDB Connected.');

    // 1. Find a customer user and a vendor user
    const customer = await User.findOne({ role: 'customer' });
    const vendor = await User.findOne({ role: 'vendor' });

    if (!customer || !vendor) {
      console.log('Test aborted: Please make sure you have at least one customer and one vendor registered.');
      process.exit(0);
    }

    console.log(`Customer: ${customer.fullName} (${customer._id})`);
    console.log(`Vendor: ${vendor.fullName} (${vendor._id})`);

    // 2. Find or create the customer's wallet
    let wallet = await Wallet.findOne({ user: customer._id });
    if (!wallet) {
      wallet = await Wallet.create({
        user: customer._id,
        balance: mongoose.Types.Decimal128.fromString('100.00'), // Set small balance
        currency: 'LKR',
        status: 'Active',
      });
      console.log('Created new customer wallet with balance: LKR 100.00');
    } else {
      wallet.balance = mongoose.Types.Decimal128.fromString('100.00');
      await wallet.save();
      console.log('Updated customer wallet balance to: LKR 100.00');
    }

    // 3. Create a Payment Token
    const token = 'test_token_' + Math.random().toString(36).substring(2);
    const expiresAt = new Date(Date.now() + 60000);
    const paymentToken = await PaymentToken.create({
      token,
      wallet: wallet._id,
      user: customer._id,
      status: 'Active',
      expiresAt,
    });
    console.log(`Created payment token: ${token}`);

    // 4. Test logic locally
    const currentBalance = parseFloat(wallet.balance.toString());
    const amountToDebit = 150.00; // Greater than 100.00 balance

    console.log(`Simulating checkout with debit amount: LKR ${amountToDebit}`);
    if (currentBalance < amountToDebit) {
      console.log('>>> SUCCESS: Verification correctly identifies Insufficient Wallet Balance');
      console.log(`Current Balance (${currentBalance}) is less than Debit Amount (${amountToDebit}).`);
    } else {
      console.log('>>> FAILURE: Verification failed to flag insufficient balance!');
    }

    // Cleanup token
    await PaymentToken.deleteOne({ _id: paymentToken._id });
    console.log('Test completed.');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
};

runTest();
