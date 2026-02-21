import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useMiddleMousePanListeners } from '@/hooks/useMiddleMousePanListeners';

describe('useMiddleMousePanListeners', () => {
  const mockPanTo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with isMiddlePanning=false', () => {
    const { result } = renderHook(() =>
      useMiddleMousePanListeners({ panTo: mockPanTo })
    );

    expect(result.current.isMiddlePanning).toBe(false);
  });

  it('does not attach listeners when isMiddlePanning is false', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');

    renderHook(() => useMiddleMousePanListeners({ panTo: mockPanTo }));

    // Should not have registered mousemove/mouseup
    const moveListeners = addSpy.mock.calls.filter(([type]) => type === 'mousemove');
    const upListeners = addSpy.mock.calls.filter(([type]) => type === 'mouseup');
    expect(moveListeners).toHaveLength(0);
    expect(upListeners).toHaveLength(0);

    addSpy.mockRestore();
  });

  it('attaches listeners when isMiddlePanning is set to true', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');

    const { result } = renderHook(() =>
      useMiddleMousePanListeners({ panTo: mockPanTo })
    );

    act(() => {
      result.current.setIsMiddlePanning(true);
    });

    const moveListeners = addSpy.mock.calls.filter(([type]) => type === 'mousemove');
    const upListeners = addSpy.mock.calls.filter(([type]) => type === 'mouseup');
    expect(moveListeners).toHaveLength(1);
    expect(upListeners).toHaveLength(1);

    addSpy.mockRestore();
  });

  it('mousemove with null refs does not call panTo', () => {
    const { result } = renderHook(() =>
      useMiddleMousePanListeners({ panTo: mockPanTo })
    );

    // Enable panning but leave refs as null
    act(() => {
      result.current.setIsMiddlePanning(true);
    });

    // Dispatch a mousemove — refs are null, so panTo should not be called
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 200 }));
    });

    expect(mockPanTo).not.toHaveBeenCalled();
  });

  it('mousemove with valid refs calls panTo with correct delta', () => {
    const { result } = renderHook(() =>
      useMiddleMousePanListeners({ panTo: mockPanTo })
    );

    // Set up refs
    result.current.middlePanStartClientRef.current = { x: 50, y: 50 };
    result.current.middlePanStartPositionRef.current = { x: 100, y: 200 };

    act(() => {
      result.current.setIsMiddlePanning(true);
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 70, clientY: 80 }));
    });

    expect(mockPanTo).toHaveBeenCalledWith({
      x: 100 + (70 - 50),
      y: 200 + (80 - 50),
    });
  });

  it('mouseup resets panning state to false', () => {
    const { result } = renderHook(() =>
      useMiddleMousePanListeners({ panTo: mockPanTo })
    );

    act(() => {
      result.current.setIsMiddlePanning(true);
    });

    expect(result.current.isMiddlePanning).toBe(true);

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(result.current.isMiddlePanning).toBe(false);
  });

  it('cleans up listeners when isMiddlePanning goes from true to false', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { result } = renderHook(() =>
      useMiddleMousePanListeners({ panTo: mockPanTo })
    );

    act(() => {
      result.current.setIsMiddlePanning(true);
    });

    act(() => {
      result.current.setIsMiddlePanning(false);
    });

    const removeMove = removeSpy.mock.calls.filter(([type]) => type === 'mousemove');
    const removeUp = removeSpy.mock.calls.filter(([type]) => type === 'mouseup');
    expect(removeMove.length).toBeGreaterThanOrEqual(1);
    expect(removeUp.length).toBeGreaterThanOrEqual(1);

    removeSpy.mockRestore();
  });

  it('mousemove when only startClient ref is null does not call panTo', () => {
    const { result } = renderHook(() =>
      useMiddleMousePanListeners({ panTo: mockPanTo })
    );

    // Only set startPosition, leave startClient as null
    result.current.middlePanStartPositionRef.current = { x: 100, y: 200 };

    act(() => {
      result.current.setIsMiddlePanning(true);
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 70, clientY: 80 }));
    });

    expect(mockPanTo).not.toHaveBeenCalled();
  });

  it('mousemove when only startPosition ref is null does not call panTo', () => {
    const { result } = renderHook(() =>
      useMiddleMousePanListeners({ panTo: mockPanTo })
    );

    // Only set startClient, leave startPosition as null
    result.current.middlePanStartClientRef.current = { x: 50, y: 50 };

    act(() => {
      result.current.setIsMiddlePanning(true);
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 70, clientY: 80 }));
    });

    expect(mockPanTo).not.toHaveBeenCalled();
  });
});
