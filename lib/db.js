import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Windows / local ISP DNS blocking MongoDB Atlas SRV record lookups in Next.js
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  if (dns.promises && dns.promises.setServers) {
    dns.promises.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  }
} catch (err) {
  // Fallback if custom DNS restricted
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/keeppulse';

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', false);
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then((m) => {
      console.log(`[DATABASE] MongoDB Connected Successfully: ${m.connection.host}/${m.connection.name}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
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

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Target = mongoose.models.Target || mongoose.model('Target', targetSchema);
export const Log = mongoose.models.Log || mongoose.model('Log', logSchema);
