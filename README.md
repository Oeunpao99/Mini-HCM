# Location-Based Attendance System

Cross-platform attendance and request management system using:

- Frontend: React + Tailwind CSS
- Backend: FastAPI + SQLAlchemy
- Database: SQLite for local development, PostgreSQL in Docker Compose
- Auth: JWT
- Geolocation: Browser Geolocation API

## Project Structure

- backend: FastAPI service
- frontend: React web app (mobile responsive)
- database.sql: phpMyAdmin importable schema

## Features Implemented

- GPS-based check-in/check-out with configurable company radius
- Late and early-checkout marking
- Business-rule window for check-in/check-out

- Unified requests (leave, permission, flexible, OT)

- Swap attendance request flow (employee + manager/admin)
- Create a database (example uses `attendance_db`) and a user with privileges.
- Import `database.sql` using `psql` or a GUI like pgAdmin. Example with psql:

```bash
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE attendance_db;"
psql -U postgres -h localhost -p 5432 -d attendance_db -f database.sql
```

- Role-based company location/radius override (manager/admin)
- Monthly summary chart in frontend attendance page
- Excel export endpoint for monthly attendance
- Automated backend tests for attendance and request workflows

## Backend Setup

1. Create virtual environment and install dependencies:

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
```

2. Create the local backend environment file:

```bash
copy .env.example .env
```

For local development, `DATABASE_URL=sqlite:///./attendance_dev.db` is enough. You only need PostgreSQL running on `localhost:5432` if you change `DATABASE_URL` back to a PostgreSQL URL.

3. Seed default admin and company location:

```bash
python run.py
```

4. Start backend server from the `backend` folder:

```bash
.venv\\Scripts\\python -m uvicorn app.main:app --reload --port 8000
```

Default seed user (if missing):

- Emp code: `EMP001`
- Password: `admin123`

## Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Create `.env` file:

```env
VITE_API_URL=http://127.0.0.1:8000
```

3. Start frontend:

```bash
npm run dev
```

## API Endpoints

- `POST /api/auth/login`
- `GET /api/company/location`
- `PUT /api/company/location`
- `POST /api/attendance/checkin`
- `POST /api/attendance/checkout`
- `GET /api/attendance/daily`
- `GET /api/attendance/monthly?year=&month=`
- `GET /api/attendance/monthly/export?year=&month=`
- `POST /api/requests/create`
- `GET /api/requests/my`
- `PUT /api/requests/status`
- `PUT /api/requests/cancel`
- `POST /api/swap/request`
- `PUT /api/swap/respond`
- `GET /api/admin/all-attendance`

## HRIS Module

The HRIS management portal is available at `/hris` for line managers, department heads, management HR, and payroll officers.

Included HRIS API groups:

- `GET /api/hris/dashboard`
- `GET/POST /api/hris/employees`
- `GET/POST /api/hris/payroll`
- `GET /api/hris/payroll/payslip/{record_id}`
- `GET /api/hris/payroll/bank-export?year=&month=`
- `POST /api/hris/schedules`
- `POST /api/hris/schedule-changes`
- `GET/POST /api/hris/performance`
- `POST /api/hris/kpis`
- `POST /api/hris/training`
- `GET /api/hris/reports`

Sample HRIS accounts:

- Management HR: `EMP001` / `admin123`
- Payroll Officer: `EMP011` / `payroll123`

## Location Testing and Simulation

- Chrome DevTools:
  - Open `More Tools > Sensors`
  - Change location to custom coordinates near/far from company GPS
- Test in-range: use coordinates within 100m radius
- Test out-of-range: use coordinates outside radius, expect error and admin alert

## Automated Tests

Run backend tests:

```bash
cd backend
.venv\\Scripts\\python -m pytest -q
```

## Notes

- Check-in allowed between 6:00 and 23:00 (configurable).
- Check-out before 16:00 requires approved half-day permission.
- Late is check-in after 08:00.
- Early checkout is checkout before 17:30.
- Open attendance rows are auto-closed as `system override` when APIs process records.

## Next Improvements (Optional)

- Email/push notifications on request decisions
- QR backup attendance

## Docker Compose (Development)

A development Docker Compose is provided to run PostgreSQL, the backend and the frontend with live code mounts.

1. Build and start services:

```bash
docker compose up --build
```

2. Services exposed:

- Postgres: `localhost:5432`
- Backend (FastAPI): `http://localhost:8000`
- Frontend (Vite): `http://localhost:5173`

3. Environment overrides:

- Backend reads `DATABASE_URL` from the container environment; adjust `docker-compose.yml` if you need different credentials.
- The frontend uses `http://localhost:8000` in the browser, because `backend:8000` only resolves inside the Docker network.

4. Persisted data:

- Postgres data is stored in a Docker volume named `postgres_data`.

Notes:

- Docker Compose provides PostgreSQL and overrides `DATABASE_URL` inside the backend container.
- The `database.sql` file may contain MySQL-specific syntax. If import fails, let SQLAlchemy create tables via `python run.py` inside the backend container.

## Docker Compose (Production)

A production compose file is provided for hosting with:

- PostgreSQL on the private Docker network
- FastAPI backend without reload
- React frontend built as static files and served by Nginx
- Nginx proxying `/api` requests to the backend container

1. Create a production environment file:

```bash
copy env.production.example env.production
```

Edit `env.production` and set strong values for:

- `POSTGRES_PASSWORD`
- `SECRET_KEY`
- `BACKEND_CORS_ORIGINS`, for example `https://your-domain.com`

2. Build and start production services:

```bash
docker compose --env-file env.production -f docker-compose.prod.yml up --build -d
```

3. Open the hosted app:

- Frontend/Nginx: `http://localhost` or your server domain
- Backend health endpoint through Docker: `/api` is proxied internally

4. View logs:

```bash
docker compose --env-file env.production -f docker-compose.prod.yml logs -f
```

5. Stop services:

```bash
docker compose --env-file env.production -f docker-compose.prod.yml down
```

Production notes:

- Do not expose PostgreSQL or the backend directly unless your hosting setup requires it.
- Put HTTPS in front of this stack with your host provider, load balancer, Caddy, Traefik, or Nginx reverse proxy.
- Leave `VITE_API_URL` empty when frontend and API are served from the same domain.
