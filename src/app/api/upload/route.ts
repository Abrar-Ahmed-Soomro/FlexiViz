import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Dataset from '@/models/Dataset';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { env } from '@/lib/env';
import * as XLSX from 'xlsx';
import { getDuckDB, generateTableName, queryDuckDB, inferDuckDBType } from '@/lib/duckdb';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface RowData {
  [key: string]: unknown;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` }, { status: 400 });
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/)) {
      return NextResponse.json({ error: 'Invalid file type. Please upload Excel or CSV.' }, { status: 400 });
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File is empty or has no data' }, { status: 400 });
    }

    // Generate table name
    const tableName = generateTableName(decoded.userId, file.name);

    // Get DuckDB and ingest data
    const db = await getDuckDB();

    // Get column names
    const columns: string[] = Object.keys(jsonData[0] as RowData);

    // Infer native column types from sample data
    const inferredColumns = columns.map(col => {
      const sampleValues = (jsonData as RowData[]).slice(0, 100).map((row: RowData) => row[col]);
      const type = inferDuckDBType(sampleValues);
      return { name: col, type };
    });

    const columnDefs = inferredColumns.map(col => `"${col.name}" ${col.type}`).join(', ');

    // Create table with native types
    await new Promise<void>((resolve, reject) => {
      db.run(`CREATE OR REPLACE TABLE "${tableName}" (${columnDefs})`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Insert data
    const placeholders = columns.map(() => '?').join(', ');
    const insertSql = `INSERT INTO "${tableName}" VALUES (${placeholders})`;
    const conn = db.connect();
    const stmt = conn.prepare(insertSql);

    for (const row of jsonData) {
      const values = columns.map(col => {
        const val = (row as RowData)[col];
        if (val === '' || val === null || val === undefined) return null;
        return val;
      });
      stmt.run(values as unknown[]);
    }

    stmt.finalize();
    conn.close();

    // Get row count
    const rowCountResult = await queryDuckDB<{ count: number }>(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const count = rowCountResult[0]?.count || jsonData.length;

    // Save metadata to MongoDB (inferredColumns already computed above)
    await connectToDatabase();
    const dataset = new Dataset({
      userId: decoded.userId,
      fileName: file.name,
      sourceType: 'upload',
      duckDbTableName: tableName,
      columns: inferredColumns,
      rowCount: count,
    });
    await dataset.save();

    return NextResponse.json({
      dataset: {
        _id: String(dataset._id),
        fileName: dataset.fileName,
        rowCount: dataset.rowCount,
        columns: dataset.columns,
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
