# FDR Sentinel

> **SIH 2026 – Problem Statement PS26265**
> Streamline of Security Deposit / FDR Portal — prototype built with AI-assisted coding.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [First-Time Setup](#first-time-setup)
- [Running in Development](#running-in-development)
- [Type Checking](#type-checking)
- [Building for Production](#building-for-production)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)

---

## Tech Stack

| Layer    | Technology                                    |
| -------- | --------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| Routing  | React Router v7                               |
| Icons    | Lucide React                                  |
| Backend  | Node.js, Express 4, TypeScript                |
| Validation | Zod                                         |
| Database | PostgreSQL + Prisma ORM *(coming soon)*       |

---

## Project Structure

```
FDR-Sentinel/
├── client/          # Vite + React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/AppShell.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.example
│   └── vite.config.ts
├── server/          # Express API
│   ├── src/
│   │   ├── config/env.ts
│   │   ├── routes/health.ts
│   │   ├── app.ts
│   │   └── index.ts
│   └── .env.example
├── .gitignore
├── package.json     # Root – concurrently dev script
└── README.md
```

---

## Prerequisites

Make sure these are installed before running anything.

| Tool       | Minimum Version | Check command           |
| ---------- | --------------- | ----------------------- |
| Node.js    | 20 LTS          | `node --version`        |
| npm        | 10              | `npm --version`         |
| PostgreSQL | 15              | `psql --version`        |
| Git        | any             | `git --version`         |

---

## First-Time Setup

Run these commands **once** in Windows PowerShell from the repo root.

### 1 — Install all dependencies

```powershell
# Root (concurrently)
npm install

# Server
npm install --prefix server

# Client
npm install --prefix client
```

### 2 — Configure environment variables

```powershell
# Server
Copy-Item server\.env.example server\.env

# Client (optional during dev — the Vite proxy handles /api calls)
Copy-Item client\.env.example client\.env.local
```

Open `server\.env` in a text editor and update at minimum:

```
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/fdr_sentinel?schema=public
```

### 3 — Create the PostgreSQL database

```powershell
psql -U postgres -c "CREATE DATABASE fdr_sentinel;"
```

---

## Running in Development

From the **repo root**, one command starts both frontend and backend with hot-reload:

```powershell
npm run dev
```

| Service   | URL                          |
| --------- | ---------------------------- |
| Frontend  | http://localhost:5173        |
| API       | http://localhost:4000        |
| Health    | http://localhost:4000/api/health |

> The Vite dev server proxies all `/api/*` requests to the Express server, so the
> frontend never needs to worry about CORS during development.

---

## Type Checking

Run TypeScript type checks (without emitting files) across both packages:

```powershell
npm run typecheck
```

Or individually:

```powershell
npm run typecheck --prefix client
npm run typecheck --prefix server
```

---

## Building for Production

```powershell
npm run build
```

This compiles both the client (Vite bundle → `client/dist/`) and the server
(tsc → `server/dist/`).

---

## API Reference

### `GET /api/health`

Returns a liveness probe. No authentication required.

**Response 200**

```json
{
  "status": "ok",
  "service": "fdr-sentinel-api",
  "timestamp": "2026-10-23T08:00:00.000Z"
}
```

---

## Environment Variables

### Server (`server/.env`)

| Variable       | Required | Default                   | Description                            |
| -------------- | -------- | ------------------------- | -------------------------------------- |
| `NODE_ENV`     | No       | `development`             | Runtime environment                    |
| `PORT`         | No       | `4000`                    | Express listening port                 |
| `DATABASE_URL` | **Yes**  | —                         | Prisma-compatible PostgreSQL URL       |
| `CLIENT_ORIGIN`| No       | `http://localhost:5173`   | Allowed CORS origin                    |

### Client (`client/.env.local`)

| Variable           | Required | Default                 | Description                          |
| ------------------ | -------- | ----------------------- | ------------------------------------ |
| `VITE_API_BASE_URL`| No       | `http://localhost:4000` | API base URL for production builds   |

> All VITE_ variables are inlined into the browser bundle — **never put secrets here**.
