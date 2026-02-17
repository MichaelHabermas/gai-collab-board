import { Layer, Circle, Text, Group } from "react-konva";
import { memo, type ReactElement } from "react";
import type { ICursorData } from "@/modules/sync/realtimeService";
import type { Cursors } from "@/hooks/useCursors";

interface ICursorLayerProps {
  cursors: Cursors;
  currentUid: string;
}

interface ICursorProps {
  cursor: ICursorData;
}

const Cursor = memo(({ cursor }: ICursorProps): ReactElement => {
  return (
    <Group x={cursor.x} y={cursor.y}>
      {/* Cursor pointer */}
      <Circle
        radius={6}
        fill={cursor.color}
        stroke="#ffffff"
        strokeWidth={2}
        shadowColor="rgba(0, 0, 0, 0.3)"
        shadowBlur={4}
        shadowOffsetX={1}
        shadowOffsetY={1}
      />
      {/* Name label */}
      <Text
        text={cursor.displayName}
        x={12}
        y={-4}
        fontSize={12}
        fontFamily="Inter, system-ui, sans-serif"
        fill="#ffffff"
        padding={4}
        cornerRadius={4}
      />
      {/* Label background */}
      <Text
        text={cursor.displayName}
        x={10}
        y={-6}
        fontSize={12}
        fontFamily="Inter, system-ui, sans-serif"
        fill={cursor.color}
        padding={4}
      />
    </Group>
  );
});

Cursor.displayName = "Cursor";

/**
 * CursorLayer renders all other users' cursors on the canvas.
 * It filters out the current user's cursor to avoid self-rendering.
 * Uses listening={false} for performance since cursors don't need interaction.
 */
export const CursorLayer = memo(
  ({ cursors, currentUid }: ICursorLayerProps): ReactElement => {
    const otherCursors = Object.values(cursors).filter(
      (cursor) => cursor.uid !== currentUid
    );

    return (
      <Layer listening={false}>
        {otherCursors.map((cursor) => (
          <Cursor key={cursor.uid} cursor={cursor} />
        ))}
      </Layer>
    );
  }
);

CursorLayer.displayName = "CursorLayer";
