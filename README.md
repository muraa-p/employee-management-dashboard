# Employee Management Dashboard

An employee management dashboard built with Vite, vanilla JavaScript, Chart.js, and Supabase.

It covers the typical internal operations stack for a small team: employee records, attendance tracking, leave management, project assignment, task progress, and role-based dashboard views for HR and employees.

## Live Demo

- Repository: `https://github.com/muraa-p/employee-management-dashboard`
- Live App: `https://employee-dashboard-gamma-five.vercel.app/`

## Highlights

- Role-aware experience for HR and employee users
- Employee directory with department filters and profile management
- Attendance overview with daily records and chart-based summaries
- Leave request flow with approval and rejection handling
- Project management with members, deadlines, and progress tracking
- Task assignment and status updates for both managers and employees
- Supabase-backed auth and relational data model

## Tech Stack

- Frontend: Vite, JavaScript ES modules, HTML, CSS
- Data/Auth: Supabase
- Charts: Chart.js
- Hosting: Vercel

## Folder Structure

```text
.
|-- index.html
|-- main.js
|-- style.css
|-- js/
|   |-- router.js
|   |-- supabase.js
|   `-- pages/
|-- public/
|-- screenshots/
`-- supabase/
    |-- schema.sql
    |-- seed-demo.sql
    `-- functions/
        `-- create-employee/
            `-- index.ts
```

## Features

### HR Workspace

- View organization-level dashboard metrics
- Manage employees and departments
- Create projects and assign members
- Create and manage project tasks
- Record daily attendance
- Review and resolve leave requests

### Employee Workspace

- Access a personal dashboard
- View assigned projects and tasks
- Update task progress
- Review attendance history
- Request leave
- Update profile and password

## Screenshots

Add your captures to [`screenshots/`](screenshots/) using these names:

- `login.png`
- `hr-dashboard.png`
- `employees.png`
- `projects.png`
- `attendance.png`
- `leaves.png`
- `employee-dashboard.png`
- `my-tasks.png`

Once you add them, this README is already structured for a gallery section update without changing the rest of the documentation.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and add:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Important:

- `VITE_` variables are public at runtime in a Vite frontend
- the Supabase anon key is designed to be public
- do not commit `.env`
- do not expose `service_role` keys in the frontend

### 3. Run the app

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
npm run preview
```

## Deployment

The live site is deployed on Vercel:

- Production URL: `https://employee-dashboard-gamma-five.vercel.app/`

For Vercel, configure these project environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase Setup

The database and backend support files live in [`supabase/`](supabase/):

- [`supabase/schema.sql`](supabase/schema.sql): core schema, indexes, helper functions, and demo-ready RLS policies
- [`supabase/seed-demo.sql`](supabase/seed-demo.sql): starter data for departments, employees, projects, tasks, attendance, and leaves
- [`supabase/functions/create-employee/index.ts`](supabase/functions/create-employee/index.ts): Edge Function used by the HR "Add Employee" flow

## Demo Accounts

For a clean public demo, keep dedicated demo users separate from your personal admin data.

Recommended approach:

1. Run `supabase/schema.sql`
2. Run `supabase/seed-demo.sql`
3. Create matching Supabase Auth users for the seeded employee emails
4. Set the frontend env vars locally and in Vercel

## Notes For Public Repos

- Keep screenshots in the repo so visitors can preview the interface before logging in
- Keep the live demo link near the top of the README
- Keep Supabase secrets out of Git and configure them in Vercel instead
- If you rotate the anon key later, update local `.env` and Vercel envs only

## License

MIT
