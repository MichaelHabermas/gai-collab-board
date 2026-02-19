## Summary

This report summarizes the chosen tech stack (Firebase, React/Vite/Bun/TS/Shadcn/Konva/Tailwind v4, Kimi 2.5, Render) with pros and cons per layer and for the full stack. It is the concise "what we use and why" reference that complements the tradeoffs and ADR documents.

---

# Tech Stack Report

## Backend

* Firebase: Pros - Excellent real-time sync, offline support, quick prototyping. Cons - Vendor lock-in, limited queries, scalability costs.

## Frontend

* React + Vite + Bun + TypeScript + Shadcn + Konva.js + Tailwind v4:
  * Pros - Fast dev (Vite HMR, Bun speed), type safety (TS), customizable UI (Shadcn + Tailwind v4 CSS-first, Vite plugin), performant canvas (Konva 60fps), minimal deps, scalable for large apps.
  * Cons - Vite SSR weaker than Next.js, Tailwind verbose HTML, Shadcn learning curve, Bun ecosystem maturity gaps, migration from older tools.

## AI Integration

* Kimi 2.5 (Moonshot AI Kimi K2.5, free Nvidia API):
  * Pros - Open-source 1T MoE (32B active), 256K context, multimodal (vision-text), agentic (Swarm up to 100 agents), beats/matches GPT-5.2/Claude 4.5 in coding/math/agents (SWE-bench 76.8%), 10x-76% cheaper ($0.60/M input, $3/M output), OpenAI-compatible, free dev credits.
  * Cons - Inconsistent real-world vs benchmarks, rate limits on free tier, less reliable than Claude on some reasoning, hallucinations possible.

## Deployment

* Render:
  * Pros - Easy Git deploys, static sites and Web Services, in-repo AI proxy, global CDN, scalable with Firebase, free tier, HTTPS.
  * Cons - Cold starts on free tier, bandwidth limits, not ideal for heavy DB/stateful apps.

## Full Stack

* Firebase + React/Vite/Bun/TS/Shadcn/Konva/Tailwind v4 + Kimi 2.5 + Render:
  * Pros - Seamless real-time/AI integration, fast prototyping/dev, cost-effective, open-source flexibility, performant UI/canvas.
  * Cons - Vendor lock-in (Firebase), potential rate limits/dev friction, maturity gaps in Bun/Shadcn.
