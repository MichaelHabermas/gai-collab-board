# Deployment (Netlify)

## Link GitHub Repository

1. In [Netlify](https://app.netlify.com/), create a new site or open your site.
2. Go to **Site settings** → **Build & deploy** → **Build settings**.
3. Under **Repository**, connect your GitHub account and select the CollabBoard repository.
4. Netlify will use the `netlify.toml` in the repo for build command and publish directory.

## Environment Variables

Set the following in **Site settings** → **Environment variables** so the app and serverless functions work in production:

- **Firebase** (from `.env.example`):  
  `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,  
  `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`,  
  `VITE_FIREBASE_DATABASE_URL`
- **AI (server-side)** (not prefixed with `VITE_` so they stay server-side):  
  `GROQ_API_KEY` and/or `NVIDIA_API_KEY` for the AI chat Netlify function.
- **App**:  
  `VITE_AI_PROVIDER` (e.g. `groq`), `VITE_APP_NAME` (optional).

Use the same values as in your local `.env` (see [README](../README.md) Setup). Redeploy after changing variables.
