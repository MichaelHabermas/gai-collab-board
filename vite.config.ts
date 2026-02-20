import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { visualizer } from 'rollup-plugin-visualizer';
import { getActiveAIProviderConfig } from './src/modules/ai/providerConfig';

function parseEnvFile(envDir: string): Record<string, string> {
  const envPath = path.resolve(envDir, '.env');
  const out: Record<string, string> = {};
  if (!existsSync(envPath)) {
    return out;
  }
  let content = readFileSync(envPath, 'utf-8');
  content = content.replace(/^\uFEFF/, '');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value.trim();
  }
  return out;
}

function getAiProxyConfig(env: Record<string, string>) {
  const envWithUndefined = env as Record<string, string | undefined>;
  const { baseURL, apiKey } = getActiveAIProviderConfig(envWithUndefined);
  if (apiKey) {
    const url = new URL(baseURL);
    const origin = url.origin;
    const basePath = url.pathname.replace(/\/+$/, '');
    return {
      target: origin,
      apiKey,
      rewrite: (pathSegment: string) => {
        const withoutPrefix = pathSegment.replace(/^\/api\/ai\/v1/, '');
        return basePath + (withoutPrefix || '/');
      },
    };
  }
  return null;
}

/** Read .env from disk and merge with process.env so proxy is enabled if key is set anywhere. */
function getAiProxyConfigFromFile(envDir: string): ReturnType<typeof getAiProxyConfig> {
  const fromFile = parseEnvFile(envDir);
  const fromProcess: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') {
      fromProcess[k] = v;
    }
  }
  const env = { ...fromProcess, ...fromFile };
  return getAiProxyConfig(env);
}

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '.');
  const aiProxy = getAiProxyConfigFromFile(envDir);

  if (mode === 'development') {
    const envPath = path.resolve(envDir, '.env');
    if (aiProxy) {
      process.stderr.write(`[Vite] AI proxy enabled → ${aiProxy.target}\n`);
    } else {
      process.stderr.write(
        `[Vite] AI proxy disabled: set VITE_AI_API_KEY in .env and restart (bun run dev). Checked: ${envPath}\n`
      );
    }
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(mode === 'production'
        ? [
            visualizer({
              filename: 'dist/stats.html',
              gzipSize: true,
              template: 'treemap',
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      open: true,
      proxy:
        aiProxy !== null
          ? {
              '/api/ai': {
                target: aiProxy.target,
                changeOrigin: true,
                rewrite: aiProxy.rewrite,
                configure: (proxy) => {
                  proxy.on('proxyReq', (proxyReq, _req, _res) => {
                    const config = getAiProxyConfigFromFile(path.resolve(__dirname, '.'));
                    if (config?.apiKey) {
                      proxyReq.setHeader('Authorization', `Bearer ${config.apiKey}`);
                    }
                  });
                  proxy.on('proxyRes', (proxyRes) => {
                    if (proxyRes.statusCode === 429 || (proxyRes.statusCode && proxyRes.statusCode >= 400)) {
                      const chunks: Buffer[] = [];
                      proxyRes.on('data', (chunk: Buffer) => {
                        chunks.push(chunk);
                      });
                      proxyRes.on('end', () => {
                        const body = Buffer.concat(chunks).toString('utf8').slice(0, 500);
                        process.stderr.write(
                          `[Vite AI proxy] upstream ${proxyRes.statusCode} ${proxyRes.statusMessage ?? ''}: ${body}${body.length >= 500 ? '...' : ''}\n`
                        );
                      });
                    }
                  });
                },
              },
            }
          : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      minify: 'esbuild',
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database'],
            konva: ['konva', 'react-konva'],
            openai: ['openai'],
          },
        },
      },
    },
    envPrefix: 'VITE_',
  };
});
