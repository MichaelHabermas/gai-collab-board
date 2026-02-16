# Development Environment Guide for CollabBoard

## Overview

This guide covers the development environment setup for CollabBoard, including Vite (build tool), Bun (JavaScript runtime & package manager), and TypeScript configuration. Together, these tools provide a fast, type-safe development experience.

**Official Documentation**:

- [Vite Docs](https://vitejs.dev/guide/)
- [Bun Docs](https://bun.sh/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Initialization](#project-initialization)
3. [Bun Setup](#bun-setup)
4. [Vite Configuration](#vite-configuration)
5. [TypeScript Configuration](#typescript-configuration)
6. [Environment Variables](#environment-variables)
7. [ESLint & Prettier](#eslint--prettier)
8. [Git Configuration](#git-configuration)
9. [VS Code Setup](#vs-code-setup)
10. [Scripts & Commands](#scripts--commands)

---

## Prerequisites

### System Requirements

- **Operating System**: Windows 10/11, macOS, or Linux
- **Git**: Version 2.30+
- **Bun**: Version 1.0+ (recommended) or Node.js 20+

### Install Bun

**Windows (PowerShell)**:

```powershell
powershell -c 'irm bun.sh/install.ps1 | iex'
```

**macOS/Linux**:

```bash
curl -fsSL https://bun.sh/install | bash
```

**Verify Installation**:

```bash
bun --version
```

---

## Project Initialization

### Create New Project

```bash
# Create project directory
mkdir CollabBoard
cd CollabBoard

# Initialize with Bun
bun init

# Create Vite + React + TypeScript project
bun create vite . --template react-ts
```

### Install Dependencies

```bash
# Core dependencies
bun add react react-dom
bun add firebase konva react-konva
bun add clsx tailwind-merge class-variance-authority

# Dev dependencies
bun add -d typescript @types/react @types/react-dom
bun add -d vite @vitejs/plugin-react
bun add -d tailwindcss @tailwindcss/vite
bun add -d eslint prettier eslint-config-prettier
bun add -d vitest @testing-library/react @testing-library/jest-dom
bun add -d playwright @playwright/test
```

### Project Structure

```bash
CollabBoard/
├── docs/
│   ├── guides/           # Technology guides
│   └── research/         # Design documents
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   │   ├── ui/           # Shadcn/ui components
│   │   ├── canvas/       # Canvas-related components
│   │   └── ...
│   ├── modules/          # Feature modules
│   │   ├── auth/         # Authentication
│   │   ├── sync/         # Real-time sync
│   │   ├── canvas/       # Canvas logic
│   │   ├── ai/           # AI integration
│   │   └── ui/           # UI utilities
│   ├── lib/              # Utility functions
│   ├── types/            # TypeScript type definitions
│   ├── hooks/            # Custom React hooks
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── tests/                # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── .env                  # Environment variables (gitignored)
├── .env.example          # Environment template
├── .gitignore
├── .eslintrc.cjs
├── .prettierrc
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Bun Setup

### Package Management

Bun is a fast JavaScript runtime and package manager. Key commands:

```bash
# Install all dependencies
bun install

# Add a dependency
bun add <package>

# Add a dev dependency
bun add -d <package>

# Remove a dependency
bun remove <package>

# Update dependencies
bun update

# Run a script
bun run <script>

# Run TypeScript/JavaScript directly
bun run src/scripts/seed.ts
```

### Bun vs npm/yarn Commands

| Action | npm | Bun |
| ------- | ------- | ------- |
| Install all | `npm install` | `bun install` |
| Add package | `npm install pkg` | `bun add pkg` |
| Add dev | `npm install -D pkg` | `bun add -d pkg` |
| Remove | `npm uninstall pkg` | `bun remove pkg` |
| Run script | `npm run dev` | `bun run dev` |
| Execute | `npx cmd` | `bunx cmd` |

### Bun Configuration

Create `bunfig.toml` for Bun-specific settings:

```toml
[install]
# Use exact versions
exact = true

[install.lockfile]
# Print lockfile in JSON for better diffs
print = 'yarn'

[run]
# Silence bun run output
silent = false

[test]
# Test configuration
coverage = true
```

---

## Vite Configuration

### Basic Configuration

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Development server
  server: {
    port: 5173,
    strictPort: true,
    host: true, // Listen on all addresses
    open: true, // Open browser on start
  },

  // Preview server (for production build)
  preview: {
    port: 4173,
    strictPort: true,
  },

  // Build options
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk splitting
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database'],
          konva: ['konva', 'react-konva'],
        },
      },
    },
  },

  // Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'konva', 'react-konva'],
    exclude: [],
  },

  // Environment variable prefix
  envPrefix: 'VITE_',
});
```

### Advanced Configuration with Environments

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');

  const isDev = command === 'serve';
  const isProd = mode === 'production';

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      port: parseInt(env.VITE_PORT || '5173'),
      proxy: isDev
        ? {
            // Proxy API calls in development
            '/api': {
              target: env.VITE_API_URL || 'http://localhost:3000',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          }
        : undefined,
    },

    build: {
      sourcemap: !isProd,
      minify: isProd ? 'esbuild' : false,
    },

    define: {
      // Make env vars available
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __DEV__: JSON.stringify(isDev),
    },
  };
});
```

### Hot Module Replacement (HMR)

Vite provides instant HMR out of the box. For custom HMR handling:

```typescript
// In a module that needs custom HMR
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      // Handle the updated module
    }
  });

  // Dispose callback for cleanup
  import.meta.hot.dispose(() => {
    // Clean up side effects
  });
}
```

---

## TypeScript Configuration

### Main Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    // Language and Environment
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",

    // Module Resolution
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,

    // Path Aliases
    "baseUrl": ".",
    "paths": {
      '@/*': ['./src/*']
    },

    // Type Checking
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Emit
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,

    // Interop
    "isolatedModules": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    // Skip type checking of declaration files
    "skipLibCheck": true,

    // Additional
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src", "tests"],
  "exclude": ["node_modules", "dist"]
}
```

### Node Configuration

Create `tsconfig.node.json` for config files:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

### Vite Client Types

Create `src/vite-env.d.ts`:

```typescript
/// <reference types='vite/client' />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_DATABASE_URL: string;
  readonly VITE_NVIDIA_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Common Type Definitions

Create `src/types/index.ts`:

```typescript
// Re-export all types
export * from './board';
export * from './user';
export * from './canvas';
```

Create `src/types/board.ts`:

```typescript
import { Timestamp } from 'firebase/firestore';

export type ShapeType =
  | 'sticky'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'text'
  | 'frame'
  | 'connector';

export type UserRole = 'owner' | 'editor' | 'viewer';

export interface IBoard {
  id: string;
  name: string;
  ownerId: string;
  members: Record<string, UserRole>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface IBoardObject {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}
```

Create `src/types/user.ts`:

```typescript
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface PresenceData {
visitorId: string;
  displayName: string;
  online: boolean;
  lastSeen: number;
  color: string;
}

export interface CursorData {
  uid: string;
  x: number;
  y: number;
  displayName: string;
  color: string;
  lastUpdated: number;
}
```

---

## Environment Variables

### Environment File Structure

```gitignore
.env                  # Default, loaded in all cases
.env.local            # Local overrides, gitignored
.env.development      # Development mode
.env.production       # Production mode
.env.test             # Test mode
```

### Environment Template

Create `.env.example`:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# AI Configuration (Kimi 2.5 via Nvidia API)
VITE_NVIDIA_API_KEY=your_nvidia_api_key_here

# App Configuration
VITE_APP_NAME=CollabBoard
VITE_APP_VERSION=1.0.0
```

### Accessing Environment Variables

```typescript
// In TypeScript files
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;
const mode = import.meta.env.MODE; // 'development' | 'production' | 'test'

// Type-safe access (with vite-env.d.ts configured)
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
};
```

### Validation Helper

Create `src/lib/env.ts`:

```typescript
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_DATABASE_URL',
] as const;

type RequiredEnvVar = (typeof requiredEnvVars)[number];

export const validateEnv = (): void => {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}\n\n` +
        'Please copy .env.example to .env and fill in the values.'
    );
  }
};

export const getEnvVar = (key: RequiredEnvVar): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};
```

---

## ESLint & Prettier

### ESLint Configuration

Create `eslint.config.js` (ESLint v9 flat config):

```javascript
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks rules
      ...reactHooks.configs.recommended.rules,

      // React Refresh
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        { allowExpressions: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
    },
  }
);
```

Install ESLint dependencies:

```bash
bun add -d eslint @eslint/js globals typescript-eslint
bun add -d eslint-plugin-react-hooks eslint-plugin-react-refresh
```

### Prettier Configuration

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindConfig": "./tailwind.config.js"
}
```

Create `.prettierignore`:

```gitignore
dist
node_modules
coverage
*.min.js
*.min.css
bun.lockb
```

Install Prettier:

```bash
bun add -d prettier eslint-config-prettier prettier-plugin-tailwindcss
```

---

## Git Configuration

### Git Ignore

Create `.gitignore`:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
*.local

# Environment files
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
*.swp
*.swo
*~

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
.nyc_output/

# Misc
*.pem
*.tsbuildinfo

# Bun
bun.lockb

# Playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
```

### Git Hooks with Husky

NEVER USE HUSKY, IT IS A BAD TOOL.

## VS Code Setup

### Recommended Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "formulahendry.auto-rename-tag",
    "naumovs.color-highlight",
    "usernamehw.errorlens",
    "streetsidesoftware.code-spell-checker",
    "eamodio.gitlens",
    "yoavbls.pretty-ts-errors",
    "aaron-bond.better-comments",
    "christian-kohler.path-intellisense"
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  // Editor
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "editor.tabSize": 2,
  "editor.detectIndentation": false,

  // TypeScript
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",

  // Files
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/dist": true
  },

  // Tailwind CSS
  "tailwindCSS.experimental.classRegex": [
    "(?:'|\'|`)([^']*)(?:'|\'|`)",
    "[\''`]([^\''`]*).*?[\''`]"
  ],

  // ESLint
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],

  // Prettier
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Scripts & Commands

### Package.json Scripts

```json
{
  "name": "collabboard",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css,json}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "clean": "rm -rf dist node_modules .turbo coverage",
    "validate": "bun run type-check && bun run lint && bun run test:run"
  }
}
```

### Common Development Commands

```bash
# Start development server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Run all checks
bun run validate

# Run tests in watch mode
bun run test

# Run tests once with coverage
bun run test:coverage

# Run e2e tests
bun run test:e2e

# Fix linting issues
bun run lint:fix

# Format all files
bun run format

# Type check without emitting
bun run type-check

# Clean build artifacts
bun run clean
```

### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  'configurations': [
    {
      "name": "Debug Vite App",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/*"
      }
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["--run", "--reporter", "verbose"],
      "console": "integratedTerminal",
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

---

## Troubleshooting

### Common Issues

1. **Module not found errors**

   ```bash
   # Clear Bun cache and reinstall
   rm -rf node_modules bun.lockb
   bun install
   ```

2. **TypeScript path alias not working**
   - Ensure `tsconfig.json` has `paths` configured
   - Ensure `vite.config.ts` has matching `resolve.alias`
   - Restart VS Code TypeScript server

3. **HMR not working**

   ```bash
   # Clear Vite cache
   rm -rf node_modules/.vite
   bun run dev
   ```

4. **Environment variables undefined**
   - Ensure variable is prefixed with `VITE_`
   - Restart dev server after adding new env vars
   - Check `.env` file is in project root

5. **ESLint errors in VS Code**
   - Ensure ESLint extension is installed
   - Reload VS Code window
   - Check ESLint output panel for errors

### Performance Tips

1. **Speed up dev server**
   - Use `optimizeDeps.include` for large dependencies
   - Enable `server.warmup` for critical modules

2. **Faster builds**
   - Use `build.target: 'esnext'` if only targeting modern browsers
   - Enable `build.minify: 'esbuild'` (faster than Terser)

3. **Reduce bundle size**
   - Configure `manualChunks` for code splitting
   - Use dynamic imports for large components
   - Analyze bundle with `bun add -d rollup-plugin-visualizer`
