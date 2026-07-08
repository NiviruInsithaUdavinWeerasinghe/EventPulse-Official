import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

const allowedAudiences = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.VITE_GOOGLE_CLIENT_ID,
  '254311975723-hjmj6l4jdn02ouh80k206atn4pt2uual.apps.googleusercontent.com',
].filter(Boolean);

const client = new OAuth2Client(allowedAudiences[0]);
const router = express.Router();

const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET || 'eventpulse_secret', { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, role } = req.body;

    if (!fullName || !email || !phone || !password)
      return res.status(400).json({ message: 'All fields are required.' });

    if (await User.findOne({ email }))
      return res.status(409).json({ message: 'Email already in use.' });

    const user = await User.create({ fullName, email, phone, password, role: role || 'customer' });
    res.status(201).json({ token: signToken(user._id, user.role), user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password.' });

    res.json({ token: signToken(user._id, user.role), user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/google  (access_token flow — used by frontend)
router.post('/google', async (req, res) => {
  try {
    const { userInfo } = req.body;
    if (!userInfo?.email) return res.status(400).json({ message: 'Google user info is required.' });

    const { sub: googleId, email, name, picture } = userInfo;
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        fullName: name,
        email,
        phone: 'N/A',
        password: googleId + (process.env.JWT_SECRET || 'eventpulse_secret'),
        googleId,
        avatar: picture,
        role: 'customer',
      });
    }

    res.json({
      token: signToken(user._id, user.role),
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, avatar: picture },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/google-login  (ID token flow)
router.post('/google-login', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Credential token is required.' });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: allowedAudiences,
    });

    const { email, name } = ticket.getPayload();
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        fullName: name,
        email,
        phone: 'N/A',
        password: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        role: 'customer',
      });
    }

    res.json({
      isNewUser,
      token: signToken(user._id, user.role),
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/google-set-role
router.post('/google-set-role', async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) return res.status(400).json({ message: 'UserId and role are required.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.role = role;
    await user.save();

    res.json({
      token: signToken(user._id, user.role),
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
