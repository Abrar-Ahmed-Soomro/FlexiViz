import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { env } from '@/lib/env';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; email?: string };
    
    return NextResponse.json({ user: { _id: decoded.userId, email: decoded.email } });
  } catch {
    return NextResponse.json({ user: null });
  }
}
