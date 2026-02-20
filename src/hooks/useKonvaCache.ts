import { useEffect, useRef, useCallback } from 'react';
import type Konva from 'konva';

/** Shapes larger than this (in local px) skip caching to stay within memory budget. */
const MAX_CACHE_DIMENSION = 2000;
/** Bitmap pixel ratio for cached shapes. Matches retina displays. */
const CACHE_PIXEL_RATIO = 2;

/**
 * Manages Konva bitmap caching and ref forwarding for a shape node.
 *
 * Returns `[refCallback, internalRef]`:
 *   - `refCallback` — pass as the `ref` prop on the Konva component.
 *   - `internalRef` — use when you need imperative access to the node
 *     (e.g., reading position for an edit overlay).
 *
 * When `shouldCache` is true and the shape fits within the memory budget,
 * the node is rasterised to an offscreen canvas. Subsequent Konva layer
 * redraws blit the bitmap instead of re-executing all draw commands.
 *
 * When `shouldCache` is false (e.g. shape is selected / being edited), the
 * bitmap cache is cleared so Konva draws the node normally.
 *
 * @param externalRef  Forwarded ref from the parent component.
 * @param shouldCache  `false` when selected, editing, or actively resizing.
 * @param visualDeps   Props that affect the rendered appearance (fill, stroke, text…).
 *                     Position props (x, y) should NOT be included — Konva applies
 *                     transforms to the cached bitmap without re-rasterising.
 */
export function useKonvaCache<T extends Konva.Node>(
  externalRef: React.ForwardedRef<T>,
  shouldCache: boolean,
  visualDeps: readonly unknown[]
): [React.RefCallback<T>, React.RefObject<T | null>] {
  const nodeRef = useRef<T | null>(null);

  const setRef = useCallback(
    (node: T | null) => {
      nodeRef.current = node;
      if (externalRef) {
        if (typeof externalRef === 'function') {
          externalRef(node);
        } else {
          externalRef.current = node;
        }
      }
    },
    [externalRef]
  );

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || typeof node.cache !== 'function') return;

    if (!shouldCache) {
      node.clearCache();

      return;
    }

    // Skip caching for very large shapes — bitmap would exceed memory budget
    // (e.g. 2000×2000 @ 2× pixel ratio = 64MB).
    const rect = node.getClientRect({ skipTransform: true });
    if (rect.width > MAX_CACHE_DIMENSION || rect.height > MAX_CACHE_DIMENSION) {
      return;
    }

    // Defer cache() to next animation frame so Konva has drawn the node at
    // least once — caching an undrawn node produces an empty bitmap.
    const frame = requestAnimationFrame(() => {
      const n = nodeRef.current;
      if (n && typeof n.cache === 'function') {
        n.cache({ pixelRatio: CACHE_PIXEL_RATIO });
      }
    });

    return () => cancelAnimationFrame(frame);
    // visualDeps is an explicit dependency list provided by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldCache, ...visualDeps]);

  return [setRef, nodeRef];
}
