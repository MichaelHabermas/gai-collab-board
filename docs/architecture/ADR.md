## Summary

This file records the final architecture decisions: Firebase, React/Vite/Bun/TypeScript/Shadcn/Konva/Tailwind v4, Groq, Render—with rationale, alternatives considered, and assumptions/constraints. It is the decision log that answers "what we chose and why," so the architecture can be explained and future changes can be compared against these decisions.

---

# Record Architecture Decisions

## Chosen Design

- Firebase backend
- React with Vite + Bun + TypeScript + Shadcn + Konva.js + Tailwind v4 frontend
- Groq AI integration
- Render deployment.

## Rationale

- Firebase for mature real-time sync, offline support, quick prototyping with Google integration.
- React stack for fast dev (Vite HMR, Bun speed), type safety (TS), customizable UI (Shadcn + Tailwind v4), performant canvas (Konva 60fps with 1000+ objects).
- Groq for fast inference, cost-effective free tier, OpenAI-compatible API with server-side proxy.
- Render for Git deploys, static sites and Web Services (e.g. AI proxy), global CDN, scalable with Firebase.

## Alternatives Considered

- Supabase (rejected for Firebase's maturity despite SQL flexibility)
- AWS/Custom (avoided for complexity)
- Fabric.js (rejected for slower performance vs. Konva)
- PixiJS (skipped for overkill on simple shapes)
- GPT-4 (skipped for Groq's efficiency and free tier)
- Claude (avoided for Groq's cost advantages)
- Vercel (skipped for Render's proxy + static support)
- Firebase Hosting (avoided for Render's broader DX)

## Assumptions/Constraints

- Solo dev, 1-week MVP, low budget ($<100/month), 5+ users, no compliance needs
- Prioritize real-time sync/performance over advanced offline/SEO
- Expect rate limits on free AI tier, maturity gaps in Bun/Shadcn.
