import { NextResponse } from 'next/server';
import { connectDB, Target } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';
import { pingTarget } from '@/lib/pinger';

function formatTarget(t) {
  const obj = t.toObject ? t.toObject() : t;
  return { ...obj, id: obj._id };
}

export async function GET(req) {
  try {
    const auth = verifyJwtToken(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await connectDB();
    const targets = await Target.find({ userId: auth.userId }).sort({ createdAt: -1 });
    return NextResponse.json({ targets: targets.map(formatTarget) });
  } catch (err) {
    console.error('Fetch services error:', err);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = verifyJwtToken(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await connectDB();
    const { name, type, url, apiKey, intervalMinutes } = await req.json();

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    const validTypes = ['render', 'supabase', 'custom'];
    const targetType = validTypes.includes(type) ? type : 'render';

    const newTarget = await Target.create({
      userId: auth.userId,
      name,
      type: targetType,
      url,
      apiKey: apiKey || '',
      intervalMinutes: parseInt(intervalMinutes, 10) || 60,
      isActive: true
    });

    try {
      await pingTarget(newTarget);
    } catch (pingErr) {
      console.error('Initial ping error:', pingErr);
    }

    const updatedTarget = await Target.findById(newTarget._id);
    return NextResponse.json({
      message: 'Target service added successfully',
      target: formatTarget(updatedTarget || newTarget)
    }, { status: 201 });
  } catch (err) {
    console.error('Create service error:', err);
    return NextResponse.json({ error: 'Failed to create target service' }, { status: 500 });
  }
}
