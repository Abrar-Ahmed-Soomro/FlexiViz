import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Dataset from '@/models/Dataset';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { env } from '@/lib/env';
import { getDuckDB } from '@/lib/duckdb';
import { z } from 'zod';

interface ChartResult {
  label?: string;
  value?: number;
  forecast?: number;
}

const forecastSchema = z.object({
  labelColumn: z.string(),
  valueColumn: z.string(),
  aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max']).default('sum'),
  periods: z.number().min(1).max(12).default(3),
});

export async function POST(
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
    const body = await request.json();
    const specs = forecastSchema.parse(body);

    await connectToDatabase();

    const dataset = await Dataset.findOne({ _id: params.id, userId: decoded.userId }).lean();
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const tableName = dataset.duckDbTableName as string;
    const { labelColumn, valueColumn, aggregation, periods } = specs;

    const validIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validIdentifier.test(labelColumn) || !validIdentifier.test(valueColumn)) {
      return NextResponse.json({ error: 'Invalid column name' }, { status: 400 });
    }
    if (!validIdentifier.test(tableName)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 500 });
    }

    const aggFunc = aggregation.toUpperCase();
    const historicalSql = `SELECT "${labelColumn}" as label, ${aggFunc}("${valueColumn}") as value FROM "${tableName}" GROUP BY "${labelColumn}" ORDER BY label`;
    const conn = (await getDuckDB()).connect();

    const historical = await new Promise<{ label: string; value: number }[]>((resolve, reject) => {
      conn.all(historicalSql, (err, rows) => {
        conn.close();
        if (err) reject(err);
        else resolve(rows as { label: string; value: number }[]);
      });
    });

    if (historical.length === 0) {
      return NextResponse.json({ error: 'No data available for forecasting' }, { status: 400 });
    }

    const values = historical.map(h => h.value);
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecasts: ChartResult[] = [];
    for (let i = 0; i < periods; i++) {
      const forecastValue = slope * (n + i) + intercept;
      forecasts.push({
        label: `Forecast ${i + 1}`,
        value: Math.max(0, forecastValue),
        forecast: Math.max(0, forecastValue),
      });
    }

    return NextResponse.json({
      historical,
      forecasts,
      method: 'linear_regression',
    });
  } catch (error) {
    console.error('Forecast error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
