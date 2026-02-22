## Summary

The original tech-stack exploration: backend, frontend, canvas libraries, AI, and deployment options with pros and cons, plus example full stacks. It documents the options that were on the table before locking the stack; it supports explaining how the final choices were narrowed down.

---

# Tech Stack Options Report

## Backend

- Firebase: Pros - Excellent real-time sync, offline support, quick prototyping. Cons - Vendor lock-in, limited queries, scalability costs.
- Supabase: Pros - Open-source, SQL flexibility, real-time via Postgres. Cons - Less mature features, local dev hurdles.
- AWS: Pros - High scalability, custom control, strong security. Cons - Complex setup, higher costs, management overhead.
- Custom WebSocket: Pros - Full customization. Cons - High dev time, maintenance burden.

## Frontend

- React/Vue/Svelte with Canvas Libs:
  - Konva.js: Pros - High performance (60fps with 1000+ objects), layers for complex scenes. Cons - Steeper learning for edits, buggy drag/drop.
  - Fabric.js: Pros - Intuitive object editing, filters/serialization. Cons - Slower (200 elements max without lag).
  - PixiJS: Pros - GPU-accelerated, fast for graphics. Cons - Single canvas limit, overkill for simple shapes.
  - Vanilla JS/HTML5 Canvas: Pros - Lightweight, no dependencies. Cons - Manual implementation, less features.

## AI Integration

- OpenAI GPT-4: Pros - Broad ecosystem, creative/multimodal, fast prototyping. Cons - Hallucinations, shorter context (128K), less reliable on complex tasks.
- Anthropic Claude: Pros - Superior reasoning/coding (80.9% SWE-bench), longer context (200K), ethical safety. Cons - Less creative, fewer plugins.

## Deployment

- Vercel: Pros - Fast git deploys, global CDN, free tier. Cons - No websockets/native DB, cold starts, frontend-focused.
- Firebase Hosting: Pros - Integrated real-time/auth, scalable. Cons - Limited to static/Functions, Google-dependent.
- Render: Pros - Full-stack/websockets support, predictable pricing. Cons - Slower builds, bandwidth limits.

## Full Stacks

- Firebase + React/Konva + GPT-4 + Firebase Hosting: Pros - Seamless real-time/mobile, quick setup. Cons - Lock-in, query limits.
- Supabase + Next.js/Fabric + Claude + Vercel: Pros - Open-source flexibility, strong reasoning. Cons - Maturity gaps, potential dev friction.
- AWS + Vue/Pixi + Custom AI + Render: Pros - Scalable for high load, custom control. Cons - Complex, higher costs.
