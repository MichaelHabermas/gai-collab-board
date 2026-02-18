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
import { cn } from '@/lib/utils';
import type { ShapeType } from '@/types';

export type ToolMode = 'select' | 'pan' | ShapeType;

interface IToolbarProps {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  canEdit: boolean;
  /** When true, toolbar is rendered inline (e.g. inside mobile sheet) without absolute positioning */
  embedded?: boolean;
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
  ({
    icon,
    label,
    isActive,
    onClick,
    disabled = false,
    testId,
  }: IToolButtonProps): ReactElement => (
    <Button
      variant={isActive ? 'default' : 'ghost'}
      size='icon'
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        'w-10 h-10 relative group',
        isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      title={label}
    >
      {icon}
      <span className='absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-card text-card-foreground border border-border text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-md'>
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
      type='button'
      onClick={onClick}
      className={cn(
        'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
        isActive ? 'border-primary-foreground ring-2 ring-ring' : 'border-transparent'
      )}
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
    embedded = false,
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

    const wrapperClassName = embedded
      ? 'flex flex-col gap-1'
      : 'absolute left-4 top-1/2 -translate-y-1/2 z-20';
    const innerClassName = cn(
      'bg-card/95 backdrop-blur-sm rounded-xl p-2 shadow-xl border border-border flex flex-col gap-1'
    );

    return (
      <div className={wrapperClassName} data-testid={embedded ? 'toolbar-embedded' : 'toolbar'}>
        <div className={innerClassName}>
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
          <div className='h-px bg-border my-1' />

          {/* Color picker toggle */}
          <div className='relative'>
            <button
              type='button'
              onClick={() => setShowColors(!showColors)}
              data-testid='color-picker-toggle'
              className={cn(
                'w-10 h-10 rounded-lg border-2 transition-all',
                showColors ? 'border-primary' : 'border-border hover:border-muted-foreground'
              )}
              style={{ backgroundColor: activeColor }}
              title='Color'
            />

            {/* Color palette popover */}
            {showColors && (
              <div className='absolute left-full ml-2 top-0 bg-card rounded-lg p-3 shadow-xl border border-border'>
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
                <div className='mt-2 pt-2 border-t border-border grid grid-cols-3 gap-2'>
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
