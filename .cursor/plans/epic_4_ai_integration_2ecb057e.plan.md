---
name: Epic 4 AI Integration
overview: Implement the AI Integration and Board Agent (Epic 4) following the PRD specifications. This includes setting up the Kimi 2.5 API client, defining tool schemas, creating the AI service with tool execution, and adding a chat UI for natural language board manipulation.
todos:
  - id: ai-setup
    content: Create AI client setup in src/lib/ai.ts and add generateId to utils
    status: pending
  - id: ai-tools
    content: Define all 15 tool schemas in src/modules/ai/tools.ts
    status: pending
    dependencies:
      - ai-setup
  - id: ai-service
    content: Implement AIService class with tool call handling
    status: pending
    dependencies:
      - ai-tools
  - id: ai-executor
    content: Create tool executor with all board manipulation handlers
    status: pending
    dependencies:
      - ai-service
  - id: ai-errors
    content: Add AIError class, retry logic, and rate limiting
    status: pending
    dependencies:
      - ai-executor
  - id: ai-hook
    content: Create useAI hook and module index exports
    status: pending
    dependencies:
      - ai-errors
  - id: ai-ui
    content: Build AIChatPanel component and integrate into App.tsx
    status: pending
    dependencies:
      - ai-hook
  - id: ai-tests
    content: Write unit tests for AI service and tool executor
    status: pending
    dependencies:
      - ai-ui
  - id: ai-prd-update
    content: Update PRD.md with completed checkboxes and run all tests
    status: pending
    dependencies:
      - ai-tests
---

# Epic 4: AI Integration and Board Agent

This plan implements AI-powered board manipulation through natural language commands using Kimi 2.5 via the Nvidia API. The implementation follows the PRD structure with proper git workflow.

## Current State Analysis

- **AI Module**: `src/modules/ai/` directory exists but is empty
- **Dependencies**: `openai` package already installed in `package.json`
- **Sync Services**: Fully implemented in `src/modules/sync/` with `createObject`, `updateObject`, `deleteObject` functions
- **Types**: `IBoardObject` and `ShapeType` defined in `src/types/board.ts`
- **Utils**: `src/lib/utils.ts` exists but lacks `generateId` function (needed for tool executor)

## Implementation Plan

### Story 4.1: AI Service Setup (Branch: `feature/ai-setup`)

**Commit 1: API Client Setup**

- Create [`src/lib/ai.ts`](src/lib/ai.ts) with OpenAI client configured for Nvidia API
- Add `generateId` utility function to [`src/lib/utils.ts`](src/lib/utils.ts)

### Story 4.2: Tool Schema Definition (Branch: `feature/ai-tools`)

**Commit 2: Tool Definitions**

- Create [`src/modules/ai/tools.ts`](src/modules/ai/tools.ts) with all 15 board manipulation tools:
- Creation: `createStickyNote`, `createShape`, `createFrame`, `createConnector`, `createText`
- Manipulation: `moveObject`, `resizeObject`, `updateText`, `changeColor`, `deleteObject`
- Query: `getBoardState`, `findObjects`
- Layout: `arrangeInGrid`, `alignObjects`, `distributeObjects`

### Story 4.3: AI Service Implementation (Branch: `feature/ai-service`)

**Commit 3: AI Service Class**

- Create [`src/modules/ai/aiService.ts`](src/modules/ai/aiService.ts) with:
- System prompt for board manipulation context
- Conversation history management
- Tool call handling with sequential execution
- Board state context injection

### Story 4.4: Tool Executor (Branch: `feature/ai-executor`)

**Commit 4: Tool Executor Implementation**

- Create [`src/modules/ai/toolExecutor.ts`](src/modules/ai/toolExecutor.ts) implementing all tool handlers
- Integrate with existing sync services (`createObject`, `updateObject`, `deleteObject`)
- Support optimistic local updates and Firebase sync

### Story 4.5 & 4.6: Error Handling and Performance (Branch: `feature/ai-performance`)

**Commit 5: Error Handling and Rate Limiting**

- Create [`src/modules/ai/errors.ts`](src/modules/ai/errors.ts) with `AIError` class
- Add retry logic with exponential backoff
- Implement request throttling

### Story 4.7: Shared AI State and UI (Branch: `feature/ai-shared`)

**Commit 6: AI Module Index and Hook**

- Create [`src/modules/ai/index.ts`](src/modules/ai/index.ts) exporting all AI functionality
- Create [`src/hooks/useAI.ts`](src/hooks/useAI.ts) hook for React integration

**Commit 7: AI Chat Panel UI**

- Create [`src/components/ai/AIChatPanel.tsx`](src/components/ai/AIChatPanel.tsx) with:
- Message input and display
- Loading states during AI processing
- Error display
- Integrate into [`src/App.tsx`](src/App.tsx)

### Testing (Branch: `feature/ai-tests`)

**Commit 8: Unit Tests**

- Create [`tests/unit/aiService.test.ts`](tests/unit/aiService.test.ts)
- Create [`tests/unit/toolExecutor.test.ts`](tests/unit/toolExecutor.test.ts)
- Test tool definitions, error handling, and retry logic

### Final Steps

**Commit 9: Update PRD Checklist**

- Mark completed items in [`docs/PRD.md`](docs/PRD.md)

## Git Workflow

Each story will follow this pattern:

1. Create feature branch from `dev`
2. Implement changes
3. Run `bun run format` before each commit
4. Commit with conventional commit messages
5. Merge to `dev` after completion

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/ai.ts` | Create |
| `src/lib/utils.ts` | Modify (add generateId) |
| `src/modules/ai/tools.ts` | Create |
| `src/modules/ai/aiService.ts` | Create |
| `src/modules/ai/toolExecutor.ts` | Create |
| `src/modules/ai/errors.ts` | Create |
| `src/modules/ai/index.ts` | Create |
| `src/hooks/useAI.ts` | Create |
| `src/components/ai/AIChatPanel.tsx` | Create |
| `src/App.tsx` | Modify |
| `tests/unit/aiService.test.ts` | Create |
| `tests/unit/toolExecutor.test.ts` | Create |
| `docs/PRD.md` | Modify (check off tasks) |