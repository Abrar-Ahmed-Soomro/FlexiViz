import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import { registerSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { env } from '@/lib/env';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = registerSchema.parse(body);

    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = new User({
      email,
      passwordHash: password,
      emailVerified: false,
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpiry: tokenExpiry,
    });
    await user.save();

    const verificationLink = `${env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`;

    console.log(`[Email Verification] Verification link for ${email}: ${verificationLink}`);

    return NextResponse.json({
      message: 'Account created. Please verify your email to continue.',
      verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const { fieldErrors } = error.flatten();
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors },
        { status: 400 },
      );
    }
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
