const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Windows / local ISP DNS blocking MongoDB Atlas SRV record lookups
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (err) {
  // Fallback if environment restricts custom DNS
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/keeppulse';

async function connectDB() {
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`[DATABASE] MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`[DATABASE] MongoDB Connection Error: ${err.message}`);
    console.warn(`[DATABASE] Make sure MONGODB_URI is set in your .env file or local MongoDB is running.`);
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Target Service Schema
const targetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['render', 'supabase', 'custom'], default: 'render' },
  url: { type: String, required: true, trim: true },
  apiKey: { type: String, default: '' },
  intervalMinutes: { type: Number, default: 60 },
  isActive: { type: Boolean, default: true },
  lastPingAt: { type: Date, default: null },
  lastStatus: { type: String, default: 'pending' },
  lastStatusCode: { type: Number, default: null },
  lastResponseTimeMs: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Telemetry Log Schema
const logSchema = new mongoose.Schema({
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Target', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetName: { type: String, required: true },
  type: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  statusCode: { type: Number, default: 0 },
  status: { type: String, enum: ['success', 'error'], required: true },
  responseTimeMs: { type: Number, default: 0 },
  message: { type: String, default: '' }
});

const User = mongoose.model('User', userSchema);
const Target = mongoose.model('Target', targetSchema);
const Log = mongoose.model('Log', logSchema);

module.exports = {
  connectDB,
  User,
  Target,
  Log
};
