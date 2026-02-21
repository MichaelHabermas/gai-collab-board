# Product Requirements Document (PRD): Integration of Unified JSON State Management with Firebase and AI CRUD for Konva Whiteboard App

## Document Overview

This PRD outlines the requirements and implementation plan for enhancing an existing Konva.js-based whiteboard application (Miro clone) with a unified JSON state management system. The system decouples state from the Konva view layer, uses world coordinates for consistency, integrates Firebase Firestore for persistent storage and Realtime Database (RTDB) for high-frequency sync, and exposes an AI-friendly interface for automating CRUD operations on board elements.

### Key Objectives

- Maintain a clean, minimal JSON state for easy persistence, sharing (frontend-backend), and AI processing.
- Support real-time collaboration with low-latency updates.
- Ensure modular design following SOLID principles:
  - **Single Responsibility Principle (SRP)**: Each class/module handles one concern (e.g., state management vs. rendering).
  - **Open-Closed Principle (OCP)**: Extendable without modifying core classes (e.g., via interfaces for repositories).
  - **Liskov Substitution Principle (LSP)**: Subclasses (e.g., FirestoreRepo) interchangeable with base interfaces.
  - **Interface Segregation Principle (ISP)**: Small, focused interfaces (e.g., IBoardRepository only exposes CRUD methods).
  - **Dependency Inversion Principle (DIP)**: High-level modules depend on abstractions (e.g., BoardManager injects repository interface).
- Enable AI agents to perform CRUD by passing JSON state as context and receiving command responses.

### Assumptions

- Existing app uses Konva.js for rendering.
- Firebase project is set up (Firestore and RTDB enabled).
- TypeScript is used for implementation.
- App supports zooming, panning, and basic shapes (rect, circle, text, line).
- No major refactoring of existing Konva stage is required beyond integration points.

### Scope

- In: State decoupling, coordinate conversions, Firebase sync, AI CRUD bridge.
- Out: User authentication, full AI bot implementation (only the interface), advanced features like undo/redo.

### Success Metrics

- Real-time sync: Changes propagate to all clients in <500ms.
- AI integration: AI can parse JSON and return valid commands without errors.
- Performance: Handle 1,000+ elements without lag on standard hardware.

## Epics and Breakdown

### Epic 1: State Orchestration and Coordinate Mapping ✅ COMPLETED

**Goal**: Decouple board state from Konva's internal tree, using a JSON-based model with world coordinates for consistency across views and devices. This ensures AI can manipulate state without Konva dependencies.

**User Stories**:

- As a developer, I want a centralized JSON state store so that all board elements are managed independently of the UI rendering.
- As a user, I want consistent positioning across zoom/pan levels so that elements appear in the same relative space regardless of viewport.
- As an AI agent, I want a clean JSON representation of the board so that I can perform CRUD operations without parsing Konva-specific data.

**Features**:

- JSON schema for board state (elements as array/map with world coords).
- Utility for screen-to-world and world-to-screen coordinate conversions.
- State manager class for in-memory handling and updates.

**Feature Branches and Commits**:

- Branch: `feat/state-orchestration`
  - Commit: `feat: define BoardState and BoardElement interfaces in types.ts`
  - Commit: `feat: implement CoordinateUtils class with screenToWorld and worldToScreen methods`
  - Commit: `feat: create BoardManager class with initial state and getter for elements JSON`
  - Commit: `refactor: update existing Konva init to use BoardManager state for initial render`

**Sub-Tasks**:

1. Define types: Create `types.ts` with `BoardElement` (id, type, x/y in world coords, optional props) and `BoardState` (elements map, view config for zoom/pan). (SRP: Types only define structure.)
2. Implement conversions: In `CoordinateUtils.ts`, add static methods using Konva's stage APIs (e.g., `stage.getAbsoluteTransform().invert()` for screen-to-world). Test with sample points.
3. Build state manager: In `BoardManager.ts`, initialize state, add methods like `getElementsJSON()` for serialization. Ensure DIP by injecting future repository.
4. Integrate with existing app: Modify Konva stage setup to map `BoardState.elements` to Konva shapes (e.g., loop: `new Konva.Rect({...el})`). Add event listeners for dragend to update state via CoordinateUtils.
5. Unit tests: Test conversions (e.g., zoom=2, panX=100 should convert correctly). Mock state updates.

### Epic 2: Firebase Hybrid Persistence Layer ✅ COMPLETED

**Goal**: Provide real-time persistence and sync using Firestore for structured, persistent elements and RTDB for ephemeral, high-frequency data. This enables collaborative editing with optimized performance.

**User Stories**:

- As a user, I want my board changes to sync in real-time with other users so that collaboration feels seamless.
- As a developer, I want throttled updates during interactions so that Firebase costs and performance are optimized.
- As an admin, I want data stored in world coordinates so that sync is viewport-independent.

**Features**:

- Repository interface for abstracting persistence.
- Firestore implementation for CRUD on persistent elements.
- RTDB implementation for live drags/cursors with throttling.
- Real-time listeners to update local state from Firebase.

**Feature Branches and Commits**:

- Branch: `feat/firebase-persistence`
  - Commit: `feat: define IBoardRepository interface with CRUD and onStateChange methods`
  - Commit: `feat: implement FirestoreBoardRepo with onSnapshot listener and update/delete methods`
  - Commit: `feat: implement RealtimeSyncRepo with onValue listener, throttled updates, and cursor handling`
  - Commit: `refactor: inject IBoardRepository into BoardManager and handle state sync`
  - Commit: `feat: add throttling utility (e.g., lodash.throttle) for RTDB drag updates`

**Sub-Tasks**:

1. Define interface: In `types.ts`, add `IBoardRepository` with methods like `updateElement(id, data)`, `deleteElement(id)`, `onStateChange(callback)`. (ISP: Focused on board ops only.)
2. Firestore repo: In `FirestoreBoardRepo.ts`, set up collection (e.g., "whiteboards/{boardId}/elements"), use `onSnapshot` to build `Record<string, BoardElement>` and callback. Implement `updateDoc` and `deleteDoc`. (LSP: Fully substitutes base interface.)
3. RTDB repo: In `RealtimeSyncRepo.ts`, use `ref(db, 'boardId/elements')`, `onValue` for full sync, `update()` for changes. Add throttle (50-100ms) for dragmove events. Handle separate "cursors" path.
4. Hybrid integration: In BoardManager, inject repo via constructor (DIP). On local changes, call repo methods; on remote changes via callback, update state without redraw loops.
5. Optimize: Add delta handling in listeners (e.g., query `where("updatedAt", ">", lastTimestamp)` for Firestore). Test offline support.
6. Unit/integration tests: Mock Firebase SDK, simulate snapshots, verify state updates propagate to BoardManager.

### Epic 3: AI Agentic CRUD Interface ✅ COMPLETED

**Goal**: Expose board state as JSON for AI consumption and process AI-returned commands to automate board modifications via Firebase.

**User Stories**:

- As an AI agent, I want to receive board JSON context so that I can analyze and suggest CRUD operations.
- As a user, I want AI-assisted board management (e.g., "add note at center") so that repetitive tasks are automated.
- As a developer, I want a command pattern for AI responses so that integration is extensible and error-proof.

**Features**:

- Serializer to export clean JSON (strip Konva noise).
- Command dispatcher to handle AI outputs (e.g., {action: 'UPDATE', payload: {...}}).
- Endpoint or socket for passing state to AI and applying responses.

**Feature Branches and Commits**:

- Branch: `feat/ai-crud-bridge`
  - Commit: `feat: add applyCommand method to BoardManager for handling AI actions`
  - Commit: `feat: implement state serializer in BoardManager (getElementsJSON)`
  - Commit: `feat: create AI bridge endpoint (e.g., REST or WebSocket) to send JSON and receive commands`
  - Commit: `refactor: integrate AI commands with Firebase repos for persistence`
  - Commit: `feat: add validation for AI command payloads`

**Sub-Tasks**:

1. Serializer: Enhance `getElementsJSON()` to return stringified array of elements (OCP: Extendable for future props).
2. Command handler: In BoardManager, add `applyCommand(action, payload)` with switch for 'CREATE', 'UPDATE', 'DELETE'. Route to repo methods. (SRP: Only dispatches, doesn't persist.)
3. AI interface: Set up a simple function or endpoint (e.g., async `sendToAI(json: string)` that prompts AI with "Analyze this board: [json]. Return commands: [...]"). Parse response and call applyCommand.
4. Integration: On user trigger (e.g., button), get JSON, send to AI, apply returned commands. Ensure world coords in commands.
5. Error handling: Validate commands (e.g., id exists for UPDATE). Log failures without crashing app.
6. Tests: Mock AI responses, verify commands update state and Firebase. End-to-end: Simulate "add rect" command.

## Implementation Roadmap

1. **Setup**: Merge branches sequentially: state-orchestration → firebase-persistence → ai-crud-bridge.
2. **Testing**: Unit (Jest/Mocha), integration (Firebase emulators), e2e (Cypress for Konva interactions).
3. **Deployment**: Update Firebase rules for security (e.g., authenticated writes). Monitor costs with small boards first.
4. **Risks/Mitigations**: High write frequency → Throttling. Large boards → Pagination in listeners. AI hallucinations → Strict command validation.

This PRD provides a modular, SOLID-compliant blueprint. Proceed to coding by creating the first branch.
