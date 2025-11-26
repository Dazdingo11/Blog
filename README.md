# Tech Blog — Full-Stack Next.js + Express + MySQL

Modern Instagram-style blog with auth, posts, comments, likes, and messaging. Built for a bootcamp deployment path using free tiers (Railway + Vercel).

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Prerequisites](#prerequisites)
- [Quick Start (Local)](#quick-start-local)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Docs](#docs)

## Overview
Two apps in one repo: an Express API with MySQL (Sequelize) plus a Next.js frontend. Local setup uses Docker for MySQL; production targets Railway (API + DB) and Vercel (Next.js).

## Features
- JWT auth with access + refresh tokens (httpOnly refresh cookie)
- Create/read/update/delete posts with image uploads
- Comments, likes, and user profiles with avatars and bios
- Direct messages with live updates via Socket.IO
- Responsive Next.js UI with infinite scroll, lightbox, and live previews

## Tech Stack
- Frontend: Next.js (App Router), React, Tailwind CSS
- Backend: Node.js, Express, Sequelize, MySQL, Socket.IO
- Tooling: Docker, ESLint, TypeScript on the frontend

## Monorepo Structure
```
/docs              # API contract, data model, deploy checklist, env notes
/backend           # Express API (Node.js + Sequelize + Socket.IO)
/frontend          # Next.js app
docker-compose.yml # Local MySQL for dev
```

## Prerequisites
- Node.js 18+
- npm
- Docker (for local MySQL)

## Quick Start (Local)
1) Start MySQL via Docker:
```bash
docker compose up -d
```
This launches MySQL 8 with a `tech_blog` database.

2) Set env files:
- `backend/.env` (see [Environment Variables](#environment-variables))
- `frontend/.env.local` (see [Environment Variables](#environment-variables))

3) Install dependencies:
```bash
cd backend && npm install
cd ../frontend && npm install
```

4) Run backend (dev):
```bash
cd backend
npm run db:migrate
npm run db:seed   # optional demo data
npm run dev
```
API listens on `http://localhost:3001`.

5) Run frontend (dev):
```bash
cd ../frontend
npm run dev
```
App runs at `http://localhost:3000` (uses `NEXT_PUBLIC_API_BASE_URL` to reach the API).

6) Smoke test:
- Register or log in
- Create/edit/delete a post with an image
- Comment and like; open lightbox; try messaging

## Environment Variables
**Backend (`backend/.env`):**
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=devpass
DB_NAME=tech_blog
# Or use a single connection string (overrides the above):
# DATABASE_URL=mysql://user:pass@host:3306/tech_blog

JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

CLIENT_ORIGIN=http://localhost:3000
```

**Frontend (`frontend/.env.local`):**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
# Or use NEXT_PUBLIC_API_BASE instead; either works.
```
Use only one of `NEXT_PUBLIC_API_BASE_URL` or `NEXT_PUBLIC_API_BASE`.

## Scripts
**Backend**
- `npm run dev` — start API (nodemon)
- `npm run build && npm start` — production
- `npm run db:migrate` — run Sequelize migrations
- `npm run db:seed` — seed demo data

**Frontend**
- `npm run dev` — Next.js dev server
- `npm run build` — production build
- `npm run start` — start built app

## Deployment
- Backend + DB: Railway (or any Node/MySQL host). Set env vars above and ensure `/uploads` is persisted.
- Frontend: Vercel (connects to the GitHub repo; set `NEXT_PUBLIC_API_BASE_URL` to the Railway API URL + `/api`).
- Detailed steps: see `docs/deploy-checklist.md` and `docs/env-and-messaging.md`.

## Docs
- Deploy checklist: `docs/deploy-checklist.md`
- Env and messaging details: `docs/env-and-messaging.md`
- Project summary: `PROJECT_SUMMARY.md`
