import { NextResponse } from 'next/server';
import { connectDB, Log } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';

function formatLog(l) {
  const obj = l.toObject ? l.toObject() : l;
  return { ...obj, id: obj._id };
}

export async function GET(req) {
  try {
    const auth = verifyJwtToken(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const targetIdFilter = searchParams.get('targetId');

    const filter = { userId: auth.userId };
    if (targetIdFilter) {
      filter.targetId = targetIdFilter;
    }

    const logs = await Log.find(filter).sort({ timestamp: -1 }).limit(limit);
    return NextResponse.json({ logs: logs.map(formatLog) });
  } catch (err) {
    console.error('Fetch logs error:', err);
    return NextResponse.json({ error: 'Failed to retrieve logs' }, { status: 500 });
  }
}
