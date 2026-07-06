import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:    { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['organizer', 'vendor', 'customer'], default: 'customer' },
<<<<<<< HEAD
  googleId: { type: String },
  avatar:   { type: String },
=======
  walletBalance: { type: Number, default: 24750 } // Defaults to original mockup balance
>>>>>>> 39e6a260d2af63b8793e7ee75a87215c390f4425
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model('User', userSchema);