import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import { z } from 'zod';
import { ZodError } from 'zod';
import { env } from '@/lib/env';
import crypto from 'crypto';

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = resendSchema.parse(body);

    await connectToDatabase();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({
        message: 'If an account with that email exists, a verification link has been sent.',
      });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified. Please log in.' },
        { status: 400 },
      );
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = tokenHash;
    user.emailVerificationTokenExpiry = tokenExpiry;
    await user.save();

    const verificationLink = `${env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`;

    console.log(`[Email Verification] Verification link for ${email}: ${verificationLink}`);

    return NextResponse.json({
      message: 'Verification link sent. Please check your email.',
      verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
