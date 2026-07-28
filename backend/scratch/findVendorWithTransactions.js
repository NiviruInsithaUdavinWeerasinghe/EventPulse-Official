import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import WalletLedger from '../models/WalletLedger.js';

const checkVendors = async () => {
  try {
    await connectDB();
    console.log('MongoDB Connected.');

    const vendors = await User.find({ role: 'vendor' });
    console.log(`Found ${vendors.length} vendors in database.`);

    for (const vendor of vendors) {
      console.log(`\nVendor: ${vendor.fullName} | Email: ${vendor.email} | ID: ${vendor._id}`);
      const wallet = await Wallet.findOne({ user: vendor._id });
      if (wallet) {
        console.log(`  Wallet Balance: ${wallet.balance}`);
        const ledgers = await WalletLedger.find({ wallet: wallet._id });
        console.log(`  Ledger Transactions Count: ${ledgers.length}`);
        if (ledgers.length > 0) {
          console.log('  Recent transaction sample:', ledgers[0]);
        }
      } else {
        console.log('  No wallet found for this vendor.');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error finding vendors:', err);
    process.exit(1);
  }
};

checkVendors();
