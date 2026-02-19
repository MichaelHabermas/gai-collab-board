import { useState, useEffect, useRef, type RefObject } from 'react';
import type { IPosition, IViewportPosition } from '@/types';

interface IPanToParams {
  x: number;
  y: number;
}

interface IUseMiddleMousePanListenersParams {
  panTo: (position: IPanToParams) => void;
}

interface IUseMiddleMousePanListenersReturn {
  isMiddlePanning: boolean;
  setIsMiddlePanning: (value: boolean) => void;
  middlePanStartClientRef: RefObject<IPosition | null>;
  middlePanStartPositionRef: RefObject<IViewportPosition | null>;
}

/**
 * Manages middle-mouse pan: window mousemove/mouseup listeners when panning is active.
 * Caller sets middlePanStartClientRef and middlePanStartPositionRef on stage mousedown (button === 1), then setIsMiddlePanning(true).
 */
export const useMiddleMousePanListeners = ({
  panTo,
}: IUseMiddleMousePanListenersParams): IUseMiddleMousePanListenersReturn => {
  const [isMiddlePanning, setIsMiddlePanning] = useState<boolean>(false);
  const middlePanStartClientRef = useRef<IPosition | null>(null);
  const middlePanStartPositionRef = useRef<IViewportPosition | null>(null);

  useEffect(() => {
    if (!isMiddlePanning) {
      return;
    }

    const onWindowMouseMove = (e: MouseEvent) => {
      const startClient = middlePanStartClientRef.current;
      const startPosition = middlePanStartPositionRef.current;
      if (!startClient || !startPosition) {
        return;
      }

      panTo({
        x: startPosition.x + (e.clientX - startClient.x),
        y: startPosition.y + (e.clientY - startClient.y),
      });
    };
    const onWindowMouseUp = () => {
      setIsMiddlePanning(false);
    };
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isMiddlePanning, panTo]);

  return {
    isMiddlePanning,
    setIsMiddlePanning,
    middlePanStartClientRef,
    middlePanStartPositionRef,
  };
};
