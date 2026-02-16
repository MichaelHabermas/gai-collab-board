# Record Architecture Decisions

## Chosen Design

- Firebase backend
- React with Vite + Bun + TypeScript + Shadcn + Konva.js + Tailwind v4 frontend
- Kimi 2.5 AI integration
- Netlify deployment.

## Rationale

- Firebase for mature real-time sync, offline support, quick prototyping with Google integration.
- React stack for fast dev (Vite HMR, Bun speed), type safety (TS), customizable UI (Shadcn + Tailwind v4), performant canvas (Konva 60fps with 1000+ objects).
- Kimi 2.5 for 256K context, multimodal/agentic capabilities, cost-effective (10x cheaper), OpenAI-compatible with free dev credits.
- Netlify for easy Git deploys, auto CI/CD, serverless functions, global CDN, scalable JAMstack with Firebase fit.

## Alternatives Considered

- Supabase (rejected for Firebase's maturity despite SQL flexibility)
- AWS/Custom (avoided for complexity)
- Fabric.js (rejected for slower performance vs. Konva)
- PixiJS (skipped for overkill on simple shapes)
- GPT-4 (skipped for Kimi's efficiency/multimodal edge)
- Claude (avoided for Kimi's agentic/cost advantages)
- Vercel (skipped for Netlify's better Firebase support)
- Firebase Hosting (avoided for Netlify's broader DX)
- Render (rejected for less polished experience).

## Assumptions/Constraints

- Solo dev, 1-week MVP, low budget ($<100/month), 5+ users, no compliance needs
- Prioritize real-time sync/performance over advanced offline/SEO
- Expect rate limits on free AI tier, maturity gaps in Bun/Shadcn.
