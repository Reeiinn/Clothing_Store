# Clothing Store

A web app split into a separate frontend and backend.

## Project structure

```
ClothingStore/
├── package.json        ← root scripts (runs both apps)
├── frontend/           ← Next.js app
│   ├── src/app/
│   ├── public/
│   └── package.json
└── backend/            ← Node + Express + TypeScript API
    ├── src/index.ts
    ├── .env.example
    ├── tsconfig.json
    └── package.json
```

| Part     | Stack                                                          | Port |
| -------- | -------------------------------------------------------------- | ---- |
| Frontend | Next.js 16, React 19, TypeScript, App Router, Tailwind CSS v4 | 3000 |
| Backend  | Node, Express, TypeScript                                      | 4000 |

## Setup

Requires Node.js 20+ and a PostgreSQL database.

```bash
npm run install:all
```

Copy `frontend/.env.example` to `frontend/.env` and fill in `AUTH_SECRET` (`npx auth secret`) and `DATABASE_URL`. `frontend/start-database.sh` starts a local Postgres in Docker.

Push the schema to the database:

```bash
npm run db:push --prefix frontend
```

Start both apps:

```bash
npm run dev
```

## Backend configuration

| Variable       | Default                 |
| -------------- | ----------------------- |
| `PORT`         | `4000`                  |
| `FRONTEND_URL` | `http://localhost:3000` |
