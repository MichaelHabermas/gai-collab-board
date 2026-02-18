import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_PREFIX = 'collabboard-board-';
const STORAGE_SUFFIX = '-settings';
const VIEWPORT_DEBOUNCE_MS = 400;

export interface IViewportPosition {
  x: number;
  y: number;
}

export interface IViewportScale {
  x: number;
  y: number;
}

export interface IPersistedViewport {
  position: IViewportPosition;
  scale: IViewportScale;
}

export type SidebarTab = 'boards' | 'properties' | 'ai';
export type BoardListFilter = 'all' | 'recent' | 'favorites';

export interface IBoardSettings {
  viewport: IPersistedViewport;
  showGrid: boolean;
  snapToGrid: boolean;
  sidebarTab: SidebarTab;
  boardListFilter: BoardListFilter;
}

const DEFAULT_VIEWPORT: IPersistedViewport = {
  position: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
};

const DEFAULT_SETTINGS: IBoardSettings = {
  viewport: DEFAULT_VIEWPORT,
  showGrid: false,
  snapToGrid: false,
  sidebarTab: 'boards',
  boardListFilter: 'all',
};

function getStorageKey(boardId: string): string {
  return `${STORAGE_PREFIX}${boardId}${STORAGE_SUFFIX}`;
}

function loadSettings(boardId: string): IBoardSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = window.localStorage.getItem(getStorageKey(boardId));
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<IBoardSettings>;
    return {
      viewport: {
        position: parsed.viewport?.position ?? DEFAULT_VIEWPORT.position,
        scale: parsed.viewport?.scale ?? DEFAULT_VIEWPORT.scale,
      },
      showGrid: parsed.showGrid ?? DEFAULT_SETTINGS.showGrid,
      snapToGrid: parsed.snapToGrid ?? DEFAULT_SETTINGS.snapToGrid,
      sidebarTab:
        parsed.sidebarTab && ['boards', 'properties', 'ai'].includes(parsed.sidebarTab)
          ? parsed.sidebarTab
          : DEFAULT_SETTINGS.sidebarTab,
      boardListFilter:
        parsed.boardListFilter && ['all', 'recent', 'favorites'].includes(parsed.boardListFilter)
          ? parsed.boardListFilter
          : DEFAULT_SETTINGS.boardListFilter,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(boardId: string, settings: IBoardSettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(getStorageKey(boardId), JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export interface IUseBoardSettingsReturn {
  viewport: IPersistedViewport;
  setViewport: (v: IPersistedViewport) => void;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;
  sidebarTab: SidebarTab;
  setSidebarTab: (v: SidebarTab) => void;
  boardListFilter: BoardListFilter;
  setBoardListFilter: (v: BoardListFilter) => void;
}

/**
 * Persists per-board UI settings in localStorage (viewport position/scale, grid toggles, sidebar tab, board list filter).
 * Viewport updates are debounced to avoid excessive writes during pan/zoom.
 */
export const useBoardSettings = (boardId: string): IUseBoardSettingsReturn => {
  const [settings, setSettings] = useState<IBoardSettings>(() => loadSettings(boardId));
  const viewportDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reload when boardId changes
  useEffect(() => {
    setSettings(loadSettings(boardId));
  }, [boardId]);

  // Persist viewport with debounce
  const setViewport = useCallback(
    (v: IPersistedViewport) => {
      setSettings((prev) => {
        const next = { ...prev, viewport: v };
        if (viewportDebounceRef.current !== null) {
          clearTimeout(viewportDebounceRef.current);
        }
        viewportDebounceRef.current = setTimeout(() => {
          saveSettings(boardId, next);
          viewportDebounceRef.current = null;
        }, VIEWPORT_DEBOUNCE_MS);
        return next;
      });
    },
    [boardId]
  );

  const setShowGrid = useCallback(
    (v: boolean) => {
      setSettings((prev) => {
        const next = { ...prev, showGrid: v };
        saveSettings(boardId, next);
        return next;
      });
    },
    [boardId]
  );

  const setSnapToGrid = useCallback(
    (v: boolean) => {
      setSettings((prev) => {
        const next = { ...prev, snapToGrid: v };
        saveSettings(boardId, next);
        return next;
      });
    },
    [boardId]
  );

  const setSidebarTab = useCallback(
    (v: SidebarTab) => {
      setSettings((prev) => {
        const next = { ...prev, sidebarTab: v };
        saveSettings(boardId, next);
        return next;
      });
    },
    [boardId]
  );

  const setBoardListFilter = useCallback(
    (v: BoardListFilter) => {
      setSettings((prev) => {
        const next = { ...prev, boardListFilter: v };
        saveSettings(boardId, next);
        return next;
      });
    },
    [boardId]
  );

  // Clear viewport debounce on unmount
  useEffect(() => {
    return () => {
      if (viewportDebounceRef.current !== null) {
        clearTimeout(viewportDebounceRef.current);
      }
    };
  }, []);

  return {
    viewport: settings.viewport,
    setViewport,
    showGrid: settings.showGrid,
    setShowGrid,
    snapToGrid: settings.snapToGrid,
    setSnapToGrid,
    sidebarTab: settings.sidebarTab,
    setSidebarTab,
    boardListFilter: settings.boardListFilter,
    setBoardListFilter,
  };
};
