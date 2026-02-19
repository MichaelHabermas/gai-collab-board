## Summary

This document records the pros and cons of the main technology choices (backend, canvas, frontend stack, AI, deployment) in a structured way. It explains what was gained and what was given up (e.g. Firebase vs Supabase, Konva vs Fabric, Kimi vs GPT-4/Claude, Render vs alternatives) and touches on performance vs cost and scalability vs complexity. It supports explaining and defending the stack when questioned.

---

# Identify Tradeoffs

## Backend

- Firebase (chosen):
  - Pros - Mature real-time sync, offline support, Google integration for quick prototyping
  - Cons - NoSQL limits complex queries (e.g., no joins), vendor lock-in risking migration costs, higher costs at scale with pay-as-you-go model.
- Supabase:
  - Pros - SQL for structured data, open-source (self-host), no lock-in
  - Cons - Newer real-time features via Postgres, requires custom caching for offline, smaller ecosystem—skipped for Firebase's maturity.
- AWS/Custom:
  - Pros - High scalability, custom control over infrastructure;
  - Cons - Complex setup, higher dev time/cost—avoided for simpler managed service.

## Frontend Canvas

- Konva.js (chosen):
  - Pros - High performance (60fps with 1000+ objects), layered structure for complex scenes;
  - Cons - Steeper learning for simple edits, buggy drag/drop in some interactions.
- Fabric.js:
  - Pros - Intuitive object manipulation, easy for design apps with filters/serialization;
  - Cons - Slower (200 elements max without lag), less optimized for animations—skipped for Konva's speed.
- PixiJS:
  - Pros - GPU-accelerated for graphics/games;
  - Cons - Limited to one canvas, overkill for simple shapes, high canvas limit issues—avoided for Konva's balance.

## Frontend Stack (Additional)

- React + Vite + Bun + TypeScript + Shadcn + Konva.js + Tailwind v4 (chosen):
  - Pros - Fast dev (Vite HMR, Bun speed), type safety (TS), customizable UI (Shadcn + Tailwind v4 CSS-first), performant canvas (Konva);
  - Cons - Vite SSR weaker than Next.js, Tailwind verbose HTML, Shadcn learning curve, Bun ecosystem maturity gaps.

## AI

- Kimi 2.5 (Moonshot AI Kimi K2.5, Nvidia API, chosen):
  - Pros - Open-source 1T MoE (32B active), 256K context, multimodal (vision-text), agentic (Swarm up to 100 agents), beats/matches top models in coding/math (SWE-bench 76.8%), 10x-76% cheaper, OpenAI-compatible, free dev credits;
  - Cons - Inconsistent real-world vs benchmarks, rate limits on free tier, less reliable than Claude on some reasoning, hallucinations possible.
- GPT-4:
  - Pros - Broad integrations (plugins/APIs), fast prototyping, creative/multimodal;
  - Cons - Less reliable on complex multi-step tasks, higher token costs, shorter context (128K)—skipped for Kimi's cost/efficiency.
- Claude:
  - Pros - Better at reasoning/long contexts (200K), agent SDK for tools, ethical safety;
  - Cons - Newer API, fewer third-party plugins, less creative—avoided for Kimi's multimodal/agentic edge.

## Deployment

- Render (chosen):
  - Pros - Easy Git deploys, static sites and Web Services (e.g. AI proxy), global CDN, scalable with Firebase, free tier, HTTPS;
  - Cons - Cold starts on free tier, bandwidth limits, not ideal for heavy DB/stateful apps.
- Vercel:
  - Pros - Fast git deploys, global CDN, free tier;
  - Cons - No websockets, cold starts, frontend-focused—skipped for Render's proxy + static support.
- Firebase Hosting:
  - Pros - Integrated real-time/auth, scalable;
  - Cons - Limited to static/Functions, Google-dependent—avoided for Render's broader DX.
## Performance vs. Cost

- Firebase/Render low initial cost (free tiers) but scale expenses via usage;
- Kimi 2.5 adds cheap AI but rate limits; Bun/Vite boost dev speed at minor maturity cost vs. heavier stacks.

## Scalability vs. Complexity

- Managed services (Firebase/Render) simpler for quick setup/scaling but less flexible (lock-in, limits);
- vs. custom (AWS) for high load but higher complexity—chosen stack balances simplicity with performance.
