import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import WalletLedger from '../models/WalletLedger.js';

dotenv.config({ path: './backend/.env' });

async function runVerification() {
  console.log("=== Digital Wallet Schema Verification ===");
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB database.");

    // Clean up past test data to ensure reproducibility
    const testEmail = "attendee.test@eventpulse.com";
    await User.deleteMany({ email: testEmail });
    
    // 1. Create a test User (Event Attendee)
    const testAttendee = await User.create({
      fullName: "Test Event Attendee",
      email: testEmail,
      phone: "+94771234567",
      password: "securepassword123",
      role: "customer"
    });
    console.log(`Created test Event Attendee: ID = ${testAttendee._id}`);

    // Clean up any wallet associated with this attendee (in case index didn't clean up)
    await Wallet.deleteMany({ user: testAttendee._id });

    // 2. Wallet Initialization - Verify LKR 0.00 default balance and active status
    const attendeeWallet = await Wallet.create({
      user: testAttendee._id
    });
    
    console.log("\n--- Wallet Initialization Verification ---");
    console.log(`Wallet ID: ${attendeeWallet._id}`);
    console.log(`User ID (Event Attendee): ${attendeeWallet.user}`);
    console.log(`Initial Balance: LKR ${attendeeWallet.balance} (Type: ${attendeeWallet.balance.constructor.name})`);
    console.log(`Currency: ${attendeeWallet.currency}`);
    console.log(`Status: ${attendeeWallet.status}`);

    if (attendeeWallet.balance.toString() === '0.00' && attendeeWallet.currency === 'LKR') {
      console.log("✅ SUCCESS: Initialized with exactly LKR 0.00 default balance.");
    } else {
      console.error("❌ FAILURE: Wallet did not initialize with LKR 0.00.");
    }

    // 3. Wallet ID vs User ID Separation Verification
    console.log("\n--- Wallet ID vs User ID Separation ---");
    console.log(`Wallet ID: ${attendeeWallet._id}`);
    console.log(`User ID:   ${testAttendee._id}`);
    if (attendeeWallet._id.toString() !== testAttendee._id.toString()) {
      console.log("✅ SUCCESS: Wallet ID is distinct from User ID.");
    } else {
      console.error("❌ FAILURE: Wallet ID matches User ID.");
    }

    // 4. Uniqueness Constraint Verification - Try to create second wallet for same user
    console.log("\n--- Unique Wallet Profile Constraint Verification ---");
    try {
      // Need to build index explicitly if running in memory or in direct script connection
      await Wallet.syncIndexes();
      await Wallet.create({ user: testAttendee._id });
      console.error("❌ FAILURE: Created a duplicate wallet for the same user without throwing error.");
    } catch (err) {
      if (err.code === 11000 || err.message.includes('E11000') || err.message.includes('duplicate') || err.message.includes('unique')) {
        console.log("✅ SUCCESS: Correctly prevented duplicate wallet creation for the same user.");
      } else {
        console.error("❌ FAILURE: Expected duplicate key error, got:", err.message);
      }
    }

    // 5. Negative Balance Constraint Verification - Try to save negative balance
    console.log("\n--- Negative Balance Constraint Verification ---");
    try {
      await Wallet.create({
        user: new mongoose.Types.ObjectId(),
        balance: mongoose.Types.Decimal128.fromString("-100.00")
      });
      console.error("❌ FAILURE: Saved a negative balance without error.");
    } catch (err) {
      if (err.message.includes('Wallet balance cannot be negative')) {
        console.log("✅ SUCCESS: Correctly prevented negative wallet balance.");
      } else {
        console.error("❌ FAILURE: Expected negative balance validator error, got:", err.message);
      }
    }

    // 6. Ledger Constraint Verification - Try to save negative transaction amount
    console.log("\n--- Ledger Amount Constraint Verification ---");
    try {
      await WalletLedger.create({
        wallet: attendeeWallet._id,
        transactionType: 'Credit',
        amount: mongoose.Types.Decimal128.fromString("-50.00"),
        balanceBefore: mongoose.Types.Decimal128.fromString("0.00"),
        balanceAfter: mongoose.Types.Decimal128.fromString("0.00"),
        referenceType: 'TopUp',
        referenceId: 'REF-ERR'
      });
      console.error("❌ FAILURE: Logged ledger entry with negative amount.");
    } catch (err) {
      if (err.message.includes('Transaction amount must be strictly greater than 0.00')) {
        console.log("✅ SUCCESS: Correctly prevented negative ledger transaction amount.");
      } else {
        console.error("❌ FAILURE: Expected amount validator error, got:", err.message);
      }
    }

    // 7. Successful Balance Operations & Ledger Log Verification (Credit & Debit)
    console.log("\n--- Credit Transaction (TopUp LKR 1500.00) ---");
    const balanceBeforeCredit = attendeeWallet.balance;
    const creditAmount = mongoose.Types.Decimal128.fromString("1500.00");
    const balanceAfterCredit = mongoose.Types.Decimal128.fromString(
      (parseFloat(balanceBeforeCredit.toString()) + parseFloat(creditAmount.toString())).toFixed(2)
    );

    // Save Ledger log referencing Wallet ID
    const creditLedger = await WalletLedger.create({
      wallet: attendeeWallet._id,
      transactionType: 'Credit',
      amount: creditAmount,
      balanceBefore: balanceBeforeCredit,
      balanceAfter: balanceAfterCredit,
      description: 'Test wallet top-up',
      referenceType: 'TopUp',
      referenceId: 'TOPUP-TEST-123'
    });

    // Update wallet balance
    attendeeWallet.balance = balanceAfterCredit;
    await attendeeWallet.save();

    console.log(`Ledger Created: ID = ${creditLedger._id}`);
    console.log(`Ledger Wallet ID Reference: ${creditLedger.wallet}`);
    console.log(`Wallet Balance After Credit: LKR ${attendeeWallet.balance}`);

    console.log("\n--- Debit Transaction (TicketPurchase LKR 750.50) ---");
    const balanceBeforeDebit = attendeeWallet.balance;
    const debitAmount = mongoose.Types.Decimal128.fromString("750.50");
    const balanceAfterDebit = mongoose.Types.Decimal128.fromString(
      (parseFloat(balanceBeforeDebit.toString()) - parseFloat(debitAmount.toString())).toFixed(2)
    );

    const debitLedger = await WalletLedger.create({
      wallet: attendeeWallet._id,
      transactionType: 'Debit',
      amount: debitAmount,
      balanceBefore: balanceBeforeDebit,
      balanceAfter: balanceAfterDebit,
      description: 'General admission ticket purchase',
      referenceType: 'TicketPurchase',
      referenceId: 'TKT-TEST-999'
    });

    attendeeWallet.balance = balanceAfterDebit;
    await attendeeWallet.save();

    console.log(`Ledger Created: ID = ${debitLedger._id}`);
    console.log(`Ledger Wallet ID Reference: ${debitLedger.wallet}`);
    console.log(`Wallet Balance After Debit: LKR ${attendeeWallet.balance}`);

    // Verify correct end balance
    if (attendeeWallet.balance.toString() === '749.50') {
      console.log("✅ SUCCESS: Ending balance calculated and stored precisely as LKR 749.50.");
    } else {
      console.error(`❌ FAILURE: Expected ending balance LKR 749.50, got LKR ${attendeeWallet.balance}`);
    }

    // 8. Verify chronological log query
    console.log("\n--- Chronological Ledger Query Verification ---");
    const logs = await WalletLedger.find({ wallet: attendeeWallet._id }).sort({ createdAt: -1 });
    console.log(`Found ${logs.length} ledger entries.`);
    logs.forEach((log, index) => {
      console.log(`[Entry ${index + 1}] Date: ${log.createdAt.toISOString()} | Type: ${log.transactionType} | Amount: LKR ${log.amount} | Balance: LKR ${log.balanceBefore} -> LKR ${log.balanceAfter} | Ref: ${log.referenceType}`);
    });

    if (logs[0].transactionType === 'Debit' && logs[1].transactionType === 'Credit') {
      console.log("✅ SUCCESS: Chronological order (descending) is correct.");
    } else {
      console.error("❌ FAILURE: Chronological sort failed.");
    }

    // Clean up created entities
    await WalletLedger.deleteMany({ wallet: attendeeWallet._id });
    await Wallet.deleteOne({ _id: attendeeWallet._id });
    await User.deleteOne({ _id: testAttendee._id });
    console.log("\nCleaned up database test records successfully.");

  } catch (error) {
    console.error("❌ Test verification failed with error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

runVerification();
