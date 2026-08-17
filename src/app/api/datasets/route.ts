import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Dataset from '@/models/Dataset';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { env } from '@/lib/env';

interface DatasetResponse {
  _id: string;
  fileName: string;
  sourceType: 'upload' | 'link';
  rowCount: number;
  createdAt: string;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    await connectToDatabase();

    const datasets = await Dataset.find({ userId: decoded.userId })
      .sort({ createdAt: -1 })
      .lean();

    const typedDatasets: DatasetResponse[] = (datasets as Array<Record<string, unknown>>).map((d) => ({
      _id: String(d._id),
      fileName: d.fileName as string,
      sourceType: d.sourceType as 'upload' | 'link',
      rowCount: d.rowCount as number,
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date(d.createdAt as string).toISOString(),
    }));

    return NextResponse.json({ datasets: typedDatasets });
  } catch (error) {
    console.error('Fetch datasets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
