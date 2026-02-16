# Record Architecture Decisions

## Chosen Design: Supabase backend, React with Konva.js frontend, Claude AI integration, Vercel deployment.

- Rationale: Supabase for real-time SQL sync without lock-in, supports presence/cursors (low latency <100ms). Konva for smooth pan/zoom/500+ objects at 60fps. Claude for multi-step AI commands (e.g., SWOT templates) via function calling. Vercel for quick deploys, edge caching, fits frontend-heavy app.
- Alternatives Considered: Firebase (chosen over for SQL preference); Fabric.js (rejected for performance); GPT-4 (Claude better reasoning); Render (Vercel simpler for prototypes).
- Assumptions/Constraints: Solo dev, 1-week MVP, low budget ($<100/month), 5+ users, no compliance needs. Prioritize sync resilience over advanced SEO/offline.
