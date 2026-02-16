# Identify Tradeoffs

## Backend

- Firebase: Pros - Mature real-time sync, offline support, Google integration; Cons - NoSQL limits complex queries, vendor lock-in, higher costs at scale.
- Supabase: Pros - SQL for structured data, open-source (self-host), no lock-in; Cons - Newer real-time features, requires caching for offline, smaller ecosystem.
- AWS/Custom: Pros - High scalability, custom control; Cons - Complex setup, higher dev time/cost.

## Frontend Canvas

- Konva.js: Pros - High performance (60fps with 1000+ objects), layered structure; Cons - Steeper learning for simple edits, buggy drag/drop.
- Fabric.js: Pros - Intuitive object manipulation, easy for design apps; Cons - Slower (200 elements max without lag), less optimized for animations.
- PixiJS: Pros - GPU-accelerated for graphics/games; Cons - Limited to one canvas, overkill for simple shapes, high canvas limit issues.

## AI

- GPT-4: Pros - Broad integrations (plugins/APIs), fast prototyping; Cons - Less reliable on complex multi-step tasks, higher token costs.
- Claude: Pros - Better at reasoning/long contexts, agent SDK for tools; Cons - Newer API, fewer third-party plugins.

## Deployment

- Vercel: Pros - Fast git deploys, global CDN, free tier; Cons - No websockets, cold starts, frontend-focused.
- Firebase Hosting: Pros - Integrated real-time/auth, scalable; Cons - Limited to static/Functions, Google-dependent.
- Render: Pros - Websockets/stateful support, autoscaling; Cons - Usage-based billing, less polished DX.

## Performance vs. cost

Firebase/Supabase low initial cost but scale expenses; AWS higher upfront but predictable.

## Scalability vs. complexity

Managed services (Vercel) simpler but less flexible than custom.
