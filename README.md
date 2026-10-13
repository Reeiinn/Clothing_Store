# Clothing Store

| Part        | Stack                                                                 | Port |
| ----------- | --------------------------------------------------------------------- | ---- |
| `frontend/` | T3 Stack: Next.js 15, tRPC, Prisma (PostgreSQL), NextAuth, Tailwind v4 | 3000 |
| `backend/`  | Node, Express, TypeScript                                             | 4000 |

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
