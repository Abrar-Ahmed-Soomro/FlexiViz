import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Dataset from '@/models/Dataset';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { env } from '@/lib/env';
import { queryDuckDB } from '@/lib/duckdb';

interface ColumnProfile {
  name: string;
  type: string;
  distinctCount: number;
  distinctValues: unknown[];
  nullCount: number;
  min?: unknown;
  max?: unknown;
  mean?: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    await connectToDatabase();

    const dataset = await Dataset.findOne({ _id: id, userId: decoded.userId }).lean();
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const tableName = dataset.duckDbTableName as string;

    // Get distinct values for each column (limited to 100)
    const columnsSchema = await Promise.all(
      (dataset.columns as Array<{ name: string; type: string }>).map(async (col) => {
        try {
          const [distinctResult, nullCountResult] = await Promise.all([
            queryDuckDB<{ distinct_count: number }>(
              `SELECT COUNT(DISTINCT "${col.name}") as distinct_count FROM "${tableName}"`
            ),
            queryDuckDB<{ null_count: number }>(
              `SELECT COUNT(*) - COUNT("${col.name}") as null_count FROM "${tableName}"`
            ),
          ]);

          const distinctCount = distinctResult[0]?.distinct_count || 0;
          const nullCount = nullCountResult[0]?.null_count || 0;

          // Get sample distinct values if low cardinality
          let distinctValues: unknown[] = [];
          if (distinctCount <= 100) {
            const valuesResult = await queryDuckDB<{ value: unknown }>(
              `SELECT DISTINCT "${col.name}" as value FROM "${tableName}" ORDER BY value LIMIT 100`
            );
            distinctValues = valuesResult.map(r => r.value).filter(v => v !== null && v !== undefined);
          }

          // Get min/max for numeric and date columns
          let min: unknown = undefined;
          let max: unknown = undefined;
          let mean: number | undefined;

          if (col.type === 'BIGINT' || col.type === 'DOUBLE') {
            const statsResult = await queryDuckDB<{ min: unknown; max: unknown; mean: number | null }>(
              `SELECT MIN("${col.name}") as min, MAX("${col.name}") as max, AVG(CAST("${col.name}" AS DOUBLE)) as mean FROM "${tableName}"`
            );
            const stats = statsResult[0];
            min = stats?.min ?? undefined;
            max = stats?.max ?? undefined;
            mean = stats?.mean ?? undefined;
          } else if (col.type === 'TIMESTAMP') {
            const statsResult = await queryDuckDB<{ min: unknown; max: unknown }>(
              `SELECT MIN("${col.name}") as min, MAX("${col.name}") as max FROM "${tableName}"`
            );
            const stats = statsResult[0];
            min = stats?.min ?? undefined;
            max = stats?.max ?? undefined;
          }

          return {
            name: col.name,
            type: col.type,
            distinctCount,
            distinctValues,
            nullCount,
            min,
            max,
            mean,
          };
        } catch (err) {
          console.error(`Error fetching schema for column ${col.name}:`, err);
          return {
            name: col.name,
            type: col.type,
            distinctCount: 0,
            distinctValues: [],
            nullCount: 0,
          } as ColumnProfile;
        }
      })
    );

    return NextResponse.json({
      columns: columnsSchema,
      rowCount: dataset.rowCount,
    });
  } catch (error) {
    console.error('Fetch schema error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
