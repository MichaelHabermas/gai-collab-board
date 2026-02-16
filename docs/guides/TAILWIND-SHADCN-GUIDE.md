# Tailwind CSS v4 + Shadcn/ui Guide for CollabBoard

## Overview

Tailwind CSS v4 is a utility-first CSS framework that provides rapid styling capabilities. Shadcn/ui is a collection of beautifully designed, accessible UI components built on top of Radix UI primitives. Together, they provide a powerful, customizable UI foundation for CollabBoard.

**Official Documentation**:

- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [Shadcn/ui Docs](https://ui.shadcn.com/docs)

---

## Table of Contents

1. [Tailwind CSS v4 Setup](#tailwind-css-v4-setup)
2. [Configuration](#configuration)
3. [Design System & Theming](#design-system--theming)
4. [Shadcn/ui Installation](#shadcnui-installation)
5. [Core Components](#core-components)
6. [Custom Components](#custom-components)
7. [Dark Mode](#dark-mode)
8. [Responsive Design](#responsive-design)
9. [Animation & Transitions](#animation--transitions)
10. [Best Practices](#best-practices)

---

## Tailwind CSS v4 Setup

### Installation with Vite

Tailwind CSS v4 has a dedicated Vite plugin for optimal performance:

```bash
bun add tailwindcss @tailwindcss/vite
```

### Vite Configuration

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

### Create CSS Entry Point

Create `src/index.css`:

```css
@import 'tailwindcss';

/* Custom theme variables */
@theme {
  /* Colors */
  --color-primary: #3b82f6;
  --color-primary-foreground: #ffffff;
  --color-secondary: #6b7280;
  --color-secondary-foreground: #ffffff;
  --color-accent: #f59e0b;
  --color-accent-foreground: #ffffff;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  
  /* Background */
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  
  /* Card */
  --color-card: #ffffff;
  --color-card-foreground: #0f172a;
  
  /* Border */
  --color-border: #e2e8f0;
  --color-input: #e2e8f0;
  --color-ring: #3b82f6;
  
  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

/* Dark mode overrides */
@theme dark {
  --color-background: #0f172a;
  --color-foreground: #f8fafc;
  --color-muted: #1e293b;
  --color-muted-foreground: #94a3b8;
  --color-card: #1e293b;
  --color-card-foreground: #f8fafc;
  --color-border: #334155;
  --color-input: #334155;
}
```

### Import in Main Entry

Update `src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

---

## Configuration

### Path Aliases

Update `tsconfig.json` for cleaner imports:

```json
{
  "compilerOptions": {
    'baseUrl': '.',
    'paths': {
      "@/*": ["./src/*"]
    }
  }
}
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Utility Function for Class Merging

Create `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};
```

Install dependencies:

```bash
bun add clsx tailwind-merge
```

---

## Design System & Theming

### Color Palette for CollabBoard

```css
@theme {
  /* Brand Colors */
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-300: #93c5fd;
  --color-brand-400: #60a5fa;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-800: #1e40af;
  --color-brand-900: #1e3a8a;
  
  /* Sticky Note Colors */
  --color-sticky-yellow: #fef08a;
  --color-sticky-pink: #fda4af;
  --color-sticky-blue: #93c5fd;
  --color-sticky-green: #86efac;
  --color-sticky-purple: #c4b5fd;
  --color-sticky-orange: #fed7aa;
  
  /* Canvas Colors */
  --color-canvas-bg: #f8fafc;
  --color-canvas-grid: #e2e8f0;
  --color-canvas-selection: rgba(59, 130, 246, 0.2);
  
  /* Cursor Colors (for multiplayer) */
  --color-cursor-1: #ef4444;
  --color-cursor-2: #f97316;
  --color-cursor-3: #eab308;
  --color-cursor-4: #22c55e;
  --color-cursor-5: #06b6d4;
  --color-cursor-6: #8b5cf6;
  --color-cursor-7: #ec4899;
  --color-cursor-8: #6366f1;
}
```

### Typography Scale

```css
@theme {
  /* Font Family */
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  
  /* Font Sizes */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  
  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}
```

---

## Shadcn/ui Installation

### Initialize Shadcn/ui

```bash
bunx --bun shadcn@latest init
```

Follow the prompts:

- Style: Default
- Base color: Slate
- CSS variables: Yes

This creates:

- `components.json` - Configuration file
- `src/components/ui/` - Component directory
- Updates to `src/index.css` (or `globals.css`)

### Install Core Components

```bash
# Essential components for CollabBoard
bunx --bun shadcn@latest add button
bunx --bun shadcn@latest add input
bunx --bun shadcn@latest add dialog
bunx --bun shadcn@latest add dropdown-menu
bunx --bun shadcn@latest add tooltip
bunx --bun shadcn@latest add avatar
bunx --bun shadcn@latest add card
bunx --bun shadcn@latest add toast
bunx --bun shadcn@latest add sonner
bunx --bun shadcn@latest add popover
bunx --bun shadcn@latest add separator
bunx --bun shadcn@latest add scroll-area
```

---

## Core Components

### Button Component

Located at `src/components/ui/button.tsx`:

```typescript
import { forwardRef, ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
```

### Usage Examples

```typescript
import { Button } from '@/components/ui/button';
import { ReactElement } from 'react';

export const ButtonExamples = (): ReactElement => {
  return (
    <div className='flex flex-wrap gap-4'>
      <Button>Default</Button>
      <Button variant='secondary'>Secondary</Button>
      <Button variant='outline'>Outline</Button>
      <Button variant='ghost'>Ghost</Button>
      <Button variant='destructive'>Destructive</Button>
      <Button size='sm'>Small</Button>
      <Button size='lg'>Large</Button>
      <Button size='icon'>
        <span className='sr-only'>Icon button</span>
        +
      </Button>
    </div>
  );
};
```

### Dialog Component

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReactElement, useState } from 'react';

interface CreateBoardDialogProps {
  onCreateBoard: (name: string) => void;
}

export const CreateBoardDialog = ({
  onCreateBoard,
}: CreateBoardDialogProps): ReactElement => {
  const [boardName, setBoardName] = useState('');
  const [open, setOpen] = useState(false);

  const handleCreate = () => {
    if (boardName.trim()) {
      onCreateBoard(boardName.trim());
      setBoardName('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Board</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>
            Enter a name for your new collaborative whiteboard.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='board-name'>Board Name</Label>
            <Input
              id='board-name'
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder='My Awesome Board'
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={!boardName.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### Toast Notifications with Sonner

Setup in `src/components/providers/ToastProvider.tsx`:

```typescript
import { Toaster } from '@/components/ui/sonner';
import { ReactElement } from 'react';

export const ToastProvider = (): ReactElement => {
  return (
    <Toaster
      position='bottom-right'
      toastOptions={{
        classNames: {
          toast: 'bg-background border-border',
          title: 'text-foreground',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
        },
      }}
    />
  );
};
```

Usage:

```typescript
import { toast } from 'sonner';

// Success toast
toast.success('Board created successfully!');

// Error toast
toast.error('Failed to save changes', {
  description: 'Please check your connection and try again.',
});

// Loading toast with promise
toast.promise(saveBoard(boardId), {
  loading: 'Saving...',
  success: 'Board saved!',
  error: 'Failed to save board',
});

// Custom action toast
toast('New collaborator joined', {
  description: 'John Doe has joined the board',
  action: {
    label: 'View',
    onClick: () => scrollToUser('john-doe'),
  },
});
```

---

## Custom Components

### Toolbar Component

```typescript
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ReactElement } from 'react';

type ToolType = 'select' | 'sticky' | 'rectangle' | 'circle' | 'line' | 'text';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

interface ToolButtonProps {
  tool: ToolType;
  icon: ReactElement;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const ToolButton = ({
  tool,
  icon,
  label,
  isActive,
  onClick,
}: ToolButtonProps): ReactElement => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isActive ? 'default' : 'ghost'}
          size='icon'
          onClick={onClick}
          className={cn(
            'h-10 w-10',
            isActive && 'bg-primary text-primary-foreground'
          )}
        >
          {icon}
          <span className='sr-only'>{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side='right'>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const Toolbar = ({
  activeTool,
  onToolChange,
}: ToolbarProps): ReactElement => {
  const tools: Array<{ type: ToolType; icon: ReactElement; label: string }> = [
    { type: 'select', icon: <span>↖</span>, label: 'Select (V)' },
    { type: 'sticky', icon: <span>📝</span>, label: 'Sticky Note (S)' },
    { type: 'rectangle', icon: <span>□</span>, label: 'Rectangle (R)' },
    { type: 'circle', icon: <span>○</span>, label: 'Circle (C)' },
    { type: 'line', icon: <span>╱</span>, label: 'Line (L)' },
    { type: 'text', icon: <span>T</span>, label: 'Text (T)' },
  ];

  return (
    <div className='fixed left-4 top-1/2 -translate-y-1/2 z-50'>
      <div className='flex flex-col gap-1 rounded-lg border bg-background p-2 shadow-lg'>
        {tools.map((tool, index) => (
          <div key={tool.type}>
            <ToolButton
              tool={tool.type}
              icon={tool.icon}
              label={tool.label}
              isActive={activeTool === tool.type}
              onClick={() => onToolChange(tool.type)}
            />
            {index === 0 && <Separator className='my-1' />}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Color Picker Component

```typescript
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ReactElement, useState } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#fef08a', // Yellow
  '#fda4af', // Pink
  '#93c5fd', // Blue
  '#86efac', // Green
  '#c4b5fd', // Purple
  '#fed7aa', // Orange
  '#fecaca', // Red
  '#e5e7eb', // Gray
  '#ffffff', // White
];

export const ColorPicker = ({
  value,
  onChange,
  colors = DEFAULT_COLORS,
}: ColorPickerProps): ReactElement => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className='h-8 w-8 p-0 border-2'
          style={{ backgroundColor: value }}
        >
          <span className='sr-only'>Pick color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-3' align='start'>
        <div className='grid grid-cols-3 gap-2'>
          {colors.map((color) => (
            <button
              key={color}
              className={cn(
                'h-8 w-8 rounded-md border-2 transition-transform hover:scale-110',
                value === color ? 'border-primary ring-2 ring-primary' : 'border-border'
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                onChange(color);
                setOpen(false);
              }}
            >
              <span className='sr-only'>{color}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
```

### Presence Avatars Component

```typescript
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ReactElement } from 'react';

interface User {
  id: string;
  displayName: string;
  photoURL?: string;
  color: string;
}

interface PresenceAvatarsProps {
  users: User[];
  maxVisible?: number;
}

export const PresenceAvatars = ({
  users,
  maxVisible = 5,
}: PresenceAvatarsProps): ReactElement => {
  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = Math.max(0, users.length - maxVisible);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className='flex items-center -space-x-2'>
      <TooltipProvider>
        {visibleUsers.map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  'h-8 w-8 border-2 border-background ring-2',
                  'transition-transform hover:scale-110 hover:z-10'
                )}
                style={{ ringColor: user.color }}
              >
                <AvatarImage src={user.photoURL} alt={user.displayName} />
                <AvatarFallback
                  className='text-xs font-medium'
                  style={{ backgroundColor: user.color }}
                >
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.displayName}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className='h-8 w-8 border-2 border-background bg-muted'>
                <AvatarFallback className='text-xs font-medium'>
                  +{remainingCount}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{remainingCount} more users</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
};
```

---

## Dark Mode

### Implementation Strategy

Tailwind CSS v4 supports dark mode via CSS variables and the `@theme dark` directive:

```css
/* In src/index.css */
@theme {
  /* Light mode defaults */
  --color-background: #ffffff;
  --color-foreground: #0f172a;
}

@theme dark {
  /* Dark mode overrides */
  --color-background: #0f172a;
  --color-foreground: #f8fafc;
}
```

### Theme Toggle Component

```typescript
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReactElement, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export const ThemeToggle = (): ReactElement => {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const root = window.document.documentElement;
    const savedTheme = localStorage.getItem('theme') as Theme | null;

    if (savedTheme) {
      setTheme(savedTheme);
    }

    const applyTheme = (t: Theme) => {
      root.classList.remove('light', 'dark');

      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
          .matches
          ? 'dark'
          : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(t);
      }
    };

    applyTheme(theme);
  }, [theme]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='icon'>
          <span className='dark:hidden'>☀️</span>
          <span className='hidden dark:inline'>🌙</span>
          <span className='sr-only'>Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => handleThemeChange('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

### Dark Mode Aware Components

```typescript
// Example: Dark mode aware card
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactElement, ReactNode } from 'react';

interface BoardCardProps {
  title: string;
  children: ReactNode;
}

export const BoardCard = ({ title, children }: BoardCardProps): ReactElement => {
  return (
    <Card className='bg-card text-card-foreground border-border'>
      <CardHeader>
        <CardTitle className='text-foreground'>{title}</CardTitle>
      </CardHeader>
      <CardContent className='text-muted-foreground'>{children}</CardContent>
    </Card>
  );
};
```

---

## Responsive Design

### Breakpoint Reference

Tailwind's default breakpoints:

| Breakpoint | Min Width | CSS |
| ---------- | --------- | --- |
| `sm` | 640px | `@media (min-width: 640px)` |
| `md` | 768px | `@media (min-width: 768px)` |
| `lg` | 1024px | `@media (min-width: 1024px)` |
| `xl` | 1280px | `@media (min-width: 1280px)` |
| `2xl` | 1536px | `@media (min-width: 1536px)` |

### Responsive Layout Example

```typescript
import { ReactElement } from 'react';

export const ResponsiveLayout = (): ReactElement => {
  return (
    <div className='min-h-screen flex flex-col'>
      {/* Header - fixed on mobile, static on desktop */}
      <header className='sticky top-0 z-50 bg-background border-b md:static'>
        <div className='container flex h-14 items-center px-4 md:px-6'>
          <span className='text-lg font-semibold'>CollabBoard</span>
        </div>
      </header>

      <div className='flex flex-1 flex-col md:flex-row'>
        {/* Sidebar - hidden on mobile, visible on desktop */}
        <aside className='hidden md:flex md:w-64 md:flex-col md:border-r'>
          <div className='flex-1 p-4'>
            {/* Sidebar content */}
          </div>
        </aside>

        {/* Main content */}
        <main className='flex-1'>
          {/* Canvas area */}
          <div className='h-[calc(100vh-3.5rem)] md:h-[calc(100vh-0px)]'>
            {/* Konva canvas */}
          </div>
        </main>

        {/* Mobile bottom toolbar - visible on mobile only */}
        <nav className='fixed bottom-0 left-0 right-0 border-t bg-background md:hidden'>
          <div className='flex h-14 items-center justify-around px-4'>
            {/* Mobile nav items */}
          </div>
        </nav>
      </div>
    </div>
  );
};
```

### Responsive Toolbar

```typescript
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ReactElement } from 'react';

export const ResponsiveToolbar = (): ReactElement => {
  return (
    <>
      {/* Desktop toolbar - visible on md and up */}
      <div className='hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 z-50'>
        <div className='flex flex-col gap-1 rounded-lg border bg-background p-2 shadow-lg'>
          {/* Desktop tool buttons */}
        </div>
      </div>

      {/* Mobile toolbar - visible on mobile only */}
      <div className='md:hidden'>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              className='fixed bottom-20 right-4 z-50 h-12 w-12 rounded-full shadow-lg'
            >
              🛠️
            </Button>
          </SheetTrigger>
          <SheetContent side='bottom' className='h-auto'>
            <SheetHeader>
              <SheetTitle>Tools</SheetTitle>
              <SheetDescription>Select a tool to use on the board</SheetDescription>
            </SheetHeader>
            <div className='grid grid-cols-4 gap-4 py-4'>
              {/* Mobile tool buttons */}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};
```

---

## Animation & Transitions

### Custom Animations

Add to `src/index.css`:

```css
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse-soft {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Animation utility classes */
.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}

.animate-pulse-soft {
  animation: pulse-soft 2s ease-in-out infinite;
}
```

### Transition Utilities

```typescript
import { cn } from '@/lib/utils';
import { ReactElement, ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const FadeIn = ({
  children,
  className,
  delay = 0,
}: FadeInProps): ReactElement => {
  return (
    <div
      className={cn('animate-fade-in', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Staggered list animation
interface StaggeredListProps {
  items: ReactNode[];
  className?: string;
  staggerDelay?: number;
}

export const StaggeredList = ({
  items,
  className,
  staggerDelay = 50,
}: StaggeredListProps): ReactElement => {
  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          key={index}
          className='animate-slide-up'
          style={{ animationDelay: `${index * staggerDelay}ms` }}
        >
          {item}
        </div>
      ))}
    </div>
  );
};
```

### Hover and Focus States

```typescript
// Example component with rich interactions
import { cn } from '@/lib/utils';
import { ReactElement } from 'react';

interface InteractiveCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

export const InteractiveCard = ({
  title,
  description,
  onClick,
}: InteractiveCardProps): ReactElement => {
  return (
    <button
      onClick={onClick}
      className={cn(
        // Base styles
        'group relative w-full rounded-lg border bg-card p-4 text-left',
        // Transitions
        'transition-all duration-200 ease-out',
        // Hover states
        'hover:border-primary hover:shadow-md hover:-translate-y-0.5',
        // Focus states
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        // Active states
        'active:translate-y-0 active:shadow-sm'
      )}
    >
      <h3 className='font-semibold text-card-foreground group-hover:text-primary transition-colors'>
        {title}
      </h3>
      <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
    </button>
  );
};
```

---

## Best Practices

### 1. Consistent Spacing

Use Tailwind's spacing scale consistently:

```typescript
// Good - consistent spacing scale
<div className='p-4 space-y-4'>
  <header className='mb-6'>...</header>
  <main className='px-4 py-6'>...</main>
</div>

// Avoid - arbitrary values
<div className='p-[17px] space-y-[13px]'>...</div>
```

### 2. Semantic Color Names

Use semantic color names instead of raw colors:

```typescript
// Good - semantic colors
<div className='bg-background text-foreground border-border'>
  <button className='bg-primary text-primary-foreground'>Click</button>
  <span className='text-muted-foreground'>Helper text</span>
</div>

// Avoid - raw color values
<div className='bg-white text-gray-900 border-gray-200'>
  <button className='bg-blue-500 text-white'>Click</button>
</div>
```

### 3. Component Composition

Create reusable primitives:

```typescript
// Define base styles
const cardStyles = 'rounded-lg border bg-card text-card-foreground shadow';

// Compose variations
export const Card = ({ className, ...props }) => (
  <div className={cn(cardStyles, className)} {...props} />
);

export const CardHighlighted = ({ className, ...props }) => (
  <Card className={cn('border-primary', className)} {...props} />
);
```

### 4. Responsive Mobile-First

Always design mobile-first:

```typescript
// Good - mobile-first approach
<div className='flex flex-col md:flex-row'>
  <aside className='w-full md:w-64'>...</aside>
  <main className='flex-1'>...</main>
</div>

// The component works on mobile by default,
// then adds desktop styles at md breakpoint
```

### 5. Accessibility

Ensure components are accessible:

```typescript
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

// Icon buttons need labels
<Button size='icon'>
  <span className='sr-only'>Close dialog</span>
  ✕
</Button>

// Color contrast
<span className='text-muted-foreground'>
  {/* Ensure 4.5:1 contrast ratio */}
</span>

// Focus indicators
<button className='focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'>
  ...
</button>
```

---

## File Structure

Recommended structure for UI components:

```text
src/
├── components/
│   ├── ui/                    # Shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── canvas/               # Canvas-specific components
│   │   ├── Toolbar.tsx
│   │   ├── ColorPicker.tsx
│   │   └── ...
│   ├── board/                # Board-related components
│   │   ├── BoardCard.tsx
│   │   ├── CreateBoardDialog.tsx
│   │   └── ...
│   ├── presence/             # Presence/collaboration UI
│   │   ├── PresenceAvatars.tsx
│   │   ├── CursorOverlay.tsx
│   │   └── ...
│   └── providers/            # Context providers
│       ├── ThemeProvider.tsx
│       └── ToastProvider.tsx
├── lib/
│   └── utils.ts              # cn() and other utilities
└── index.css                 # Tailwind imports and theme
```
