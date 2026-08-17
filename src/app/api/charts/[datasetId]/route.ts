import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Chart from '@/models/Chart';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { env } from '@/lib/env';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  try {
    const { datasetId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    await connectToDatabase();

    const charts = await Chart.find({ userId: decoded.userId, datasetId }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ charts });
  } catch (error) {
    console.error('Fetch charts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  try {
    const { datasetId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    await connectToDatabase();

    const body = await request.json();
    const { name, config } = body;

    if (!name || !config) {
      return NextResponse.json({ error: 'Name and config are required' }, { status: 400 });
    }

    const chart = new Chart({
      userId: decoded.userId,
      datasetId,
      name,
      config,
    });

    await chart.save();

    return NextResponse.json({ chart }, { status: 201 });
  } catch (error) {
    console.error('Save chart error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
