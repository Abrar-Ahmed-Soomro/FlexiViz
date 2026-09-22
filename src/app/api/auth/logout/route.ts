import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function POST(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isHttps = new URL(request.url).protocol === 'https:' || forwardedProto === 'https';

  const response = NextResponse.redirect(env.NEXT_PUBLIC_APP_URL);
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });
  return response;
}
