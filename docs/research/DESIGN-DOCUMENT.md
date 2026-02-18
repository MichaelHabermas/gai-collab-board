## Summary

This design document captures the original CollabBoard vision and constraints: hard requirements from the project brief (MVP in 24 hours, core features, real-time collaboration, performance, AI agent, AI-first development), the chosen tech stack, and high-level architecture. It reflects the pre-search and locks in design direction; it is the reference for why the product and stack look the way they do.

---

# CollabBoard Design Document

## Overview

CollabBoard is a real-time collaborative whiteboard app inspired by Miro, enabling multiple users to brainstorm, map ideas, and run workshops simultaneously. It features infinite canvas with pan/zoom, object creation/editing, real-time sync, multiplayer cursors, presence awareness, and an AI agent for natural language commands to manipulate the board. Focus on AI-first development, production-scale infrastructure, and meeting hard requirements for MVP and full features. Project completion required for Austin admission.

Hard Requirements (from PDF):

- **MVP (24 hours)**:
  - Infinite board with pan/zoom
  - Sticky notes with editable text
  - at least one shape (e.g., rectangle)
  - create/move/edit objects
  - real-time sync for 2+ users
  - multiplayer cursors with names
  - presence awareness
  - user auth
  - deployed publicly
- **Core Features**:
  - Workspace (infinite board)
  - sticky notes (create/edit/color)
  - shapes (rectangles/circles/lines)
  - connectors (lines/arrows)
  - text elements
  - frames (grouping)
  - transforms (move/resize/rotate)
  - selection (single/multi)
  - operations (delete/duplicate/copy-paste)
- **Real-Time Collaboration**:
  - Cursors (real-time with names)
  - sync (<100ms objects, <50ms cursors)
  - presence
  - conflicts (last-write-wins, documented)
  - resilience (disconnect/reconnect)
  - persistence (state survives)
- **Testing Scenarios**:
  - 2 users editing
  - refresh mid-edit
  - rapid creation/movement
  - network throttling/disconnection
  - 5+ users
- **Performance Targets**:
  - 60 FPS pan/zoom/manipulation
  - <100ms object sync
  - <50ms cursor sync
  - 500+ objects
  - 5+ users without degradation
- **AI Agent**:
  - Support 6+ commands across creation/manipulation/layout/complex (e.g., "Add yellow sticky note", "Arrange in grid", "Create SWOT template")
  - tool schema (e.g., createStickyNote, getBoardState)
  - shared real-time state
  - multi-user commands without conflict
  - <2s response
  - multi-step execution
  - consistent reliability
- **AI-First Development**: Use at least two tools (e.g., Claude Code, Cursor)
  - submit 1-page log (tools/workflow/MCPs/prompts/code %/strengths/learnings)
  - cost analysis (dev spend + projections for 100/1K/10K/100K users)
- **Submission**: GitHub repo (setup/arch/deployed link)
  - 3-5 min demo video
  - Pre-Search doc
  - AI log
  - cost analysis
  - deployed app (5+ users/auth)
  - social post tagging @GauntletAI
- **Build Strategy**:
  - Prioritize cursor sync, object sync, conflicts, persistence, board features, basic/complex AI.
- **Critical Guidance**: Start with multiplayer sync
  - build vertically
  - test multi-browser
  - throttle network
  - test simultaneous AI

Pre-Search completed: Tech stack locked; tradeoffs identified; decisions recorded. This doc incorporates all prior research.

## Tech Stack

- **Backend**:
  - Firebase (Firestore/Realtime DB/Auth) - [Docs](https://firebase.google.com/docs)
- **Frontend**:
  - React - [Docs](https://react.dev/)
  - Vite - [Docs](https://vitejs.dev/)
  - Bun - [Docs](https://bun.sh/docs)
  - TypeScript - [Docs](https://www.typescriptlang.org/docs/)
  - Shadcn - [Docs](https://ui.shadcn.com/docs)
  - Konva.js - [Docs](https://konvajs.org/docs)
  - Tailwind v4 - [Docs](https://tailwindcss.com/docs)
- **AI Integration**:
  - Kimi 2.5 (Moonshot AI via Nvidia API) - [Docs](https://build.nvidia.com/moonshotai/kimi-k2.5)
- **Deployment**:
  - Netlify - [Docs](https://docs.netlify.com/)

## Architecture

Modular design with separate modules: auth, sync, canvas, AI, UI. Follow SOLID principles:

- **Single Responsibility**: Each class/module handles one concern (e.g., CanvasModule for rendering, SyncModule for real-time).
- **Open-Closed**: Extend via interfaces without modifying core (e.g., add new shapes via ShapeInterface).
- **Liskov Substitution**: Substitutable objects (e.g., Rectangle extends Shape).
- **Interface Segregation**: Minimal interfaces (e.g., ITransformable for move/resize only).
- **Dependency Inversion**: Inject dependencies (e.g., AI service via constructor).

High-level flow:

- Frontend:
  - React app with Konva for canvas
  - Shadcn/Tailwind for UI
  - Vite/Bun for fast build
  - TS for safety.
- Backend:
  - Firebase Realtime DB for sync/presence/cursors
  - Firestore for persistence.
- AI:
  - Kimi 2.5 with function calling
  - getBoardState for context
  - multi-step planning.
- Deployment:
  - Netlify for CI/CD, serverless functions for AI calls.
- Auth:
  - Firebase Auth (email/Google).
- Conflicts:
  - Last-write-wins with optimistic updates.
- Resilience:
  - Offline support via Firebase
  - auto-reconnect.
- Testing:
  - Multi-browser
  - network simulation.

File Structure (Monorepo):

- /src
  - /modules/auth
  - /modules/sync
  - /modules/canvas
  - /modules/ai
  - /modules/ui
  - /components
  - /types
- Naming:
  - camelCase for vars/functions, and internal object properties
  - PascalCase for classes/components, Types and Enums
  - snake_case for inter-layer contract object properties
  - IPascalCase for interfaces (ex. IProps {}, ISaveOptions {})
  - CAPITAL_CASE for global constants
- Tooling:
  - ESLint/Prettier
  - Vitest for unit/integration
  - Playwright for e2e
  - 60% MVP coverage.

## Agile Breakdown

Agile methodology: 1-week sprint; vertical slices; daily testing. Breakdown into Epics and User Stories.

### Epic 1: User Authentication and Access

- Story 1: As a user, I can sign up/login with email/Google via Firebase Auth, so I can access the board.
- Story 2: As a user, I can access shared canvases with role-based permissions (viewer/editor), so collaboration is secure.

### Epic 2: Real-Time Collaboration

- Story 1: As a user, I can see real-time cursor movements with names from other users (<50ms latency), so presence is clear.
- Story 2: As a user, I can see who's online via presence indicators, so I know collaborators.
- Story 3: As a user, changes sync instantly (<100ms) for 2+ users, handling conflicts with last-write-wins.
- Story 4: As a user, the board handles disconnect/reconnect gracefully, with offline work and sync on return.
- Story 5: As a user, board state persists after all leave/return or refresh, so data is reliable.

### Epic 3: Canvas Editing and Board Features

- Story 1: As a user, I can pan/zoom an infinite board smoothly at 60 FPS, so navigation is intuitive.
- Story 2: As a user, I can create/edit sticky notes with text/colors, so I can add ideas.
- Story 3: As a user, I can create shapes (rectangles/circles/lines) with colors, so I can draw.
- Story 4: As a user, I can create connectors (lines/arrows) between objects, so I can link ideas.
- Story 5: As a user, I can add standalone text elements, so I can label.
- Story 6: As a user, I can create frames to group content, so organization is easy.
- Story 7: As a user, I can move/resize/rotate objects, so manipulation is flexible.
- Story 8: As a user, I can select single/multi objects (shift-click/drag), so batch operations work.
- Story 9: As a user, I can delete/duplicate/copy-paste objects, so editing is efficient.
- Story 10: As a user, the board handles 500+ objects at 60 FPS with 5+ users, so performance meets targets.

### Epic 4: AI Integration and Board Agent

- Story 1: As a user, I can issue creation commands (e.g., "Add yellow sticky note 'User Research'"), executed via Kimi 2.5 tools, so AI assists.
- Story 2: As a user, I can issue manipulation commands (e.g., "Move pink notes right"), with board state context, so changes apply.
- Story 3: As a user, I can issue layout commands (e.g., "Arrange in grid"), aligning elements, so organization automates.
- Story 4: As a user, I can issue complex commands (e.g., "Create SWOT template"), multi-step with 4 quadrants, so templates generate.
- Story 5: As a user, AI responses are <2s for simple, handles 6+ types reliably, so interaction is fast.
- Story 6: As a user, AI results sync real-time to all, handling simultaneous commands without conflict, so shared state works.

### Epic 5: UI, Deployment, and Polish

- Story 1: As a developer, I can deploy to Netlify with CI/CD, so the app is public and scalable.
- Story 2: As a user, I see responsive UI with Shadcn components and Tailwind styling, so experience is modern.
- Story 3: As a developer, I document AI dev log and cost analysis, so process is tracked.

## AI-First Workflow

Use Cursor and MCP integrations for code gen; prompts like "Implement Konva real-time sync with Firebase". Estimate 70% AI-generated code. Track costs: Free Kimi tier for dev; project $0.01-0.10/month at 100 users (1 command/session, 10 sessions/user, 1K tokens/command).
