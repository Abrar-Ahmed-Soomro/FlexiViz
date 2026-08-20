# FlexiViz

Turn Excel data into interactive visualizations with zero coding required.

## Tech Stack

- **Frontend & API:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Databases:** MongoDB Atlas (metadata & auth), DuckDB (analytical engine)
- **Charts:** ECharts via `echarts-for-react`
- **Validation:** Zod

## Prerequisites

- Node.js 18+
- MongoDB Atlas cluster (or local MongoDB)
- pnpm (preferred)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd flexiviz
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your values:
   - `MONGODB_URI` — MongoDB Atlas connection string
   - `JWT_SECRET` — strong random string (min 32 chars)
   - `DUCKDB_PATH` — DuckDB file path, default `./data/flexiviz.duckdb`

4. **Run the development server**
   ```bash
   pnpm run dev
   ```

5. **Open the app**
   Navigate to `http://localhost:3000`

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start development server |
| `pnpm run build` | Build for production |
| `pnpm run start` | Start production server |
| `pnpm run lint` | Run ESLint |

## Project Structure

```
src/
  app/
    api/
      auth/             # Authentication routes
      chart/
        build/[id]/     # Chart aggregation API
        forecast/[id]/  # Forecasting API
        [datasetId]/    # Save/load chart configs
      dataset/
        [id]/schema/    # Column profiling API
      datasets/         # Dataset CRUD
      import/           # Link import
      public/[slug]/    # Public dashboard sharing
      upload/           # File upload
    auth/
      login/            # Login page
      signup/           # Signup page
      verify-email/     # Email verification
    dashboard/
      [id]/             # Chart builder
      layout.tsx        # Dashboard shell
      page.tsx          # Dataset management
    public/
      [slug]/           # Public dashboard view
    page.tsx            # Landing page
    layout.tsx          # Root layout
  components/
    ChartErrorBoundary.tsx
    DashboardNav.tsx
    ErrorBanner.tsx
    LinkImport.tsx
    LoadingSpinner.tsx
    UploadZone.tsx
  contexts/
    AuthContext.tsx
    ErrorContext.tsx
  lib/
    duckdb.ts           # DuckDB singleton + helpers
    env.ts              # Environment validation
    mongoose.ts         # MongoDB singleton
    validations.ts      # Zod schemas
  models/
    Chart.ts
    Dataset.ts
    User.ts
```

## Deployment

### Vercel

1. Push your code to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. Set the following environment variables in Vercel:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL` — your production URL
   - `DUCKDB_PATH` — on serverless, use `/tmp/flexiviz.duckdb` or a persistent volume path
4. Deploy.

### MongoDB Atlas

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/atlas/database).
2. Whitelist your IP or set access to `0.0.0.0/0` for testing.
3. Create a database user with read/write permissions.
4. Use the connection string in `MONGODB_URI`.

### DuckDB Storage

- On Vercel/serverless, set `DUCKDB_PATH=/tmp/flexiviz.duckdb`. Note that `/tmp` is ephemeral and data may be lost between invocations.
- For persistent storage, use a persistent volume or external object store, and adjust `src/lib/duckdb.ts` accordingly.

## Features

- Secure user accounts with email verification
- Upload Excel/CSV files or import from URL
- Automatic type inference for columns
- Interactive chart builder with filters, legends, and multiple chart types
- Live chart re-rendering on selection changes
- Export charts as PNG/SVG
- Export aggregated data as CSV
- Responsive design for mobile and desktop
- Column profiling: null counts, min/max/mean
- Public dashboard sharing via slug
- Save/load chart configurations
- Linear regression forecasting

## License

Private
