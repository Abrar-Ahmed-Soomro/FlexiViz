# FlexiViz — Project Scope & ToDo

This file tracks the full scope and task list to build **FlexiViz** from scratch to a working, deployed application. Check items off as they are completed.

---

## Project Scope

### Tech Stack
- **Frontend & API:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Databases:** MongoDB (Metadata & Auth), DuckDB (Analytical Engine)
- **Charts:** ECharts (via `echarts-for-react`)
- **Validation:** Zod

### In Scope
- Secure User Accounts (Signup, Login, Sessions).
- Dashboard to view, manage, and select previously uploaded files.
- Upload Excel/CSV files or provide a direct link.
- Save file metadata and user ownership in **MongoDB**.
- Ingest millions of raw rows into **DuckDB** for lightning-fast querying.
- Selection-based interactive chart builder (filters, legends, labels).
- Live execution of DuckDB SQL to aggregate data before sending it to the frontend.
- Multiple chart types (bar, line, pie, donut, scatter, area, stacked).
- Export charts (PNG/SVG) and filtered data (CSV).
- Manage DuckDB connections as singletons to prevent file locking.

### Out of Scope (Phase 1)
- Connecting live external databases (Postgres, MySQL).
- Advanced Machine Learning or AI forecasting.
- Real-time multi-user collaborative editing.

---

## ToDo

### Phase 1 — Project Setup & Authentication
- [x] Initialize Next.js project with App Router and TypeScript.
- [x] Install and configure Tailwind CSS v4.
- [x] Setup MongoDB Atlas cluster and connect via Mongoose.
- [x] Create User schema in MongoDB.
- [x] Implement Signup API route and UI.
- [x] Implement Login API route and session/JWT management.
- [x] Build basic user Dashboard layout (protected route).
- [x] Add password strength requirements (Zod validation beyond minLength: 6).
- [x] Add email verification flow (optional for Phase 1).

### Phase 2 — Data Ingestion & Storage Architecture
- [x] Create `Dataset` metadata schema in MongoDB (fileName, userId, duckDbTableRef).
- [x] Build File Upload UI component.
- [x] Build Link Import UI component.
- [x] API: Handle file upload, save metadata to MongoDB.
- [x] API: Parse uploaded Excel file and ingest data into a new DuckDB table using the singleton connection.
- [x] API: Handle link fetching and subsequent DuckDB ingestion.
- [x] Create `lib/duckdb.ts` — Singleton DuckDB `Database` instance on `globalThis` to prevent file locking across HMR/API route invocations.
- [x] Preserve native column data types during ingestion (currently all columns are VARCHAR).
- [x] Add file size limits and validation for uploads.
- [x] Add column type inference and store inferred types in Dataset metadata.

### Phase 3 — Data Profiling & Chart Builder UI
- [x] API: `GET /api/datasets` to fetch user's files from MongoDB.
- [x] UI: Display user's files in the Dashboard for selection.
- [x] API: Query DuckDB to get columns, data types, and distinct values for a selected file.
- [x] UI: Build Chart Builder sidebar (Select Chart Type).
- [x] UI: Build Label (X-axis) selector dropdown.
- [x] UI: Build Legend (Series) selector dropdown.
- [x] UI: Build Value (Y-axis) & Aggregation (Sum/Avg/Count) selector.
- [x] UI: Build Filter interface (e.g., Column X equals Y).
- [x] Add column data profiling (null counts, min/max/mean) to schema API.
- [x] Implement responsive layout for Chart Builder (mobile-friendly sidebar).
- [x] Add loading skeletons for schema queries.

### Phase 4 — Aggregation Engine & Visualization
- [x] Define internal state payload mapping UI selections to SQL logic.
- [x] API: `POST /api/chart/build` — Receives chart specs.
- [x] API: Translate chart specs into a fast **DuckDB SQL Query** (Group By, Where, Select).
- [x] API: Execute DuckDB query and return aggregated JSON array.
- [x] UI: Integrate ECharts (via `echarts-for-react`).
- [x] UI: Render aggregated data correctly into the chosen chart type.
- [x] UI: Implement live re-rendering when user changes selections.
- [x] UI: Implement Export to PNG/SVG functionality.
- [x] UI: Implement Export aggregated data to CSV.
- [x] Fix SQL injection risk: parameterize queries in `sanitizeString` instead of naive escaping.
- [x] Fix `COUNT` aggregation to use `COUNT(*)` instead of `COUNT("valueColumn")` to include NULLs.
- [x] Fix Scatter chart rendering (currently treated as line/bar with categories; needs proper x/y value mapping).
- [x] Add error boundary for chart rendering failures.
- [x] Add empty state / no-data message when aggregation returns zero rows.

### Phase 5 — Polish & Deployment
- [x] Implement Export to PNG/SVG functionality.
- [x] Implement Export aggregated data to CSV.
- [x] Global error handling utility (consistent error UI across pages).
- [x] Global loading spinner component (Tailwind styled).
- [x] Responsive design audit (Mobile vs Desktop — nav, dashboard, chart builder).
- [x] Deploy MongoDB (Atlas) — configure connection string.
- [x] Deploy Next.js app to Vercel.
- [x] Configure DuckDB persistent storage path on server (`DUCKDB_PATH` env var).
- [x] Add environment validation script / `.env.example`.
- [x] SEO meta tags for landing page.
- [x] Add favicon and app branding assets.

### Stretch / Future
- [x] Shared public links for dashboards.
- [x] Scheduled email reports.
- [x] Advanced time-series forecasting integration.
- [x] Connect live databases (Postgres, MySQL).
- [x] Multi-user collaborative editing.
- [x] Chart specification save/load (store chart configs in MongoDB).

---

## Definition of Done (per task)
- Code implemented and reviewed.
- Linting and TypeScript types pass.
- Visually verified in browser (Tailwind styles intact).
- Backend APIs successfully interact with MongoDB and DuckDB.

---

## Notes
- **DuckDB Singleton:** `lib/duckdb.ts` uses `globalThis` to cache the `Database` instance, preventing file-locking errors during HMR and concurrent API route invocations.
- **Next.js 16 Breaking Changes:** Review `node_modules/next/dist/docs/` before making framework-level changes; APIs and conventions may differ from training data.
