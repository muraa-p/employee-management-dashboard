# Employee Dashboard

A production-ready employee management dashboard built with Vite, vanilla JavaScript, and Supabase.

This project provides admin and employee workflows for:
- Attendance tracking
- Employee management
- Project and task tracking
- Leave request lifecycle (pending/approved/rejected)
- Role-aware dashboard views

## Live Deployment

- Production URL: `https://employee-dashboard-gamma-five.vercel.app`
- Vercel Project: `employee-dashboard` (team: `freezys-projects-77042b3a`)

## Tech Stack

- Frontend: Vite, JavaScript (ES Modules), Chart.js
- Backend/BaaS: Supabase (Auth, Database, Edge Functions)
- Hosting: Vercel

## Project Structure

```text
.
|-- index.html
|-- main.js
|-- js/
|   |-- router.js
|   |-- supabase.js
|   `-- pages/
|       |-- dashboard.js
|       |-- employee-dashboard.js
|       |-- employees.js
|       |-- attendance.js
|       |-- leaves.js
|       |-- projects.js
|       |-- my-projects.js
|       |-- my-tasks.js
|       |-- my-attendance.js
|       `-- settings.js
|-- src/
|-- public/
`-- append_att.js
```

## Core Modules

- `js/supabase.js`: Supabase client initialization and current employee resolver.
- `js/router.js`: Route-level page rendering and navigation handling.
- `js/pages/*`: Feature modules for each dashboard section.
- `main.js`: App bootstrap, auth flow, top-level event wiring.

## Local Setup

### 1. Prerequisites

- Node.js 18+ (recommended)
- npm 9+ (recommended)
- A Supabase project with required tables/policies/functions

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Important:
- Use only the **anon/public** key in frontend.
- Do **not** expose Supabase `service_role` keys in this repository or Vercel frontend env vars.

### 4. Run Development Server

```bash
npm run dev
```

### 5. Build and Preview

```bash
npm run build
npm run preview
```

## Security Notes (Supabase)

- The frontend consumes Supabase with `VITE_*` variables only.
- Keep `.env` private (`.gitignore` already protects it).
- Keep `service_role` keys server-side only (Edge Functions/secure backend).
- Enforce Row Level Security (RLS) on all sensitive tables.
- Validate authorization rules for admin-only mutations (employees/projects/tasks/leaves).

## Environment Variables

| Name | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase public anon key |

## System Snapshots (Placeholders)

Replace with actual screenshots after capturing from your running app.

```text
docs/snapshots/
|-- 01-login.png
|-- 02-admin-dashboard.png
|-- 03-employees.png
|-- 04-attendance.png
|-- 05-projects.png
|-- 06-my-tasks.png
`-- 07-settings.png
```

### Snapshot Gallery

![Login Screen](docs/snapshots/01-login.png)
![Admin Dashboard](docs/snapshots/02-admin-dashboard.png)
![Employees Module](docs/snapshots/03-employees.png)
![Attendance Module](docs/snapshots/04-attendance.png)
![Projects Module](docs/snapshots/05-projects.png)
![My Tasks Module](docs/snapshots/06-my-tasks.png)
![Settings Module](docs/snapshots/07-settings.png)

## Git & Deployment Workflow

### GitHub

```bash
git add .
git commit -m "your message"
git push origin main
```

### Vercel (already configured)

```bash
npx vercel deploy -y
```

## Roadmap

- Add automated tests (unit + integration)
- Add CI checks (lint/build/test) on pull requests
- Add role-based route guards and permission middleware
- Add observability (error tracking + request monitoring)

## License

Private/internal use unless specified otherwise by repository owner.
