## Summary

This document describes how CollabBoard is deployed on **Render and Firebase**: building the frontend, running the AI proxy (for Render), and configuring environment variables. It is the minimal runbook for getting the app live and keeping production config consistent.

---

# Deployment (Render + Firebase)

## Frontend (Static Site or Web Service)

1. Build: `bun run build` (output in `dist/`).
2. On Render, create a **Static Site** (or Web Service that serves `dist/`).
3. Set **root directory** and **publish directory** to `dist` (or point your server to `dist`).

## AI Proxy (required for AI commands in production)

The app calls an AI proxy so the API key stays server-side. On Render there are no Netlify Functions, so you must run the included proxy server.

If you see **"AI service returned an unexpected response"** on the deployed site, ensure the proxy Web Service is deployed and `VITE_AI_PROXY_URL` is set on the frontend, then redeploy the frontend (Vite inlines env at build time).

### Option A: Same origin (recommended)

1. Deploy the **proxy server** as a **Web Service** on Render that handles both static and API:
   - Build: `bun run build`
   - Start: run a server that serves `dist/` for static files and forwards `POST /api/ai/v1/*` to the proxy (e.g. use the included proxy and a static file middleware, or put the proxy behind the same host).
2. Or run **two Render services**:
   - **Static Site**: publish `dist/` (no env for AI proxy URL).
   - **Web Service**: run `bun run proxy` (see below). Set env `VITE_AI_PROXY_URL` in the Static Site to the proxy service URL (e.g. `https://your-ai-proxy.onrender.com`).

### Option B: Separate proxy service (two services)

1. Create a second Render **Web Service** for the proxy (or use the repo’s [render.yaml](../render.yaml) blueprint).
2. **Build**: `bun install` (so Bun is available).
3. **Start**: `bun run proxy` (runs [server/index.ts](../server/index.ts)).
4. Set env on the proxy service: `GROQ_API_KEY` or `NVIDIA_API_KEY`, optionally `AI_PROVIDER=groq|nvidia`. Render sets `PORT` automatically.
5. Set env on the **frontend** (Static Site): `VITE_AI_PROXY_URL=https://<your-proxy-service-name>.onrender.com/api/ai/v1` (full base URL including the path). Redeploy the frontend after setting this so the value is inlined at build time.

### Proxy server (in-repo)

- **Start locally**: `GROQ_API_KEY=your_key bun run proxy` (listens on port 3001 by default).
- **Path**: `POST /api/ai/v1/*` (e.g. `/api/ai/v1/chat/completions`) is forwarded to Groq or NVIDIA.
- **Env**: `GROQ_API_KEY` or `NVIDIA_API_KEY`, optionally `AI_PROVIDER=groq|nvidia`.

If the frontend is on the same origin as the proxy, you do not need `VITE_AI_PROXY_URL`; the app defaults to `/api/ai/v1` in production.

## Environment Variables

### Frontend (Render Static Site or Web Service serving the app)

- **Firebase** (from `.env.example`):  
  `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,  
  `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`,  
  `VITE_FIREBASE_DATABASE_URL`
- **AI (optional)**:
  - `VITE_AI_PROXY_URL`: full URL of the AI proxy (e.g. `https://your-proxy.onrender.com/api/ai/v1`) when the proxy is on a different host.
  - `VITE_AI_PROXY_PATH`: override path when proxy is on same origin (default production path is `/api/ai/v1`).
  - `VITE_AI_PROVIDER`: `groq` (default) or `nvidia`.
- **App**: `VITE_APP_NAME` (optional).

### AI proxy service (Render Web Service running `bun run proxy`)

- `GROQ_API_KEY` and/or `NVIDIA_API_KEY` (server-side; not prefixed with `VITE_`).
- `AI_PROVIDER`: optional, `groq` or `nvidia`.
- `PORT`: set by Render.

Use the same Firebase values as in your local `.env`. Redeploy after changing variables.

---

# Netlify (optional)

If you deploy to Netlify instead of Render:

1. Link the GitHub repo; Netlify uses `netlify.toml` for build and publish.
2. Set **Firebase** and **App** env vars as above. For AI, set **server-side** `GROQ_API_KEY` and/or `NVIDIA_API_KEY`; the Netlify function at `/.netlify/functions/ai-chat` will use them.
3. Set `VITE_AI_PROXY_PATH=/.netlify/functions/ai-chat/v1` so the client calls the Netlify function in production.

See the Netlify function source in `netlify/functions/ai-chat.ts`.
