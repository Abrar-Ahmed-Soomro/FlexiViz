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
  legend?: string;
  value?: number;
  xValue?: number;
  yValue?: number;
}

interface SeriesData {
  name: string;
  data: number[];
}

const buildSchema = z.object({
  chartType: z.enum(['bar', 'line', 'pie', 'donut', 'scatter', 'area', 'stacked']),
  labelColumn: z.string(),
  legendColumn: z.string().optional(),
  valueColumn: z.string(),
  aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max']).default('sum'),
  filters: z.array(z.object({
    column: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'between']),
    value: z.any(),
    value2: z.any().optional(),
  })).optional().default([]),
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
    const specs = buildSchema.parse(body);

    await connectToDatabase();

    const dataset = await Dataset.findOne({ _id: params.id, userId: decoded.userId }).lean();
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const tableName = dataset.duckDbTableName as string;

    // Build SQL query
    const { labelColumn, legendColumn, valueColumn, aggregation, chartType, filters } = specs;

    // Determine aggregation function
    let aggFunc = aggregation.toUpperCase();
    let countAllRows = false;
    if (aggregation === 'count') {
      aggFunc = 'COUNT';
      countAllRows = true;
    }

    // Validate identifiers to prevent SQL injection (only allow alphanumeric + underscore)
    const validIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validIdentifier.test(labelColumn) || !validIdentifier.test(valueColumn)) {
      return NextResponse.json({ error: 'Invalid column name' }, { status: 400 });
    }
    if (legendColumn && !validIdentifier.test(legendColumn)) {
      return NextResponse.json({ error: 'Invalid legend column name' }, { status: 400 });
    }
    if (!validIdentifier.test(tableName)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 500 });
    }

    // Build WHERE clause from filters with parameterized values
    const filterValues: unknown[] = [];
    let whereClause = 'WHERE 1=1';

    if (filters && filters.length > 0) {
      for (const filter of filters) {
        if (!validIdentifier.test(filter.column)) {
          return NextResponse.json({ error: 'Invalid filter column name' }, { status: 400 });
        }

        switch (filter.operator) {
          case 'equals':
            whereClause += ` AND "${filter.column}" = ?`;
            filterValues.push(filter.value);
            break;
          case 'not_equals':
            whereClause += ` AND "${filter.column}" != ?`;
            filterValues.push(filter.value);
            break;
          case 'contains':
            whereClause += ` AND CAST("${filter.column}" AS VARCHAR) ILIKE ?`;
            filterValues.push(`%${filter.value}%`);
            break;
          case 'greater_than':
            whereClause += ` AND "${filter.column}" > ?`;
            filterValues.push(filter.value);
            break;
          case 'less_than':
            whereClause += ` AND "${filter.column}" < ?`;
            filterValues.push(filter.value);
            break;
          case 'between':
            whereClause += ` AND "${filter.column}" BETWEEN ? AND ?`;
            filterValues.push(filter.value, filter.value2);
            break;
        }
      }
    }

    // Build GROUP BY and SELECT
    const valueAlias = 'value';
    let selectColumns = `"${labelColumn}" as label`;
    let groupBy = `"${labelColumn}"`;

    if (legendColumn) {
      selectColumns += `, "${legendColumn}" as legend`;
      groupBy += `, "${legendColumn}"`;
    }

    // Scatter chart needs x and y values, not aggregation
    let selectClause: string;
    if (chartType === 'scatter') {
      selectClause = `SELECT "${labelColumn}" as xValue, "${valueColumn}" as yValue`;
      if (legendColumn) {
        selectClause += `, "${legendColumn}" as legend`;
      }
    } else {
      const countExpr = countAllRows ? '*' : `"${valueColumn}"`;
      selectClause = `SELECT ${selectColumns}, ${aggFunc}(${countExpr}) as ${valueAlias}`;
    }

    const groupByClause = chartType === 'scatter' ? '' : `GROUP BY ${groupBy}`;
    const orderByClause = chartType === 'scatter' ? '' : `ORDER BY label`;

    const sql = `${selectClause} FROM "${tableName}" ${whereClause} ${groupByClause} ${orderByClause}`;

    // Execute query with parameterized values to prevent SQL injection
    const conn = (await getDuckDB()).connect();
    const results = await new Promise<ChartResult[]>((resolve, reject) => {
      conn.all(sql, ...filterValues, (err, rows) => {
        conn.close();
        if (err) reject(err);
        else resolve(rows as ChartResult[]);
      });
    });

    // Transform results for ECharts
    let chartData: Record<string, unknown> = {};

    if (chartType === 'scatter') {
      // For scatter, return raw x/y pairs
      const points: [number, number][] = results
        .map((r: ChartResult) => {
          const x = Number(r.xValue);
          const y = Number(r.yValue);
          if (isNaN(x) || isNaN(y)) return null;
          return [x, y] as [number, number];
        })
        .filter((point): point is [number, number] => point !== null);

      chartData = {
        points,
        series: [{ name: legendColumn || valueColumn, data: points }],
      };
    } else if (chartType === 'pie' || chartType === 'donut') {
      // For pie/donut, use label as category and value as data
      chartData = {
        categories: results.map((r: ChartResult) => r.label),
        values: results.map((r: ChartResult) => r.value),
      };
    } else if (legendColumn && results.length > 0) {
      // For charts with legend, pivot the data
      const labels = [...new Set(results.map((r: ChartResult) => r.label))];
      const legends = [...new Set(results.map((r: ChartResult) => r.legend as string))];

      const series = legends.map((legend) => {
        const data = labels.map((label) => {
          const row = results.find((r: ChartResult) => r.label === label && r.legend === legend);
          return row ? row.value : 0;
        });
        return { name: legend, data };
      });

      chartData = {
        categories: labels,
        series: series as SeriesData[],
      };
    } else {
      chartData = {
        categories: results.map((r: ChartResult) => r.label),
        values: results.map((r: ChartResult) => r.value),
      };
    }

    return NextResponse.json({
      data: results,
      chartData,
      sql,
      chartType: specs.chartType,
    });
  } catch (error) {
    console.error('Build chart error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
