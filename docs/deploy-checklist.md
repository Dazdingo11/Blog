# Deploy Checklist — Railway (Backend + MySQL) & Vercel (Frontend)

This replaces any Render-specific steps.

---

## Services
- **Railway Project**
  - **MySQL Plugin** (managed MySQL instance)
  - **Backend Service** (Express app)
- **Vercel Project**
  - **Frontend** (Next.js)

---

## 1) Railway — MySQL
1. Create a new Railway project.
2. Add a **MySQL** plugin.
3. Note the credentials (host, port, db, user, password). You’ll paste these into the Backend Service env.

**Required envs for backend (Railway → Variables):**
```
PORT=3001
NODE_ENV=production

DB_HOST=<railway-mysql-host>
DB_PORT=3306
DB_NAME=<railway-db-name>
DB_USER=<railway-user>
DB_PASSWORD=<railway-password>

JWT_ACCESS_SECRET=<set-strong-secret>
JWT_REFRESH_SECRET=<set-strong-secret>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# CORS
CLIENT_ORIGIN=https://<your-frontend-domain>   # Vercel URL
```

---

## 2) Railway — Backend Service
1. Create a **Service** from your GitHub repo (the `/backend` directory).
2. **Build command:** `npm ci && npm run build`
3. **Start command:** `node dist/server.js`
4. Set the environment variables listed above.
5. Open a **Shell** and run once:
```
npm run db:migrate
npm run db:seed   # optional
```
6. Confirm the Health endpoint returns 200 (e.g., `/api/health`).

**Output:** you get a public Railway URL for your backend, e.g. `https://blog-api.up.railway.app`

---

## 3) Vercel — Frontend
1. Import the repo and select the `/frontend` directory.
2. **Framework Preset:** Next.js
3. **Environment Variables (Vercel → Project Settings → Env):**
```
NEXT_PUBLIC_API_BASE_URL=https://<your-backend-on-railway>/api
```
4. **Build command:** default
5. **Output:** default
6. Deploy. You’ll get a Vercel domain like `https://your-blog-frontend.vercel.app`.

---

## 4) Final checks
- **CORS:** `CLIENT_ORIGIN` on backend must match the Vercel URL exactly (https + domain).
- **JWT:** both secrets set and long/random.
- **MySQL:** migrations applied; tables exist.
- **E2E smoke test:** Register → Login → CRUD → Category filter.

---

## Rollback & safety
- Keep **feature flags** for optional features (e.g., RAG).
- Database: enable backups in Railway.
- Versioned deploys: promote only after passing smoke tests.

---

## Optional — RAG (later)
- Vector DB: Qdrant or Pinecone.
- New envs on backend: VECTOR_STORE_URL, VECTOR_STORE_API_KEY, OPENAI_API_KEY.
- Endpoints: `/api/search/semantic`, `/api/ask`.
- Keep behind `RAG_ENABLED=false` until verified.
