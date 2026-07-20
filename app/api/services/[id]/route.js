import { NextResponse } from 'next/server';
import { connectDB, Target, Log } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';

function formatTarget(t) {
  const obj = t.toObject ? t.toObject() : t;
  return { ...obj, id: obj._id };
}

export async function PUT(req, { params }) {
  try {
    const auth = verifyJwtToken(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await connectDB();
    const body = await req.json();
    const { name, type, url, apiKey, intervalMinutes, isActive } = body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (url !== undefined) updates.url = url;
    if (apiKey !== undefined) updates.apiKey = apiKey;
    if (intervalMinutes !== undefined) updates.intervalMinutes = parseInt(intervalMinutes, 10) || 60;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const updatedTarget = await Target.findOneAndUpdate(
      { _id: params.id, userId: auth.userId },
      updates,
      { new: true }
    );

    if (!updatedTarget) {
      return NextResponse.json({ error: 'Target service not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Target service updated', target: formatTarget(updatedTarget) });
  } catch (err) {
    console.error('Update target error:', err);
    return NextResponse.json({ error: 'Failed to update target service' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = verifyJwtToken(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await connectDB();
    const deleted = await Target.findOneAndDelete({ _id: params.id, userId: auth.userId });
    if (!deleted) {
      return NextResponse.json({ error: 'Target service not found' }, { status: 404 });
    }

    await Log.deleteMany({ targetId: params.id });
    return NextResponse.json({ message: 'Target service deleted successfully' });
  } catch (err) {
    console.error('Delete target error:', err);
    return NextResponse.json({ error: 'Failed to delete target service' }, { status: 500 });
  }
}
