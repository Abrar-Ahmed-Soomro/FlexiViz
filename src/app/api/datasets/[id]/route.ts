import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Dataset from '@/models/Dataset';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { env } from '@/lib/env';
import { getDuckDB } from '@/lib/duckdb';
import crypto from 'crypto';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    await connectToDatabase();

    const dataset = await Dataset.findOne({ _id: params.id, userId: decoded.userId });
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const body = await request.json();
    const { isPublic } = body;

    if (isPublic && !dataset.publicSlug) {
      dataset.publicSlug = crypto.randomBytes(16).toString('hex');
    } else if (!isPublic) {
      dataset.publicSlug = undefined;
    }

    dataset.isPublic = isPublic;
    await dataset.save();

    return NextResponse.json({
      dataset: {
        _id: String(dataset._id),
        isPublic: dataset.isPublic,
        publicSlug: dataset.publicSlug,
      },
    });
  } catch (error) {
    console.error('Update dataset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    await connectToDatabase();

    const dataset = await Dataset.findOne({ _id: params.id, userId: decoded.userId });
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // Drop DuckDB table
    try {
      const db = await getDuckDB();
      await new Promise<void>((resolve, reject) => {
        db.run(`DROP TABLE IF EXISTS "${dataset.duckDbTableName}"`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (err) {
      console.error('Error dropping DuckDB table:', err);
    }

    await Dataset.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete dataset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    await connectToDatabase();

    const dataset = await Dataset.findOne({ _id: params.id, userId: decoded.userId }).lean();
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    return NextResponse.json({ dataset });
  } catch (error) {
    console.error('Fetch dataset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
