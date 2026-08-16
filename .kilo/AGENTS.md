# FlexiViz Project

FlexiViz is a self-service Business Intelligence web application that converts Excel files into interactive visualizations and dashboards.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** MongoDB
- **Data Engine:** DuckDB (local analytics)
- **Visualization:** Apache ECharts

## Key Development Conventions

- Use the Next.js App Router (`app/` directory) for all pages and layouts.
- Server Components by default; mark interactivity with `"use client"` only when necessary.
- Place API routes under `app/api/`.
- Store reusable UI components in `components/`.
- Place utility functions and hooks in `lib/`.
- TypeScript types and interfaces in `types/`.
- Environment-specific configuration belongs in `.env.local` (git-ignored).

## DuckDB Singleton Connection Pattern

For local development, use a singleton DuckDB `Database` instance cached on `globalThis` to avoid file locking issues and survive Next.js hot module replacement.

```typescript
import * as duckdb from 'duckdb';

declare global {
  var __flexivizDb: duckdb.Database | undefined;
}

export function getDuckDBConnection(): duckdb.Connection {
  if (!globalThis.__flexivizDb) {
    globalThis.__flexivizDb = new duckdb.Database('./data/flexiviz.duckdb');
  }

  return globalThis.__flexivizDb.connect();
}
```

**Why this matters:**

- **One `Database` instance per process:** DuckDB acquires an exclusive file lock on the database file. By storing the `Database` instance on `globalThis`, only one `Database` is ever created per Node.js process, so only one lock is acquired.

- **Multiple `Connection` objects:** A single `Database` instance can produce many `Connection` objects via repeated `.connect()` calls. This allows concurrent query handling across connections while keeping the underlying database resources shared and stable.

- **HMR safety:** Next.js development uses Hot Module Replacement, which re-executes module code without restarting the process. A plain module-level variable would be reset on each reload. Storing the instance on `globalThis` ensures it persists across reloads, preventing new `Database` instances from competing for the file lock.

**Limitation:** While multiple `Connection` objects can be created from the same `Database` instance, DuckDB serializes concurrent queries across different connections in the same process. If you need parallel query execution, run queries sequentially or use separate `Database` instances with separate database files.
