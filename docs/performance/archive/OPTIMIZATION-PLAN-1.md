<!-- This plan is designed to provide the highest performance return on investment (ROI) by focusing first on built-in framework optimizations and then on architectural shifts that resolve systemic bottlenecks. -->

# Optimization Plan 1

## Section 1: Immediate Asset and Bundle Optimization

This section focuses on "quick wins" that significantly improve Core Web Vitals with minimal code changes.

### 1.1 Framework and Asset Tuning

* **Identify and Promote LCP Images:** Add the `priority` attribute to all hero images and above-the-fold media to bypass lazy-loading and improve Largest Contentful Paint (LCP). Use the `sizes` prop to ensure mobile users do not download desktop-resolution assets.

* **Enforce next/font Adoption:** Replace all external font links (e.g., Google Fonts) with `next/font`. This hosts fonts locally, automates preloading, and eliminates layout shifts (CLS) via `display: 'swap'`.

* **Enable Turbopack:** Run `next dev --turbopack` for local development to achieve up to 94% faster code updates and cleaner build outputs for tree-shaking.

### 1.2 Bundle Hygiene and Script Deferral

* **Audit with Bundle Analyzer:** Run `@next/bundle-analyzer` to identify the top three dependencies adding the most weight (e.g., Moment.js, Lodash) and replace them with tree-shakable alternatives like `date-fns`.

* **Optimize Package Imports:** Add `experimental.optimizePackageImports` in `next.config.js` for heavy libraries like Radix UI or Lucide-React to ensure only the used components are bundled.
* **Offload Third-Party Scripts:** Wrap all analytics and marketing tags (GTM, Intercom) in the `next/script` component using the `afterInteractive` or `lazyOnload` strategies to prevent main-thread blocking during initial render.

## Section 2: High-Gain Architectural Refactoring

These changes resolve deep-seated performance issues related to state management and data synchronization.

### 2.1 State Management Migration

* **Decouple Context API:** Identify high-frequency state updates (e.g., real-time counts, form inputs) and migrate them from the Context API to a Zustand store. This stops the "cascade effect" where unrelated children re-render whenever the provider value changes.

* **Implement Atomic Selectors:** Use Zustand selectors (e.g., `useStore(state => state.value)`) to ensure components only re-render when their specific data slice changes, reducing unnecessary renders by up to 90% in complex trees.

### 2.2 Infrastructure and Real-Time Logic

* **Switch to Server-Sent Events (SSE):** For unidirectional updates (notifications, tickers), replace WebSockets or polling with SSE. This is natively supported by Vercel’s "Fluid Compute" and avoids the infrastructure overhead of managing persistent TCP servers.

* **Deploy Edge-Native Databases:** Move latency-critical data to edge databases like Turso (SQLite) or Neon (Serverless Postgres). This places data within <20ms of the user, eliminating cross-regional network penalties for global traffic.

* **Enable Partial Prerendering (PPR):** Enable `experimental.ppr` in `next.config.js` to serve a static HTML shell instantly from the edge while dynamic islands stream in via `<Suspense>`.

I have generated the succinct action plan divided into two sections with two subsections each, ordered by the gain-to-effort ratio. Let me know if you would like me to expand on any specific implementation detail.
