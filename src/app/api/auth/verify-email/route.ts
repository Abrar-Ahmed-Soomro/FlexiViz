import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import { z } from 'zod';
import { ZodError } from 'zod';
import crypto from 'crypto';

const verifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = verifySchema.parse(body);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date();

    await connectToDatabase();

    const user = await User.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpiry: { $gt: now },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 },
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email already verified. Please log in.' },
      );
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    await user.save();

    return NextResponse.json({
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
