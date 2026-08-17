import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Dataset from '@/models/Dataset';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectToDatabase();

    const dataset = await Dataset.findOne({ publicSlug: slug, isPublic: true }).lean();
    if (!dataset) {
      return NextResponse.json({ error: 'Public dataset not found' }, { status: 404 });
    }

    return NextResponse.json({ dataset });
  } catch (error) {
    console.error('Fetch public dataset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
