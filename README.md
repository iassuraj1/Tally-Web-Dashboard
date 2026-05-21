# Suraj Prime Tally

A Tally-style accounting web app built with React, Express, and PostgreSQL.

## Run Locally

```bash
npm run install-all
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend health check:

```text
http://localhost:5000/api/health
```

Copy `server/.env.example` to `server/.env` and set your PostgreSQL `DATABASE_URL` and JWT secret.

## Documentation

Read [docs/WORKING_GUIDE.md](docs/WORKING_GUIDE.md) for setup, database structure, multi-user roles, API examples, and troubleshooting. For existing MongoDB data, use [docs/POSTGRES_MIGRATION.md](docs/POSTGRES_MIGRATION.md).
