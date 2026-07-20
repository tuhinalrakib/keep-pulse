import { NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';

export async function GET(req) {
  try {
    const authResult = verifyJwtToken(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    await connectDB();
    const user = await User.findById(authResult.userId).select('-passwordHash');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Me API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
