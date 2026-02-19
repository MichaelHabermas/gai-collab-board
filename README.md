# CollabBoard

A real-time collaborative whiteboard application inspired by Miro, enabling
multiple users to brainstorm, map ideas, and run workshops simultaneously. Built
with an AI-first development approach.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

- **Deployed site:** [collabboard-1-ovl2.onrender.com](https://collabboard-1-ovl2.onrender.com/)
- **Repository:** [github.com/MichaelHabermas/CollabBoard](https://github.com/MichaelHabermas/CollabBoard)

## Features

### Core Whiteboard

- **Infinite Canvas** — Smooth pan and zoom at 60 FPS
- **Sticky Notes** — Create, edit text, and change colors
- **Shapes** — Rectangles, circles, and lines with customizable colors
- **Connectors** — Lines and arrows linking objects together
- **Text Elements** — Standalone text labels
- **Frames** — Group and organize content areas
- **Transforms** — Move, resize, and rotate objects
- **Selection** — Single and multi-select (shift-click, drag-to-select)
- **Operations** — Delete, duplicate, copy/paste

### Real-Time Collaboration

- **Multiplayer Cursors** — See other users' cursors with Name labels in
  real-time
- **Presence Awareness** — Know who's currently on the board
- **Instant Sync** — Object changes appear for all users (<100ms latency)
- **Conflict Resolution** — Last-write-wins with optimistic updates
- **Resilience** — Graceful disconnect/reconnect handling
- **Persistence** — Board state survives all users leaving and returning

### AI Board Agent

Natural language commands to manipulate the board:

- **Creation** — "Add a yellow sticky note that says 'User Research'"
- **Manipulation** — "Move all pink sticky notes to the right side"
- **Layout** — "Arrange these sticky notes in a grid"
- **Complex** — "Create a SWOT analysis template with four quadrants"

## Tech Stack

| Layer              | Technology                                                        |
| ------------------ | ----------------------------------------------------------------- |
| **Backend**        | Firebase (Firestore, Realtime DB, Auth)                           |
| **Frontend**       | React 19 + Vite + Bun + TypeScript                                |
| **UI Components**  | Shadcn/ui + Tailwind CSS v4                                       |
| **Canvas**         | Konva.js                                                          |
| **AI Integration** | Groq (free tier, default) or secondary provider (e.g. NVIDIA API) |
| **Deployment**     | Netlify                                                           |
| **Testing**        | Vitest + Playwright                                               |
| **Linting**        | ESLint + Prettier                                                 |

## Prerequisites

- [Bun](https://bun.sh/) v1.0+ (recommended) or Node.js v20+
- [Git](https://git-scm.com/)
- Firebase account
- Groq API key (free at [console.groq.com](https://console.groq.com)) or
  secondary provider API key (e.g. NVIDIA)

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/MichaelHabermas/CollabBoard.git
cd CollabBoard
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com

# AI: Groq (recommended, free) or secondary provider. Production: set GROQ_API_KEY or NVIDIA_API_KEY in Netlify.
VITE_AI_PROVIDER=groq
VITE_GROQ_API_KEY=your_groq_api_key
# VITE_NVIDIA_API_KEY=your_secondary_provider_key
```

### 4. Firebase Setup

1. Create a new project at
   [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** (Email/Password and Google providers)
3. Create a **Firestore Database** in production mode
4. Create a **Realtime Database** for presence/cursors
5. Copy your config values to the `.env` file

### 5. Start Development Server

```bash
bun run dev
```

The app will be available at `http://localhost:5173`

## Deployment

To deploy to Netlify, link the GitHub repository in Netlify (Site settings → Build & deploy → Repository) and configure environment variables (Site settings → Environment variables). See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for details.

## Usage

### Getting Started

1. **Sign Up / Login** — Create an account or sign in with Google
2. **Create a Board** — Start a new whiteboard or join an existing one
3. **Invite Collaborators** — Share the board link with teammates
4. **Start Creating** — Use the toolbar to add sticky notes, shapes, and more

### Keyboard Shortcuts

| Action       | Shortcut                           |
| ------------ | ---------------------------------- |
| Pan          | Click + Drag (on empty space)      |
| Zoom         | Scroll wheel                       |
| Select       | Click on object                    |
| Multi-select | Shift + Click / Drag selection box |
| Delete       | Delete / Backspace                 |
| Duplicate    | Ctrl/Cmd + D                       |
| Copy         | Ctrl/Cmd + C                       |
| Paste        | Ctrl/Cmd + V                       |
| Deselect     | Escape                             |

Shortcuts are disabled when focus is in an input or text-edit field.

### AI Commands

Open the AI chat panel and type natural language commands:

```bash
"Add a blue sticky note with 'Meeting Notes'"
"Create a 3x3 grid of sticky notes"
"Move all rectangles to the left"
"Build a user journey map with 5 stages"
"Create a retrospective board with three columns"
```

## Project Structure

```bash
CollabBoard/
├── src/
│   ├── modules/
│   │   ├── auth/        # Authentication logic
│   │   ├── sync/        # Real-time synchronization
│   │   ├── ai/          # AI agent integration
│   │   └── ui/          # UI utilities
│   ├── components/      # React components (board, canvas, auth, ai, ui)
│   ├── hooks/           # React hooks (canvas, selection, presence, AI)
│   ├── lib/             # Firebase, AI client, utilities
│   └── types/           # TypeScript type definitions
├── netlify/functions/   # Serverless functions (e.g. AI chat)
├── docs/
│   ├── guides/          # Development, Firebase, testing, AI integration
│   └── research/        # Design documents and research
├── scripts/             # CLI scripts (e.g. test-ai-connection)
├── public/              # Static assets
└── tests/               # Unit, integration, and E2E tests
```

## Scripts

```bash
# Development
bun run dev             # Start dev server
bun run build           # Build for production
bun run preview         # Preview production build

# Testing
bun run test            # Run unit tests (watch)
bun run test:run        # Run unit tests once
bun run test:e2e        # Run Playwright E2E tests (installs browsers if needed)
bun run test:e2e:ui     # Run E2E tests with Playwright UI
bun run test:coverage   # Run tests with coverage
bun run test:ai-connection  # Test AI provider connectivity

# Quality
bun run typecheck       # TypeScript check
bun run lint            # Run ESLint
bun run lint:fix        # ESLint with auto-fix
bun run format          # Format with Prettier
bun run validate        # typecheck + lint + test:run
```

E2E tests run automatically on push/PR to `development` or `main` (see [.github/workflows/e2e.yml](.github/workflows/e2e.yml)). Configure Firebase secrets in the repo for overlay/sign-up tests. If `playwright install` fails (e.g. proxy), run it once with network access or set `HTTP_PROXY`/`HTTPS_PROXY`.

## Documentation

- [Deployment](docs/DEPLOYMENT.md) — Netlify setup and environment variables
- [Guides](docs/guides/README.md) — Development environment, Firebase, testing, AI integration, Konva, Tailwind/Shadcn
- [AI Cost Analysis](docs/AI-COST-ANALYSIS.md) — AI usage and cost notes

## Architecture

CollabBoard follows a modular architecture with SOLID principles:

- **Single Responsibility** — Each module handles one concern
- **Open-Closed** — Extend via interfaces without modifying core
- **Liskov Substitution** — Substitutable objects (e.g., shapes)
- **Interface Segregation** — Minimal, focused interfaces
- **Dependency Inversion** — Dependencies injected via constructors

### Data Flow

```mermaid
flowchart LR
    A[User Action] --> B[Local State]
    B --> C[Firebase Sync]
    C --> D[Other Users]
    C -.->|Conflict| E[Last-Write-Wins]
    E -.-> B
```

## Performance Targets

| Metric              | Target                                |
| ------------------- | ------------------------------------- |
| Frame rate          | 60 FPS during pan, zoom, manipulation |
| Object sync latency | <100ms                                |
| Cursor sync latency | <50ms                                 |
| Object capacity     | 500+ objects                          |
| Concurrent users    | 5+ without degradation                |

## Contributing

1. Fork the repository
2. Create a feature branch from `development`: `git checkout development && git pull && git checkout -b feature/your-feature`
3. Make your changes with descriptive commits
4. Write tests for new functionality
5. Run validation: `bun run validate` (or `bun run test:run && bun run lint`)
6. Submit a pull request to `development` (do not target `main`)

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file
for details.

## Acknowledgments

- [Miro](https://miro.com/) for inspiration
- [Konva.js](https://konvajs.org/) for the canvas library
- [Firebase](https://firebase.google.com/) for real-time infrastructure
- [Shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
