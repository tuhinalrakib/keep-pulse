import { NextResponse } from 'next/server';
import { connectDB, Target } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';
import { pingTarget } from '@/lib/pinger';

function formatTarget(t) {
  const obj = t.toObject ? t.toObject() : t;
  return { ...obj, id: obj._id };
}

export async function POST(req, { params }) {
  try {
    const auth = verifyJwtToken(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await connectDB();
    const target = await Target.findOne({ _id: params.id, userId: auth.userId });
    if (!target) {
      return NextResponse.json({ error: 'Target service not found' }, { status: 404 });
    }

    const pingResult = await pingTarget(target);
    const updatedTarget = await Target.findById(target._id);

    return NextResponse.json({
      message: 'Ping executed successfully',
      result: pingResult,
      target: formatTarget(updatedTarget)
    });
  } catch (err) {
    return NextResponse.json({ error: 'Ping execution failed: ' + err.message }, { status: 500 });
  }
}
