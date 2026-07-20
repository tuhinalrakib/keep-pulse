import { NextResponse } from 'next/server';
import { connectDB, Target } from '@/lib/db';
import { startScheduler } from '@/lib/scheduler';

// Ensure scheduler starts on health check or server activity
startScheduler();

export async function GET() {
  try {
    await connectDB();
    const activeTargetsCount = await Target.countDocuments({ isActive: true });
    return NextResponse.json({
      status: 'ok',
      service: 'Render & Supabase Keep-Alive Bot PRO (Next.js Edition)',
      timestamp: new Date().toISOString(),
      activeTargets: activeTargetsCount
    });
  } catch (err) {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
}
