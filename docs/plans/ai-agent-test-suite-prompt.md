# AI Board Agent — Test Suite Prompt

Use this prompt with an AI coding assistant to generate a comprehensive test suite for the CollabBoard AI agent's tool executor.

---

## Prompt

You are writing a **Vitest unit test file** for the CollabBoard AI board agent. The test file should be placed at `tests/unit/aiAgent.commands.test.ts`.

### Codebase Context

The system under test is `createToolExecutor` from `@/modules/ai/toolExecutor`. It accepts a context object and returns `{ execute }`, where `execute(toolCall)` dispatches to the correct handler based on `tool.name`.

**Context shape:**

```ts
{
  boardId: string;
  createdBy: string;
  userId: string;
  getObjects: () => IBoardObject[];
  createObject: (boardId, params) => Promise<IBoardObject>;
  updateObject: (boardId, objectId, updates) => Promise<void>;
  deleteObject: (boardId, objectId) => Promise<void>;
  // Optional viewport callbacks:
  onZoomToFitAll?: () => void | Promise<void>;
  onZoomToSelection?: (objectIds: string[]) => void | Promise<void>;
  onSetZoomLevel?: (percent: number) => void | Promise<void>;
  onExportViewport?: (format?: 'png' | 'jpeg') => void;
  onExportFullBoard?: (format?: 'png' | 'jpeg') => void;
}
```

**Available tool names:** `createStickyNote`, `createShape`, `createFrame`, `createConnector`, `createText`, `moveObject`, `resizeObject`, `updateText`, `changeColor`, `setFontSize`, `setFontColor`, `setStroke`, `setStrokeWidth`, `setOpacity`, `deleteObject`, `getBoardState`, `findObjects`, `arrangeInGrid`, `alignObjects`, `distributeObjects`, `zoomToFitAll`, `zoomToSelection`, `setZoomLevel`, `exportBoardAsImage`, `getRecentBoards`, `getFavoriteBoards`, `toggleBoardFavorite`.

**Key behaviors to know:**

- `createStickyNote` resolves color names (yellow, pink, blue, green, purple, orange, red) to hex via a `STICKY_COLORS` map. Defaults to `#fef08a` (yellow). Clamps `fontSize` to 8–72 and `opacity` to 0–1. Maps `fontColor` → `textFill` property.
- `createShape` supports `rectangle`, `circle`, `line`. Lines auto-compute `points: [0, 0, width, height]`.
- `createFrame` defaults to 300×200 when width/height omitted. Fill is always `rgba(255,255,255,0.15)`.
- `createConnector` throws `"Source or target object not found for connector"` if either ID is missing from `getObjects()`.
- `setFontSize` returns `{ success: false }` if fontSize < 8 or > 72.
- `setFontColor` updates `textFill` for stickies, `fill` for text elements, returns failure for other types.
- `setStrokeWidth` returns failure for negative values.
- `setOpacity` returns failure for values outside 0–1.
- `arrangeInGrid` defaults: `spacing=20`, `startX=100`, `startY=100`. Position formula: `startX + col * (obj.width + spacing)`.
- `alignObjects` returns `{ success: false, message: 'No objects found' }` when IDs match nothing.
- `distributeObjects` returns failure when fewer than 3 objects.
- `setZoomLevel` only allows `[50, 100, 200]`.
- `exportBoardAsImage` defaults format to `png`. Returns failure for invalid scope.
- Viewport commands return a stub success message when callbacks are not provided.
- Unknown tool names return `{ success: false, message: 'Unknown tool: <name>' }`.

**Required mocks:**

```ts
vi.mock('@/modules/sync/boardService', () => ({
  getBoard: (id: string) => mockGetBoard(id),
}));

vi.mock('@/modules/sync/userPreferencesService', () => ({
  getUserPreferences: (userId: string) => mockGetUserPreferences(userId),
  toggleFavoriteBoardId: (userId: string, boardId: string) =>
    mockToggleFavoriteBoardId(userId, boardId),
}));
```

**IBoardObject minimum shape:**

```ts
{ id, type, x, y, width, height, rotation, fill, createdBy, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), text? }
```

### Required Test Categories

Write tests that validate the tool executor correctly handles ALL of the following natural-language commands. Each test should simulate the tool call(s) the LLM would emit, then assert the correct `createObject` / `updateObject` / `deleteObject` calls.

#### 1. Creation Commands (minimum 6 tests)

| Natural-language command | Tool call to test |
|---|---|
| "Add a yellow sticky note that says 'User Research'" | `createStickyNote` with `color: 'yellow'`, verify hex resolution and text |
| "Create a blue rectangle at position 100, 200" | `createShape` with `type: 'rectangle'`, verify x/y/color |
| "Add a frame called 'Sprint Planning'" | `createFrame`, verify `text` equals title |
| Create a circle shape | `createShape` with `type: 'circle'` |
| Create a text element | `createText`, verify fontSize and auto-width |
| Connect two objects | `createConnector`, verify fromObjectId/toObjectId; also test missing-target error |
| Color name resolution | Test that pink, green, purple, orange all resolve to hex codes |

#### 2. Manipulation Commands (minimum 8 tests)

| Natural-language command | Tool call(s) to test |
|---|---|
| "Move all the pink sticky notes to the right side" | `findObjects` by color → `moveObject` for each result |
| "Resize the frame to fit its contents" | `resizeObject` with new width/height |
| "Change the sticky note color to green" | `changeColor` with new fill |
| Update text content | `updateText` |
| Set font size (valid + out-of-range rejection) | `setFontSize` |
| Set font color (sticky=textFill, text=fill, unsupported=failure) | `setFontColor` |
| Set stroke, stroke width (valid + negative rejection) | `setStroke`, `setStrokeWidth` |
| Set opacity (valid + out-of-range rejection) | `setOpacity` |
| Delete an object | `deleteObject` |

#### 3. Layout Commands (minimum 5 tests)

| Natural-language command | Tool call(s) to test |
|---|---|
| "Arrange these sticky notes in a grid" | `arrangeInGrid` with 4 objects, 2 columns — verify each object's new x/y |
| "Create a 2x3 grid of sticky notes for pros and cons" | Create 6 stickies → `arrangeInGrid` with columns=2 |
| "Space these elements evenly" (horizontal) | `distributeObjects` direction=horizontal with 3+ objects |
| "Space these elements evenly" (vertical) | `distributeObjects` direction=vertical |
| Align objects left | `alignObjects` alignment=left, verify all x values match minimum |
| Distribute with <3 objects (failure) | `distributeObjects` returns `{ success: false }` |
| Align with no matching objects (failure) | `alignObjects` returns failure |

#### 4. Complex / Multi-step Commands (minimum 3 tests)

These simulate the LLM making multiple sequential tool calls:

| Natural-language command | Tool call sequence |
|---|---|
| "Create a SWOT analysis template with four quadrants" | 4× `createFrame` (Strengths, Weaknesses, Opportunities, Threats) in a 2×2 layout |
| "Build a user journey map with 5 stages" | 5× `createFrame` + 4× `createConnector` between consecutive stages |
| "Set up a retrospective board" | 3× `createFrame` (What Went Well, What Didn't, Action Items) + 3× `createStickyNote` headers |

#### 5. Query & State Commands (minimum 3 tests)

- `getBoardState` returns correct object count and summaries
- `findObjects` filters by type, by color, and by textContains (case-insensitive)

#### 6. Viewport & Export Commands (minimum 5 tests)

- `zoomToFitAll` calls callback
- `zoomToSelection` calls callback with IDs; rejects empty array
- `setZoomLevel` accepts 50/100/200; rejects 75
- `exportBoardAsImage` viewport/full with format; rejects invalid scope
- Viewport commands return stub success when callbacks absent

#### 7. Board Management Commands (minimum 3 tests)

- `getRecentBoards` returns board names (mock getUserPreferences + getBoard)
- `getFavoriteBoards` returns favorites
- `toggleBoardFavorite` toggles and returns new state; rejects missing boardId

#### 8. Edge Cases (minimum 5 tests)

- Unknown tool name → `{ success: false }`
- `createStickyNote` with no color → defaults to yellow `#fef08a`
- `createStickyNote` with fontSize=200, opacity=5 → clamped to 72 and 1
- `createShape` type=line → `points: [0, 0, width, height]`
- `createFrame` with no width/height → defaults 300×200
- `arrangeInGrid` with no startX/startY/spacing → uses defaults (100, 100, 20)
- `exportBoardAsImage` with no format → defaults to `'png'`

### Style Guidelines

- Use `describe` blocks per category (Creation, Manipulation, Layout, Complex, Query, Viewport, Board Management, Edge Cases).
- Use a `makeObject` helper that returns a valid `IBoardObject` with sensible defaults and accepts overrides.
- Use a `createContext` helper that wires up the mock functions.
- Use `expect.objectContaining()` for partial matching.
- Use `expect.stringContaining()` or `expect.stringMatching()` for message assertions.
- Reset all mocks in `beforeEach`.
- Target: **~45–50 individual `it()` blocks**.

### Do NOT

- Do not test the LLM/OpenAI integration or AIService class (that's a separate test file).
- Do not test the React UI components.
- Do not make real network calls.
- Do not duplicate tests that already exist in `toolExecutor.test.ts` — this suite focuses on **command-scenario coverage** (simulating real user commands), not individual tool-function unit tests.
