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

## Getting started

Requires Node.js 20 or later.

Install dependencies for the root, frontend and backend:

```bash
npm run install:all
```

Start the frontend and backend together:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000 (health check at `/api/health`)

## Scripts

Run these from the root folder:

| Script                | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run install:all` | Installs dependencies in root, frontend and backend |
| `npm run dev`         | Starts both apps in watch mode                 |
| `npm run build`       | Builds the frontend, then the backend          |

Each app can also be run on its own from its folder, for example `npm run dev` inside `frontend/` or `backend/`.

## Backend configuration

The backend reads two environment variables (defaults shown in `backend/.env.example`):

| Variable       | Default                 | Purpose                                   |
| -------------- | ----------------------- | ----------------------------------------- |
| `PORT`         | `4000`                  | Port the API listens on                   |
| `FRONTEND_URL` | `http://localhost:3000` | Origin allowed to call the API (CORS)     |

A `.env` file is not loaded automatically yet; set these as environment variables or add `dotenv`.
