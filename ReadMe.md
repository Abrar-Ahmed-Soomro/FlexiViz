# FlexiViz

**FlexiViz** — *Flexible Visualization* — is a self-service Business Intelligence (BI) web application that converts raw Excel data into meaningful, interactive visualizations — with zero coding required. Users create accounts, import Excel files (via upload or link), and the system securely stores the metadata in MongoDB while parsing the raw data into DuckDB for lightning-fast querying. Users can then select their files, build charts through simple selections (**filters**, **legends**, and **labels**), and generate instant graphs even with millions of records.

---

## Table of Contents
1. [Project Vision](#project-vision)
2. [Problem Statement](#problem-statement)
3. [Target Users](#target-users)
4. [Core Features](#core-features)
5. [Tech Stack](#tech-stack)
6. [System Architecture](#system-architecture)
7. [Data Model](#data-model)
8. [User Workflow](#user-workflow)
9. [Module Breakdown](#module-breakdown)
10. [Implementation Plan](#implementation-plan)
11. [Project Structure](#project-structure)
12. [Testing Strategy](#testing-strategy)
13. [Deployment](#deployment)
14. [Future Scope](#future-scope)
15. [License](#license)

---

## Project Vision
Empower anyone — analysts, managers, students, small businesses — to turn spreadsheets into clear, decision-ready charts in minutes. FlexiViz removes the barrier of complex BI tools by automating data profiling and offering a guided, selection-based chart builder powered by a high-performance analytical database.

## Problem Statement
Most people store business data in Excel but struggle to:
- Handle massive datasets (millions of rows) without Excel crashing.
- Build correct, insightful charts without learning Power BI / Tableau.
- Filter, group, and compare data visually on the fly securely over the web.

FlexiViz solves this with an automated, intuitive pipeline: **Authenticate → Import → Analyze → Select → Visualize.**

## Target Users
- Business analysts and operations teams.
- Small/medium business owners tracking KPIs.
- Students and researchers working with massive tabular data.
- Anyone who lives in spreadsheets but wants faster, shareable insights.

---

## Core Features

### 1. User Authentication & Account Management
- Secure user signup, login, and session management.
- User-specific dashboard to manage uploaded files and generated charts.

### 2. Excel Data Import & Storage
- **File Upload:** Drag-and-drop or browse `.xlsx`, `.xls`, `.csv`.
- **Link Import:** Paste a URL to a hosted Excel/CSV file; the system fetches it.
- **Dual Storage System:** 
  - File metadata, ownership, and configuration are saved securely in **MongoDB**.
  - Raw tabular data is ingested directly into **DuckDB** for blazing-fast aggregation and querying.

### 3. Automatic Data Analysis (Auto-Profiling)
Once a file is selected, the system queries DuckDB to automatically compute:
- **Distinct Records:** Unique value lists per column (for legends/labels/filters).
- **Data Profiling:** Column data types, null counts, min/max/mean.

### 4. Interactive Graph Builder (Selection-Based)
Driven by three primary selections based on the selected file's schema:

| Selection | Purpose |
| --------- | ------- |
| **Filters** | Restrict rows by conditions (equals, range, contains, date between). |
| **Legends (Series)** | A column whose distinct values become chart series/legend entries. |
| **Labels (Axis)** | A column used as X-axis categories or point labels. |

Additional controls:
- Chart type: Bar, Line, Pie, Donut, Scatter, Area, Stacked Bar.
- Aggregation method for values (sum/avg/count).

### 5. Visualization & Output
- Interactive, zoomable charts with tooltips.
- DuckDB executes SQL queries on the fly, instantly aggregating millions of records before passing the summarized data to the frontend for rendering.
- Export chart as PNG/SVG and export filtered data as CSV.

---

## Tech Stack

| Concern | Choice |
| ------- | ------ |
| Framework | **Next.js** (App Router) - Full-stack React framework |
| Frontend UI | **ReactJS** |
| Styling | **Tailwind CSS** |
| Charts | **ECharts** (via `echarts-for-react`) or **Plotly** |
| Main Database | **MongoDB** (Users, Auth, File Metadata, Chart Specs) |
| Analytical Engine | **DuckDB** (Fast columnar querying, grouping, aggregations) |
| Connection Mgmt | DuckDB `Database` is a singleton to prevent file locking; `Connection` objects are per-query |
| Excel Parsing | **SheetJS** or **Polars** (to parse and pipe into DuckDB) |
| Validation | **Zod** |

---

## System Architecture

```text
┌──────────────┐      Upload/Link/Select    ┌──────────────────┐
│   Browser    │ ─────────────────────────► │ Next.js API /    │
│  (React UI)  │                            │ Node Backend     │
│              │ ◄───────────────────────── │                  │
│ - Signup     │     Aggregated JSON Data   │ - Auth/Sessions  │
│ - Upload     │                            │ - Routing        │
│ - Select     │                            └──────────────────┘
└──────────────┘                               │         │
        │                                      ▼         ▼
        │ ECharts                       ┌──────────┐  ┌──────────┐
        ▼                               │ MongoDB  │  │  DuckDB  │
┌──────────────┐                        │(Metadata)│  │(Raw Data)│
│  Interactive │                        └──────────┘  └──────────┘
│   Charts     │                                           
└──────────────┘                                           
```

**Request Flow:**
1. User authenticates and uploads an Excel file.
2. Next.js API saves file metadata (name, user ID, upload date) to MongoDB.
3. The raw file is parsed and ingested into DuckDB.
4. User selects a file from their dashboard.
5. System queries DuckDB for schema/distinct values to populate dropdowns (Labels, Legends, Filters).
6. User configures the chart and requests the graph.
7. Next.js API translates the request into a DuckDB SQL query.
8. DuckDB instantly aggregates millions of rows and returns summary JSON.
9. React frontend renders the interactive chart.

### Connection Management

- **File-Level Locking:** DuckDB uses file-level locking on the database file. Only one writer can hold the lock at a time.
- **Problem:** Multiple `Database` instances competing for the lock cause *"Resource temporarily unavailable"* errors.
- **Solution:** A singleton `Database` instance is cached on `globalThis`, ensuring it survives Hot Module Replacement (HMR) in Next.js dev mode.
- **Per-Query Connections:** `Connection` objects are created per-query from the singleton `Database` instance, allowing concurrent read queries without lock contention.

---

## Data Model (Conceptual)

**MongoDB:**
```ts
interface User {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

interface DatasetMetadata {
  _id: ObjectId;
  userId: ObjectId;
  fileName: string;
  sourceType: "upload" | "link";
  duckDbTableName: string; // Reference to DuckDB
  createdAt: Date;
}
```

---

## User Workflow
1. **Signup/Login** → User authenticates.
2. **Dashboard** → User views their previously uploaded files or uploads a new one.
3. **Upload/Link** → File is saved to DuckDB; reference saved to MongoDB.
4. **Select Dataset** → User clicks a dataset. System fetches columns.
5. **Build** → Choose chart type, label, legend, value, filters.
6. **Visualize** → DuckDB aggregates data instantly; React renders the chart.

---

## Module Breakdown

- `AuthModule` — Signup, Login, JWT/Session management.
- `DashboardModule` — List user datasets (from MongoDB).
- `UploadModule` — File upload, Excel ingestion to DuckDB, Metadata to MongoDB.
- `ChartBuilderModule` — Selection controls (filters/legends/labels) powered by DuckDB schema queries.
- `ChartRenderModule` — Execution of aggregation query and rendering via ECharts.

---

## Implementation Plan (Phased)

**Phase 1 — Setup & Auth**
- Initialize Next.js project with Tailwind CSS.
- Set up MongoDB connection.
- Implement User Registration, Login, and Auth Context.

**Phase 2 — Upload & Storage Strategy**
- Build Upload UI.
- Implement API route to save metadata to MongoDB.
- Integrate DuckDB to ingest Excel data upon upload.

**Phase 3 — Data Profiling & Selection**
- Dashboard to select datasets.
- API routes to query DuckDB for column names, types, and distinct values.
- Build the Chart Builder UI (Label, Legend, Filter dropdowns).

**Phase 4 — Aggregation & Visualization**
- Translate UI selections into DuckDB SQL queries.
- Return aggregated JSON to the client.
- Render charts using ECharts/React.

**Phase 5 — Polish & Deploy**
- Export functionalities (PNG/CSV).
- UI/UX polish with Tailwind.
- Deploy to Vercel (Frontend) and appropriate backend hosting.

---

## Project Structure (Next.js App Router)
```text
FlexiViz/
├── src/
│   ├── app/                # Next.js App Router pages & layouts
│   │   ├── api/            # Backend API Routes (Auth, Upload, Query)
│   │   ├── dashboard/      # User Dashboard
│   │   ├── auth/           # Login/Signup
│   │   └── page.tsx        # Landing Page
│   ├── components/         # React components (Upload, ChartBuilder, etc.)
│   ├── lib/                # DuckDB & MongoDB connection clients
│   │   └── duckdb.ts       # Singleton DuckDB Database/Connection pattern
│   └── models/             # Mongoose schemas
├── public/
├── tailwind.config.js
├── package.json
├── ReadMe.md
└── ToDo.md
```

---

## Testing Strategy
- **Unit:** MongoDB model validations, DuckDB query generation.
- **Component:** React Testing Library for Chart Builder.
- **E2E:** Cypress / Playwright for full Auth -> Upload -> Graph flow.

---

## Deployment
- **Platform:** Vercel (Next.js hosting for frontend and serverless APIs).
- **Database:** MongoDB Atlas (Cloud database).
- **DuckDB:** Handled server-side (persistent disk or cloud bucket mapping depending on hosting limits).

---

## Future Scope
- Connect live DBs (Postgres, MySQL).
- Advanced ML insights and forecasting.
- Shared workspaces and public dashboards.

---

## License
MIT
