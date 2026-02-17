import { memo, useState, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import {
  StickyNote,
  Square,
  Circle,
  Minus,
  Type,
  Frame,
  ArrowRight,
  MousePointer2,
  Hand,
} from 'lucide-react';
import { STICKY_COLORS } from './shapes/StickyNote';
import type { ShapeType } from '@/types';

export type ToolMode = 'select' | 'pan' | ShapeType;

interface IToolbarProps {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  canEdit: boolean;
}

interface IToolButtonProps {
  icon: ReactElement;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}

const ToolButton = memo(
  ({ icon, label, isActive, onClick, disabled = false, testId }: IToolButtonProps): ReactElement => (
    <Button
      variant={isActive ? 'default' : 'ghost'}
      size='icon'
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`
        w-10 h-10 relative group
        ${isActive ? 'bg-primary text-primary-foreground' : 'text-slate-300 hover:text-white hover:bg-slate-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      title={label}
    >
      {icon}
      <span className='absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50'>
        {label}
      </span>
    </Button>
  )
);

ToolButton.displayName = 'ToolButton';

interface IColorSwatchProps {
  color: string;
  isActive: boolean;
  onClick: () => void;
}

const ColorSwatch = memo(
  ({ color, isActive, onClick }: IColorSwatchProps): ReactElement => (
    <button
      onClick={onClick}
      className={`
      w-6 h-6 rounded-full border-2 transition-transform hover:scale-110
      ${isActive ? 'border-white ring-2 ring-primary' : 'border-transparent'}
    `}
      style={{ backgroundColor: color }}
      title={color}
    />
  )
);

ColorSwatch.displayName = 'ColorSwatch';

/**
 * Toolbar component for canvas tools and color selection.
 * Provides tool buttons for selection, shapes, and a color palette.
 */
export const Toolbar = memo(
  ({
    activeTool,
    onToolChange,
    activeColor,
    onColorChange,
    canEdit,
  }: IToolbarProps): ReactElement => {
    const [showColors, setShowColors] = useState(false);

    const tools: Array<{
      mode: ToolMode;
      icon: ReactElement;
      label: string;
      requiresEdit?: boolean;
    }> = [
      { mode: 'select', icon: <MousePointer2 className='h-5 w-5' />, label: 'Select (V)' },
      { mode: 'pan', icon: <Hand className='h-5 w-5' />, label: 'Pan (Space)' },
      {
        mode: 'sticky',
        icon: <StickyNote className='h-5 w-5' />,
        label: 'Sticky Note (S)',
        requiresEdit: true,
      },
      {
        mode: 'rectangle',
        icon: <Square className='h-5 w-5' />,
        label: 'Rectangle (R)',
        requiresEdit: true,
      },
      {
        mode: 'circle',
        icon: <Circle className='h-5 w-5' />,
        label: 'Circle (C)',
        requiresEdit: true,
      },
      { mode: 'line', icon: <Minus className='h-5 w-5' />, label: 'Line (L)', requiresEdit: true },
      { mode: 'text', icon: <Type className='h-5 w-5' />, label: 'Text (T)', requiresEdit: true },
      {
        mode: 'frame',
        icon: <Frame className='h-5 w-5' />,
        label: 'Frame (F)',
        requiresEdit: true,
      },
      {
        mode: 'connector',
        icon: <ArrowRight className='h-5 w-5' />,
        label: 'Connector (A)',
        requiresEdit: true,
      },
    ];

    return (
      <div className='absolute left-4 top-1/2 -translate-y-1/2 z-20' data-testid='toolbar'>
        <div className='bg-slate-800/95 backdrop-blur-sm rounded-xl p-2 shadow-xl border border-slate-700 flex flex-col gap-1'>
          {/* Tool buttons */}
          {tools.map((tool) => (
            <ToolButton
              key={tool.mode}
              icon={tool.icon}
              label={tool.label}
              isActive={activeTool === tool.mode}
              onClick={() => onToolChange(tool.mode)}
              disabled={tool.requiresEdit && !canEdit}
              testId={`tool-${tool.mode}`}
            />
          ))}

          {/* Divider */}
          <div className='h-px bg-slate-600 my-1' />

          {/* Color picker toggle */}
          <div className='relative'>
            <button
              onClick={() => setShowColors(!showColors)}
              data-testid='color-picker-toggle'
              className={`
                w-10 h-10 rounded-lg border-2 transition-all
                ${showColors ? 'border-primary' : 'border-slate-600 hover:border-slate-500'}
              `}
              style={{ backgroundColor: activeColor }}
              title='Color'
            />

            {/* Color palette popover */}
            {showColors && (
              <div className='absolute left-full ml-2 top-0 bg-slate-800 rounded-lg p-3 shadow-xl border border-slate-700'>
                <div className='grid grid-cols-3 gap-2'>
                  {Object.entries(STICKY_COLORS).map(([name, color]) => (
                    <ColorSwatch
                      key={name}
                      color={color}
                      isActive={activeColor === color}
                      onClick={() => {
                        onColorChange(color);
                        setShowColors(false);
                      }}
                    />
                  ))}
                </div>
                {/* Additional colors */}
                <div className='mt-2 pt-2 border-t border-slate-600 grid grid-cols-3 gap-2'>
                  <ColorSwatch
                    color='#3b82f6'
                    isActive={activeColor === '#3b82f6'}
                    onClick={() => {
                      onColorChange('#3b82f6');
                      setShowColors(false);
                    }}
                  />
                  <ColorSwatch
                    color='#ef4444'
                    isActive={activeColor === '#ef4444'}
                    onClick={() => {
                      onColorChange('#ef4444');
                      setShowColors(false);
                    }}
                  />
                  <ColorSwatch
                    color='#ffffff'
                    isActive={activeColor === '#ffffff'}
                    onClick={() => {
                      onColorChange('#ffffff');
                      setShowColors(false);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

Toolbar.displayName = 'Toolbar';
