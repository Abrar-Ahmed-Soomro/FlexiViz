# FlexiViz — Project Scope & ToDo

This file tracks the full scope and task list to build **FlexiViz** from scratch to a working, deployed application. Check items off as they are completed.

---

## Project Scope

### Tech Stack
- **Frontend & API:** Next.js, ReactJS
- **Styling:** Tailwind CSS
- **Databases:** MongoDB (Metadata & Auth), DuckDB (Analytical Engine)

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

### Out of Scope (Phase 1)
- Connecting live external databases (Postgres, MySQL).
- Advanced Machine Learning or AI forecasting.
- Real-time multi-user collaborative editing.

---

## ToDo

### Phase 1 — Project Setup & Authentication
- [ ] Initialize Next.js project with App Router and TypeScript.
- [ ] Install and configure Tailwind CSS.
- [ ] Setup MongoDB Atlas cluster and connect via Mongoose/MongoDB Driver.
- [ ] Create User schema in MongoDB.
- [ ] Implement Signup API route and UI.
- [ ] Implement Login API route and session/JWT management.
- [ ] Build basic user Dashboard layout (protected route).

### Phase 2 — Data Ingestion & Storage Architecture
- [ ] Create `Dataset` metadata schema in MongoDB (fileName, userId, duckDbTableRef).
- [ ] Build File Upload UI component.
- [ ] Build Link Import UI component.
- [ ] API: Handle file upload, save metadata to MongoDB.
- [ ] API: Parse uploaded Excel file and ingest data into a new DuckDB table.
- [ ] API: Handle link fetching and subsequent DuckDB ingestion.

### Phase 3 — Data Profiling & Chart Builder UI
- [ ] API: `GET /api/datasets` to fetch user's files from MongoDB.
- [ ] UI: Display user's files in the Dashboard for selection.
- [ ] API: Query DuckDB to get columns, data types, and distinct values for a selected file.
- [ ] UI: Build Chart Builder sidebar (Select Chart Type).
- [ ] UI: Build Label (X-axis) selector dropdown.
- [ ] UI: Build Legend (Series) selector dropdown.
- [ ] UI: Build Value (Y-axis) & Aggregation (Sum/Avg/Count) selector.
- [ ] UI: Build Filter interface (e.g., Column X equals Y).

### Phase 4 — Aggregation Engine & Visualization
- [ ] Define internal state payload mapping UI selections to SQL logic.
- [ ] API: `POST /api/chart/build` — Receives chart specs.
- [ ] API: Translate chart specs into a fast **DuckDB SQL Query** (Group By, Where, Select).
- [ ] API: Execute DuckDB query and return aggregated JSON array.
- [ ] UI: Integrate ECharts (or Plotly) via wrapper library.
- [ ] UI: Render aggregated data correctly into the chosen chart type.
- [ ] UI: Implement live re-rendering when user changes selections.

### Phase 5 — Polish & Deployment
- [ ] Implement Export to PNG/SVG functionality.
- [ ] Implement Export aggregated data to CSV.
- [ ] Global error handling and loading spinners (Tailwind styled).
- [ ] Responsive design check (Mobile vs Desktop).
- [ ] Deploy MongoDB (Atlas).
- [ ] Deploy Next.js app to Vercel.
- [ ] Configure server environment for DuckDB persistent storage limits.

### Stretch / Future
- [ ] Shared public links for dashboards.
- [ ] Scheduled email reports.
- [ ] Advanced time-series forecasting integration.

---

## Definition of Done (per task)
- Code implemented and reviewed.
- Linting and TypeScript types pass.
- Visually verified in browser (Tailwind styles intact).
- Backend APIs successfully interact with MongoDB and DuckDB.
