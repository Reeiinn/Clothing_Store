# Clothing Store

A clothing store web app built with the T3 stack. The API is tRPC inside the Next.js app.

## Project structure

```
ClothingStore/
├── package.json        ← root scripts
└── frontend/           ← Next.js app
    ├── prisma/
    ├── src/app/
    ├── src/server/     ← tRPC routers, auth, db
    └── package.json
```

| Part | Stack                                                                     | Port |
| ---- | ------------------------------------------------------------------------- | ---- |
| App  | Next.js 15, React 19, TypeScript, tRPC, Prisma, NextAuth, Tailwind CSS v4 | 3000 |

## Setup

Requires Node.js 20+ and a PostgreSQL database.

```bash
npm run install:all
```

Copy `frontend/.env.example` to `frontend/.env` and fill in `AUTH_SECRET` (`npx auth secret`), `DATABASE_URL` and the `SEED_*` passwords. `frontend/start-database.sh` starts a local Postgres in Docker.

Create the tables and seed sample data (the seed wipes products and orders):

```bash
cd frontend
npx prisma migrate dev
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Seeded accounts: `admin@stylegrid.test` (admin) and `customer@stylegrid.test`.
