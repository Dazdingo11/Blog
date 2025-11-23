# Environment & Messaging Notes

## Environment variables
- **Backend**
  - `PORT` (default 3001)
  - `NODE_ENV` (`development` | `production`)
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` (prefers `DB_PASSWORD`, falls back to `DB_PASS`/`MYSQL_PASSWORD`), `DB_NAME`
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  - `JWT_ACCESS_TTL` (e.g., `15m`), `JWT_REFRESH_TTL` (e.g., `7d`)
  - `CLIENT_ORIGIN` (CORS + Socket.IO origin, e.g., `http://localhost:3000`)
  - `COOKIE_SAME_SITE` (`lax` for local, `none` for cross-site prod), `COOKIE_SECURE` (`false` locally, `true` for HTTPS)
- **Frontend**
  - `NEXT_PUBLIC_API_BASE` or `NEXT_PUBLIC_API_BASE_URL` (e.g., `http://localhost:3001/api`)

## Messaging REST
- `GET /api/conversations` — list conversations with `otherParticipant` and `lastMessage` (deduped one per other user).
- `POST /api/conversations` — create or reuse a 1:1 conversation: `{ userId }` → `{ id }`.
- `GET /api/conversations/:id/messages` — latest messages, `limit` (default 25, max 100), `beforeId` for older pages; includes `isMine`.
- `POST /api/conversations/:id/messages` — send: `{ body }` → created message.
- `DELETE /api/conversations/:id` — delete conversation for all participants.
- `GET /api/users/search?q=` — search users by name/email to start a chat (excludes self).

## Socket.IO events
- Client connects with `auth: { token: <access JWT> }`; server validates and joins room `user:<id>`.
- `message:new` — payload `{ conversationId, message }`, delivered to all participants; `message.isMine` is set per recipient.
- `conversation:deleted` — payload `{ conversationId }`, remove from lists and clear if active.

## Local dev quickstart
1) `docker compose up -d` (MySQL)
2) Backend: `cd backend && npm install && npm run db:migrate && npm run dev`
3) Frontend: `cd frontend && npm install && npm run dev` (set API base env first)
