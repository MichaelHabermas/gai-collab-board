# Type System Migration Checklist

This checklist documents the find-and-replace patterns applied during the type system refactor. Use it to verify migrations or to apply the same patterns to new code.

## 1. Point / Position — use `IPosition` from `@/types`

| File | Old | New |
|------|-----|-----|
| BoardCanvas.tsx | `useRef<{ x: number; y: number } \| null>(null)` | `useRef<IPosition \| null>(null)` |
| BoardCanvas.tsx | `(pos: { x: number; y: number }) => IPosition` | `(pos: IPosition) => IPosition` |
| CanvasShapeRenderer.tsx | `(pos: { x: number; y: number }) => { x: number; y: number }` in props | Use `ICanvasShapeRendererProps` from `@/types` (uses `IDragBoundFunc`) |
| StickyNote.tsx | `dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number }` | `dragBoundFunc?: IDragBoundFunc` |
| Frame.tsx | Same as StickyNote | Same |
| alignmentGuides.ts | `pos: { x: number; y: number }`, return `{ x, y }` | `pos: IPosition`, return `IPosition` |
| snapToGrid.ts | Return type `{ x: number; y: number }` | Return type `IPosition` |
| canvasBounds.ts | `IViewportFitResult.position: { x, y }` | `position: IPosition` (in types/viewport.ts) |
| canvasOverlayPosition.ts | Local `IPoint` and `IPoint[]` | `IPosition` and `IPosition[]` from `@/types` |

## 2. Dimensions — use `IDimensions` from `@/types`

| File | Old | New |
|------|-----|-----|
| snapToGrid.ts | Return type `{ width: number; height: number }` | Return type `IDimensions` |
| BoardCanvas.tsx | Cache entry `{ width, height, fn }` | Same shape; fn typed as `(pos: IPosition) => IPosition` |

## 3. Bounds and viewport fit

| File | Old | New |
|------|-----|-----|
| lib/canvasBounds.ts | Local `IBounds`, `IViewportFitResult` | Import from `@/types`, re-export for backward compat |
| lib/alignmentGuides.ts | Import `IBounds` from `./canvasBounds` | Import `IBounds`, `IPosition`, `IAlignmentGuides`, `IAlignmentCandidate`, `IAlignmentPositions` from `@/types` |

## 4. Layout types

| File | Old | New |
|------|-----|-----|
| lib/alignDistribute.ts | Local `ILayoutRect`, `IPositionUpdate`, `AlignOption`, `DistributeDirection` | Import from `@/types`, re-export |
| AlignToolbar.tsx | `toRect()` return `{ id, x, y, width, height }` | Return type `ILayoutRect` |

## 5. Canvas / selection / viewport actions

| File | Old | New |
|------|-----|-----|
| SelectionLayer.tsx | Local `ISelectionRect`, export type | Import `ISelectionRect` from `@/types` |
| CanvasShapeRenderer.tsx | Local `ICanvasShapeRendererProps` | Import `ICanvasShapeRendererProps` from `@/types` |
| ViewportActionsContext.tsx | Local `ExportImageFormat`, `IViewportActionsValue` | Import `IViewportActionsValue` from `@/types` |
| RightSidebar.tsx | Local `IRightSidebarProps` | Import `IRightSidebarProps` from `@/types` |
| App.tsx | Import `IViewportActionsValue` from ViewportActionsContext | Import from `@/types` |

## 6. Tools

| File | Old | New |
|------|-----|-----|
| Toolbar.tsx | Local `export type ToolMode` | Import `ToolMode` from `@/types` |
| BoardCanvas.tsx | Import `ToolMode` from `./Toolbar` | Import `ToolMode` from `@/types` |

## 7. Collaboration

| File | Old | New |
|------|-----|-----|
| realtimeService.ts | Local `ICursorData`, `IPresenceData` | Import from `@/types`, re-export |
| useCursors.ts | Local `export type Cursors` | Import `Cursors` from `@/types` |
| CursorLayer.tsx | Import `Cursors` from useCursors, `ICursorData` from realtimeService | Import `Cursors`, `ICursorData` from `@/types` |

## 8. Konva events

| File | Old | New |
|------|-----|-----|
| BoardCanvas.tsx | `Konva.KonvaEventObject<MouseEvent>` | `IKonvaMouseEvent` from `@/types` |
| useCanvasViewport.ts | `Konva.KonvaEventObject<WheelEvent>` etc. | `IKonvaWheelEvent`, `IKonvaDragEvent`, `IKonvaTouchEvent` from `@/types` |
| useShapeDragHandler.ts | `Konva.KonvaEventObject<DragEvent>` | `IKonvaDragEvent` from `@/types` |
| useShapeTransformHandler.ts | `Konva.KonvaEventObject<Event>` | `IKonvaEvent` from `@/types` |
| ConnectionNodesLayer.tsx | `Konva.KonvaEventObject<MouseEvent \| TouchEvent>` | `IKonvaMouseEvent \| IKonvaTouchEvent` from `@/types` |

## 9. Viewport and viewport state

| File | Old | New |
|------|-----|-----|
| types/viewport.ts | Duplicate `IViewportPosition`, `IViewportScale` (same as `{ x, y }`) | Type alias to `IPosition` from geometry |
| types/viewport.ts | — | Add `IViewportFitResult` with `position: IPosition` |
| useCanvasViewport.ts | Re-export viewport types | Consumers import from `@/types` |
| useVisibleShapes.ts | Import `IViewportState` from useCanvasViewport | Import from `@/types` |

## 10. Board and object service

| File | Old | New |
|------|-----|-----|
| types/board.ts | — | Add `ICreateObjectParams`, `IUpdateObjectParams` |
| objectService.ts | Local `ICreateObjectParams`, `IUpdateObjectParams` | Import from `@/types`, re-export |

## 11. Sidebar tab

| File | Old | New |
|------|-----|-----|
| types/canvas.ts | — | Add `SidebarTab` |
| useBoardSettings.ts | Local `export type SidebarTab` | Import `SidebarTab` from `@/types`, re-export |

## 12. Transform end attrs (sticky/frame)

| File | Old | New |
|------|-----|-----|
| StickyNote.tsx | `onTransformEnd?: (attrs: { x, y, width, height, rotation }) => void` | `onTransformEnd?: (attrs: ITransformEndRectAttrs) => void` |
| Frame.tsx | Same | Same |

## 13. Tests

| File | Old | New |
|------|-----|-----|
| useAI.test.ts | Import `IViewportActionsValue` from ViewportActionsContext | Import from `@/types` |
| useCursors.test.ts | Import `Cursors` from useCursors | Import from `@/types` |
| useVisibleShapes.test.ts | Import `IViewportState` from useCanvasViewport | Import from `@/types` |

## Type module locations (reference)

- **geometry.ts**: `IPosition`, `IDimensions`, `ISize`, `IBounds`, `ITransform`, `IScaleTransform`
- **viewport.ts**: `IViewportPosition`, `IViewportScale`, `IPersistedViewport`, `IViewportState`, `IViewportFitResult`
- **transform.ts**: `ITransformEndRectAttrs`, `ITransformEndLineAttrs`, `ITransformEndTextAttrs`, unions
- **shapes.ts**: `IDragBoundFunc`, `IBaseShapeProps`, `IRectLikeShapeProps`, `ILineLikeShapeProps`, `ITextLikeShapeProps`
- **board.ts**: `ShapeType`, `ConnectorAnchor`, `IBoardObject`, `IBoard`, `ICreateObjectParams`, `IUpdateObjectParams`
- **canvas.ts**: `SidebarTab`, `ISelectionRect`, `IOverlayRect`, `ExportImageFormat`, `IViewportActionsValue`, `ICanvasShapeRendererProps`, `IRightSidebarProps`
- **tools.ts**: `ToolMode`
- **layout.ts**: `AlignOption`, `DistributeDirection`, `ILayoutRect`, `IPositionUpdate`, `IAlignmentGuides`, `IAlignmentPositions`, `IAlignmentCandidate`
- **collaboration.ts**: `ICursorData`, `Cursors`, `IPresenceData`
- **konva.ts**: `IKonvaMouseEvent`, `IKonvaDragEvent`, `IKonvaWheelEvent`, `IKonvaTouchEvent`, `IKonvaEvent`
- **utils.ts**: Re-exports from geometry for backward compatibility

All public types are re-exported from `src/types/index.ts`.
