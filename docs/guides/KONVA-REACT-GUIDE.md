## Summary

This guide is the main reference for the canvas layer in CollabBoard. It explains Konva.js and react-konva concepts: Stage, Layer, Group, shapes, events, transforms, selection, and pan/zoom. It also covers performance tuning and integration with Firebase sync. Its role is to align the team on how the infinite canvas is built and why Konva was chosen over alternatives; it supports consistent patterns and makes it easier to add new shapes or interactions.

---

# Konva.js + React Guide for CollabBoard

## Overview

Konva.js is an HTML5 Canvas JavaScript framework that enables high-performance
2D graphics with support for animations, transitions, node nesting, layering,
filtering, and event handling. Combined with `react-konva`, it provides a
declarative way to build interactive canvas applications in React.

**Official Documentation**: [Konva.js Docs](https://konvajs.org/docs)

---

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Core Concepts](#core-concepts)
3. [Stage, Layers, and Groups](#stage-layers-and-groups)
4. [Shapes and Objects](#shapes-and-objects)
5. [Events and Interactions](#events-and-interactions)
6. [Transformations](#transformations)
7. [Selection System](#selection-system)
8. [Pan and Zoom](#pan-and-zoom)
9. [Performance Optimization](#performance-optimization)
10. [Integration with Firebase](#integration-with-firebase)

---

## Installation & Setup

### Install Dependencies

```bash
bun add konva react-konva
```

### Type Definitions

Konva includes TypeScript definitions. For additional React types:

```bash
bun add -d @types/react
```

### Basic Setup

```typescript
import { Stage, Layer, Rect, Circle, Text } from 'react-konva';
import { ReactElement } from 'react';

export const BasicCanvas = (): ReactElement => {
  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Rect x={20} y={20} width={100} height={100} fill='red' />
        <Circle x={200} y={100} radius={50} fill='green' />
        <Text x={20} y={150} text='Hello Konva!' fontSize={24} />
      </Layer>
    </Stage>
  );
};
```

---

## Core Concepts

### Hierarchy

```mermaid
graph TD
    Stage['Stage (Container)'] --> Layer['Layer (Canvas element)']
    Layer['Layer (Canvas element)'] --> Group['Group (Optional grouping)'] --> Shape['Shape (Rect, Circle, Line, Text, etc.)']
```

### Key Principles

1. **Stage** - The root container, wraps one or more Layers
2. **Layer** - Each Layer is a separate `<canvas>` element
3. **Group** - Logical grouping of shapes for batch operations
4. **Shape** - Visual elements (Rect, Circle, Line, Text, Image, etc.)

### Coordinate System

- Origin (0, 0) is top-left
- X increases to the right
- Y increases downward
- Shapes can have local transformations (position, rotation, scale)

---

## Stage, Layers, and Groups

### Stage Configuration

```typescript
import { Stage, Layer } from 'react-konva';
import { useState, useCallback, ReactElement } from 'react';
import Konva from 'konva';

interface StageConfig {
  width: number;
  height: number;
  scale: IPosition;
  position: IPosition;
}

export const ConfigurableStage = (): ReactElement => {
  const [stageConfig, setStageConfig] = useState<StageConfig>({
    width: window.innerWidth,
    height: window.innerHeight,
    scale: { x: 1, y: 1 },
    position: { x: 0, y: 0 },
  });

  // Handle window resize
  const handleResize = useCallback(() => {
    setStageConfig((prev) => ({
      ...prev,
      width: window.innerWidth,
      height: window.innerHeight,
    }));
  }, []);

  return (
    <Stage
      width={stageConfig.width}
      height={stageConfig.height}
      scaleX={stageConfig.scale.x}
      scaleY={stageConfig.scale.y}
      x={stageConfig.position.x}
      y={stageConfig.position.y}
      draggable // Enable stage dragging for pan
    >
      <Layer>{/* Shapes go here */}</Layer>
    </Stage>
  );
};
```

### Multiple Layers Strategy

Use multiple layers to separate concerns and optimize rendering:

```typescript
import { Stage, Layer, Rect } from 'react-konva';
import { ReactElement } from 'react';

export const MultiLayerCanvas = (): ReactElement => {
  return (
    <Stage width={800} height={600}>
      {/* Background layer - rarely updates */}
      <Layer name='background'>
        <Rect width={800} height={600} fill='#f0f0f0' listening={false} />
      </Layer>

      {/* Objects layer - main content */}
      <Layer name='objects'>{/* Board objects rendered here */}</Layer>

      {/* Cursors layer - frequent updates */}
      <Layer name='cursors'>{/* Other users' cursors */}</Layer>

      {/* Selection layer - UI overlays */}
      <Layer name='selection'>{/* Selection rectangle, transformer */}</Layer>
    </Stage>
  );
};
```

### Groups for Logical Grouping

```typescript
import { Group, Rect, Text } from 'react-konva';
import { ReactElement } from 'react';

interface StickyNoteProps {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fill: string;
  draggable?: boolean;
  onDragEnd?: (x: number, y: number) => void;
}

export const StickyNote = ({
  x,
  y,
  width,
  height,
  text,
  fill,
  draggable = true,
  onDragEnd,
}: StickyNoteProps): ReactElement => {
  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd?.(node.x(), node.y());
      }}
    >
      {/* Background */}
      <Rect
        width={width}
        height={height}
        fill={fill}
        shadowColor='black'
        shadowBlur={10}
        shadowOpacity={0.2}
        shadowOffsetX={5}
        shadowOffsetY={5}
        cornerRadius={4}
      />
      {/* Text content */}
      <Text
        text={text}
        width={width - 16}
        height={height - 16}
        x={8}
        y={8}
        fontSize={14}
        fontFamily='Inter, sans-serif'
        fill='#333'
        wrap='word'
        ellipsis
      />
    </Group>
  );
};
```

---

## Shapes and Objects

### Shape Types for CollabBoard

```typescript
// Types for board objects
export type ShapeType =
  | 'sticky'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'text'
  | 'frame'
  | 'connector';

export interface BaseShapeProps {
  id: string;
  x: number;
  y: number;
  rotation?: number;
  draggable?: boolean;
  onClick?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  onTransformEnd?: (attrs: TransformAttrs) => void;
}

export interface TransformAttrs {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}
```

### Rectangle Shape

```typescript
import { Rect } from 'react-konva';
import { forwardRef, Ref } from 'react';
import Konva from 'konva';

interface RectangleShapeProps extends BaseShapeProps {
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export const RectangleShape = forwardRef<Konva.Rect, RectangleShapeProps>(
  (
    {
      id,
      x,
      y,
      width,
      height,
      fill,
      stroke = '#333',
      strokeWidth = 2,
      rotation = 0,
      draggable = true,
      onClick,
      onDragEnd,
    },
    ref
  ) => {
    return (
      <Rect
        ref={ref}
        id={id}
        name='shape'
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        rotation={rotation}
        draggable={draggable}
        onClick={onClick}
        onTap={onClick}
        onDragEnd={(e) => {
          const node = e.target;
          onDragEnd?.(node.x(), node.y());
        }}
      />
    );
  }
);

RectangleShape.displayName = 'RectangleShape';
```

### Circle Shape

```typescript
import { Circle } from 'react-konva';
import { forwardRef } from 'react';
import Konva from 'konva';

interface CircleShapeProps extends BaseShapeProps {
  radius: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export const CircleShape = forwardRef<Konva.Circle, CircleShapeProps>(
  (
    {
      id,
      x,
      y,
      radius,
      fill,
      stroke = '#333',
      strokeWidth = 2,
      draggable = true,
      onClick,
      onDragEnd,
    },
    ref
  ) => {
    return (
      <Circle
        ref={ref}
        id={id}
        name='shape'
        x={x}
        y={y}
        radius={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        draggable={draggable}
        onClick={onClick}
        onTap={onClick}
        onDragEnd={(e) => {
          const node = e.target;
          onDragEnd?.(node.x(), node.y());
        }}
      />
    );
  }
);

CircleShape.displayName = 'CircleShape';
```

### Line / Connector Shape

```typescript
import { Line, Arrow } from 'react-konva';
import { ReactElement } from 'react';

interface ConnectorProps {
  id: string;
  points: number[]; // [x1, y1, x2, y2, ...]
  stroke: string;
  strokeWidth?: number;
  hasArrow?: boolean;
  tension?: number; // For curved lines (0 = straight, 0.5 = smooth curve)
  onClick?: () => void;
}

export const Connector = ({
  id,
  points,
  stroke,
  strokeWidth = 2,
  hasArrow = false,
  tension = 0,
  onClick,
}: ConnectorProps): ReactElement => {
  const Component = hasArrow ? Arrow : Line;

  return (
    <Component
      id={id}
      name='connector'
      points={points}
      stroke={stroke}
      strokeWidth={strokeWidth}
      tension={tension}
      lineCap='round'
      lineJoin='round'
      hitStrokeWidth={10} // Larger hit area for easier selection
      onClick={onClick}
      onTap={onClick}
    />
  );
};
```

### Text Element

```typescript
import { Text } from 'react-konva';
import { forwardRef, useState, useRef, useEffect } from 'react';
import Konva from 'konva';

interface TextElementProps extends BaseShapeProps {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  width?: number;
  onTextChange?: (newText: string) => void;
}

export const TextElement = forwardRef<Konva.Text, TextElementProps>(
  (
    {
      id,
      x,
      y,
      text,
      fontSize = 16,
      fontFamily = 'Inter, sans-serif',
      fill = '#333',
      width,
      draggable = true,
      onClick,
      onDragEnd,
      onTextChange,
    },
    ref
  ) => {
    const textRef = useRef<Konva.Text>(null);

    // Handle double-click for editing
    const handleDblClick = () => {
      const textNode = textRef.current;
      if (!textNode) return;

      // Create input element for editing
      const stage = textNode.getStage();
      if (!stage) return;

      const textPosition = textNode.absolutePosition();
      const stageBox = stage.container().getBoundingClientRect();

      const areaPosition = {
        x: stageBox.left + textPosition.x,
        y: stageBox.top + textPosition.y,
      };

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      textarea.value = text;
      textarea.style.position = 'absolute';
      textarea.style.top = `${areaPosition.y}px`;
      textarea.style.left = `${areaPosition.x}px`;
      textarea.style.width = `${textNode.width() - textNode.padding() * 2}px`;
      textarea.style.fontSize = `${fontSize}px`;
      textarea.style.border = 'none';
      textarea.style.padding = '0px';
      textarea.style.margin = '0px';
      textarea.style.overflow = 'hidden';
      textarea.style.background = 'none';
      textarea.style.outline = 'none';
      textarea.style.resize = 'none';
      textarea.style.fontFamily = fontFamily;
      textarea.style.transformOrigin = 'left top';

      textarea.focus();

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          onTextChange?.(textarea.value);
          document.body.removeChild(textarea);
        }
        if (e.key === 'Escape') {
          document.body.removeChild(textarea);
        }
      });

      textarea.addEventListener('blur', () => {
        onTextChange?.(textarea.value);
        if (document.body.contains(textarea)) {
          document.body.removeChild(textarea);
        }
      });
    };

    return (
      <Text
        ref={textRef}
        id={id}
        name='text'
        x={x}
        y={y}
        text={text}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fill={fill}
        width={width}
        draggable={draggable}
        onClick={onClick}
        onTap={onClick}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragEnd={(e) => {
          const node = e.target;
          onDragEnd?.(node.x(), node.y());
        }}
      />
    );
  }
);

TextElement.displayName = 'TextElement';
```

---

## Events and Interactions

### Event Types

```typescript
import Konva from 'konva';

// Common event types
type KonvaMouseEvent = Konva.KonvaEventObject<MouseEvent>;
type KonvaTouchEvent = Konva.KonvaEventObject<TouchEvent>;
type KonvaWheelEvent = Konva.KonvaEventObject<WheelEvent>;
type KonvaDragEvent = Konva.KonvaEventObject<DragEvent>;
```

### Mouse Event Handling

```typescript
import { Stage, Layer, Rect } from 'react-konva';
import { useCallback, ReactElement } from 'react';
import Konva from 'konva';

export const EventHandlingExample = (): ReactElement => {
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Get clicked target
      const clickedOnEmpty = e.target === e.target.getStage();

      if (clickedOnEmpty) {
        // Clicked on empty area - deselect
      } else {
        // Clicked on a shape
        const target = e.target;
        const id = target.id();
      }
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (pos) {
        // Start drawing selection rectangle
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      // Update cursor position for multiplayer
      // Update selection rectangle
    },
    []
  );

  const handleMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Finalize selection
      // Complete drawing operation
    },
    []
  );

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      onClick={handleStageClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
    >
      <Layer>
        <Rect x={50} y={50} width={100} height={100} fill='blue' />
      </Layer>
    </Stage>
  );
};
```

### Drag Events

```typescript
import { Rect } from 'react-konva';
import { useCallback, ReactElement } from 'react';
import Konva from 'konva';

interface DraggableRectProps {
  id: string;
  initialX: number;
  initialY: number;
  onPositionChange: (id: string, x: number, y: number) => void;
}

export const DraggableRect = ({
  id,
  initialX,
  initialY,
  onPositionChange,
}: DraggableRectProps): ReactElement => {
  const handleDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      // Visual feedback - e.g., increase shadow
      const node = e.target;
      node.shadowBlur(15);
    },
    []
  );

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      // Real-time position updates (throttled)
      const node = e.target;
      // Sync position to other users
    },
    []
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      node.shadowBlur(5);
      // Final position update
      onPositionChange(id, node.x(), node.y());
    },
    [id, onPositionChange]
  );

  return (
    <Rect
      id={id}
      x={initialX}
      y={initialY}
      width={100}
      height={100}
      fill='green'
      draggable
      shadowColor='black'
      shadowBlur={5}
      shadowOpacity={0.3}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    />
  );
};
```

---

## Transformations

### Using Transformer

```typescript
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { useState, useRef, useEffect, useCallback, ReactElement } from 'react';
import Konva from 'konva';

interface TransformableRectangleProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (attrs: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }) => void;
}

export const TransformableRectangle = ({
  id,
  x,
  y,
  width,
  height,
  fill,
  isSelected,
  onSelect,
  onChange,
}: TransformableRectangleProps): ReactElement => {
  const shapeRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && shapeRef.current && transformerRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleTransformEnd = useCallback(() => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    });
  }, [onChange]);

  return (
    <>
      <Rect
        ref={shapeRef}
        id={id}
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            x: e.target.x(),
            y: e.target.y(),
            width,
            height,
            rotation: e.target.rotation(),
          });
        }}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit minimum size
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};
```

### Multi-Selection with Transformer

```typescript
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { useState, useRef, useCallback, ReactElement } from 'react';
import Konva from 'konva';

interface Shape {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export const MultiSelectCanvas = (): ReactElement => {
  const [shapes, setShapes] = useState<Shape[]>([
    { id: '1', x: 50, y: 50, width: 100, height: 100, fill: 'red' },
    { id: '2', x: 200, y: 100, width: 80, height: 120, fill: 'blue' },
    { id: '3', x: 350, y: 80, width: 120, height: 80, fill: 'green' },
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const transformerRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);

  const handleSelect = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
      const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;

      if (metaPressed) {
        // Toggle selection
        setSelectedIds((prev) =>
          prev.includes(id)
            ? prev.filter((selectedId) => selectedId !== id)
            : [...prev, id]
        );
      } else {
        // Single select
        setSelectedIds([id]);
      }
    },
    []
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        setSelectedIds([]);
      }
    },
    []
  );

  // Update transformer nodes when selection changes
  useEffect(() => {
    if (!transformerRef.current || !layerRef.current) return;

    const nodes = selectedIds
      .map((id) => layerRef.current?.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];

    transformerRef.current.nodes(nodes);
  }, [selectedIds]);

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      onClick={handleStageClick}
    >
      <Layer ref={layerRef}>
        {shapes.map((shape) => (
          <Rect
            key={shape.id}
            id={shape.id}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill={shape.fill}
            draggable
            onClick={(e) => handleSelect(e, shape.id)}
            stroke={selectedIds.includes(shape.id) ? '#0096ff' : undefined}
            strokeWidth={selectedIds.includes(shape.id) ? 2 : 0}
          />
        ))}
        <Transformer ref={transformerRef} />
      </Layer>
    </Stage>
  );
};
```

---

## Selection System

### Complete Selection Implementation

```typescript
import { Stage, Layer, Rect, Transformer, Group } from 'react-konva';
import { useState, useRef, useCallback, ReactElement } from 'react';
import Konva from 'konva';

interface SelectionRect {
  visible: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const SelectionSystem = (): ReactElement => {
  const [shapes, setShapes] = useState<Shape[]>([
    { id: '1', x: 50, y: 50, width: 100, height: 100, fill: 'red' },
    { id: '2', x: 200, y: 100, width: 80, height: 120, fill: 'blue' },
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionRect, setSelectionRect] = useState<SelectionRect>({
    visible: false,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  });

  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const getPointerPosition = useCallback(() => {
    return stageRef.current?.getPointerPosition() || { x: 0, y: 0 };
  }, []);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Don't start selection if clicking on shape or transformer
      if (e.target !== e.target.getStage()) {
        return;
      }

      const pos = getPointerPosition();
      setSelectionRect({
        visible: true,
        x1: pos.x,
        y1: pos.y,
        x2: pos.x,
        y2: pos.y,
      });
    },
    [getPointerPosition]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!selectionRect.visible) return;

      const pos = getPointerPosition();
      setSelectionRect((prev) => ({
        ...prev,
        x2: pos.x,
        y2: pos.y,
      }));
    },
    [selectionRect.visible, getPointerPosition]
  );

  const handleMouseUp = useCallback(() => {
    if (!selectionRect.visible) return;

    // Calculate selection box
    const box = {
      x: Math.min(selectionRect.x1, selectionRect.x2),
      y: Math.min(selectionRect.y1, selectionRect.y2),
      width: Math.abs(selectionRect.x2 - selectionRect.x1),
      height: Math.abs(selectionRect.y2 - selectionRect.y1),
    };

    // Find shapes within selection box
    const stage = stageRef.current;
    if (stage) {
      const allShapes = stage.find('.shape');
      const selected = allShapes.filter((shape) =>
        Konva.Util.haveIntersection(box, shape.getClientRect())
      );
      setSelectedIds(selected.map((s) => s.id()));
    }

    // Hide selection rectangle
    setSelectionRect((prev) => ({ ...prev, visible: false }));
  }, [selectionRect]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Skip if dragged selection rectangle
      if (selectionRect.visible) return;

      if (e.target === e.target.getStage()) {
        setSelectedIds([]);
      }
    },
    [selectionRect.visible]
  );

  const selectionRectProps = {
    x: Math.min(selectionRect.x1, selectionRect.x2),
    y: Math.min(selectionRect.y1, selectionRect.y2),
    width: Math.abs(selectionRect.x2 - selectionRect.x1),
    height: Math.abs(selectionRect.y2 - selectionRect.y1),
    fill: 'rgba(0, 150, 255, 0.2)',
    stroke: '#0096ff',
    strokeWidth: 1,
    visible: selectionRect.visible,
  };

  return (
    <Stage
      ref={stageRef}
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleStageClick}
    >
      <Layer>
        {shapes.map((shape) => (
          <Rect
            key={shape.id}
            id={shape.id}
            name='shape'
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill={shape.fill}
            draggable
            onClick={(e) => {
              const metaPressed =
                e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
              if (metaPressed) {
                setSelectedIds((prev) =>
                  prev.includes(shape.id)
                    ? prev.filter((id) => id !== shape.id)
                    : [...prev, shape.id]
                );
              } else {
                setSelectedIds([shape.id]);
              }
            }}
          />
        ))}
        <Transformer ref={transformerRef} />
        <Rect {...selectionRectProps} listening={false} />
      </Layer>
    </Stage>
  );
};
```

---

## Pan and Zoom

### Wheel Zoom Implementation

```typescript
import { Stage, Layer } from 'react-konva';
import { useState, useCallback, ReactElement } from 'react';
import Konva from 'konva';

interface IPosition {
  x: number;
  y: number;
}

interface IStageScale extends IPosition {}

const SCALE_BY = 1.05;
const MIN_SCALE = 0.1;
const MAX_SCALE = 10;

export const PanZoomCanvas = (): ReactElement => {
  const [stagePosition, setStagePosition] = useState<IPosition>({
    x: 0,
    y: 0,
  });
  const [stageScale, setStageScale] = useState<IStageScale>({ x: 1, y: 1 });

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = e.target.getStage();
      if (!stage) return;

      const oldScale = stageScale.x;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - stagePosition.x) / oldScale,
        y: (pointer.y - stagePosition.y) / oldScale,
      };

      // Zoom direction
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY)
      );

      setStageScale({ x: newScale, y: newScale });
      setStagePosition({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [stagePosition, stageScale]
  );

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setStagePosition({
      x: e.target.x(),
      y: e.target.y(),
    });
  }, []);

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      x={stagePosition.x}
      y={stagePosition.y}
      scaleX={stageScale.x}
      scaleY={stageScale.y}
      draggable
      onWheel={handleWheel}
      onDragEnd={handleDragEnd}
    >
      <Layer>{/* Your shapes */}</Layer>
    </Stage>
  );
};
```

### Touch Pinch-to-Zoom

```typescript
import { useState, useCallback } from 'react';
import Konva from 'konva';

// Enable hit detection during drag for touch
if (typeof window !== 'undefined') {
  (window as unknown as { Konva: typeof Konva }).Konva.hitOnDragEnabled = true;
}

interface TouchState {
  lastCenter: IPosition | null;
  lastDist: number;
}

export const usePinchZoom = () => {
  const [touchState, setTouchState] = useState<TouchState>({
    lastCenter: null,
    lastDist: 0,
  });

  const getDistance = (p1: Touch, p2: Touch): number => {
    return Math.sqrt(
      Math.pow(p2.clientX - p1.clientX, 2) +
        Math.pow(p2.clientY - p1.clientY, 2)
    );
  };

  const getCenter = (p1: Touch, p2: Touch): IPosition => {
    return {
      x: (p1.clientX + p2.clientX) / 2,
      y: (p1.clientY + p2.clientY) / 2,
    };
  };

  const handleTouchMove = useCallback(
    (
      e: Konva.KonvaEventObject<TouchEvent>,
      stagePos: IPosition,
      stageScale: IPosition,
      setStagePos: (pos: IPosition) => void,
      setStageScale: (scale: IPosition) => void
    ) => {
      e.evt.preventDefault();
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      if (!touch1 || !touch2) return;

      const stage = e.target.getStage();
      if (stage?.isDragging()) {
        stage.stopDrag();
      }

      const p1 = { clientX: touch1.clientX, clientY: touch1.clientY } as Touch;
      const p2 = { clientX: touch2.clientX, clientY: touch2.clientY } as Touch;

      const newCenter = getCenter(p1, p2);
      const dist = getDistance(p1, p2);

      if (!touchState.lastCenter) {
        setTouchState({ lastCenter: newCenter, lastDist: dist });
        return;
      }

      const scale = stageScale.x * (dist / touchState.lastDist);
      const pointTo = {
        x: (newCenter.x - stagePos.x) / stageScale.x,
        y: (newCenter.y - stagePos.y) / stageScale.x,
      };

      setStageScale({ x: scale, y: scale });
      setStagePos({
        x:
          newCenter.x -
          pointTo.x * scale +
          (newCenter.x - touchState.lastCenter.x),
        y:
          newCenter.y -
          pointTo.y * scale +
          (newCenter.y - touchState.lastCenter.y),
      });

      setTouchState({ lastCenter: newCenter, lastDist: dist });
    },
    [touchState]
  );

  const handleTouchEnd = useCallback(() => {
    setTouchState({ lastCenter: null, lastDist: 0 });
  }, []);

  return { handleTouchMove, handleTouchEnd };
};
```

---

## Performance Optimization

### Layer Caching

```typescript
import { useEffect, useRef } from 'react';
import { Layer } from 'react-konva';
import Konva from 'konva';

export const useCachedLayer = (shouldCache: boolean) => {
  const layerRef = useRef<Konva.Layer>(null);

  useEffect(() => {
    if (layerRef.current) {
      if (shouldCache) {
        layerRef.current.cache();
      } else {
        layerRef.current.clearCache();
      }
    }
  }, [shouldCache]);

  return layerRef;
};
```

### Batched Draw

```typescript
import { useCallback, useRef } from 'react';
import Konva from 'konva';

export const useBatchDraw = () => {
  const pendingRef = useRef(false);
  const layerRef = useRef<Konva.Layer>(null);

  const batchDraw = useCallback(() => {
    if (pendingRef.current || !layerRef.current) return;

    pendingRef.current = true;
    requestAnimationFrame(() => {
      layerRef.current?.batchDraw();
      pendingRef.current = false;
    });
  }, []);

  return { layerRef, batchDraw };
};
```

### Virtual Rendering for Large Boards

```typescript
import { useMemo } from 'react';

interface Shape {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export const useVisibleShapes = (
  shapes: Shape[],
  viewport: Viewport,
  padding: number = 100
): Shape[] => {
  return useMemo(() => {
    const viewportBounds = {
      left: -viewport.x / viewport.scale - padding,
      top: -viewport.y / viewport.scale - padding,
      right: (-viewport.x + viewport.width) / viewport.scale + padding,
      bottom: (-viewport.y + viewport.height) / viewport.scale + padding,
    };

    return shapes.filter((shape) => {
      return (
        shape.x + shape.width > viewportBounds.left &&
        shape.x < viewportBounds.right &&
        shape.y + shape.height > viewportBounds.top &&
        shape.y < viewportBounds.bottom
      );
    });
  }, [shapes, viewport, padding]);
};
```

### Throttled Updates

```typescript
import { useCallback, useRef } from 'react';

export const useThrottledUpdate = <T extends unknown[]>(
  callback: (...args: T) => void,
  delay: number = 16
) => {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: T) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall.current;

      if (timeSinceLastCall >= delay) {
        lastCall.current = now;
        callback(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now();
          callback(...args);
          timeoutRef.current = null;
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  );
};
```

---

## Integration with Firebase

### Synced Canvas Component

```typescript
import { Stage, Layer, Rect } from 'react-konva';
import { useState, useEffect, useCallback, ReactElement } from 'react';
import { subscribeToObjects, updateObject, IBoardObject } from '@/modules/sync/firestoreService';
import { useThrottledUpdate } from './useThrottledUpdate';

interface SyncedCanvasProps {
  boardId: string;
}

export const SyncedCanvas = ({ boardId }: SyncedCanvasProps): ReactElement => {
  const [objects, setObjects] = useState<IBoardObject[]>([]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToObjects(boardId, (updatedObjects) => {
      setObjects(updatedObjects);
    });

    return () => unsubscribe();
  }, [boardId]);

  // Throttled position update
  const throttledUpdate = useThrottledUpdate(
    (objectId: string, x: number, y: number) => {
      updateObject(boardId, objectId, { x, y });
    },
    50 // 20 updates per second max
  );

  const handleDragMove = useCallback(
    (objectId: string, x: number, y: number) => {
      // Optimistic local update
      setObjects((prev) =>
        prev.map((obj) => (obj.id === objectId ? { ...obj, x, y } : obj))
      );
      // Sync to Firebase
      throttledUpdate(objectId, x, y);
    },
    [throttledUpdate]
  );

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        {objects.map((obj) => (
          <Rect
            key={obj.id}
            id={obj.id}
            x={obj.x}
            y={obj.y}
            width={obj.width}
            height={obj.height}
            fill={obj.fill}
            draggable
            onDragMove={(e) => {
              handleDragMove(obj.id, e.target.x(), e.target.y());
            }}
          />
        ))}
      </Layer>
    </Stage>
  );
};
```

---

## Best Practices Summary

1. **Layer Strategy**: Use separate layers for different update frequencies
2. **Caching**: Cache static or infrequently updated layers
3. **Throttling**: Throttle mouse/touch events for better performance
4. **Virtual Rendering**: Only render shapes visible in the viewport
5. **Batch Operations**: Use `batchDraw()` for multiple updates
6. **Event Delegation**: Use stage-level events when possible
7. **Memory Management**: Clean up listeners and caches on unmount
