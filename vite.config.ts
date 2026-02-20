import { defineConfig, loadEnv } from 'vite';
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
    const isGemini = baseURL.includes('generativelanguage.googleapis.com');
    return {
      target: baseURL,
      apiKey,
      rewrite: (pathSegment: string) =>
        isGemini
          ? pathSegment.replace(/^\/api\/ai\/v1/, '/')
          : pathSegment.replace(/^\/api\/ai/, ''),
    };
  }
  return null;
}

/** Read .env from disk so proxy uses current key without restarting dev server. */
function getAiProxyConfigFromFile(envDir: string): ReturnType<typeof getAiProxyConfig> {
  const env = parseEnvFile(envDir);
  return getAiProxyConfig(env);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const aiProxy = getAiProxyConfig(env);

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
                  const envDir = path.resolve(__dirname, '.');
                  proxy.on('proxyReq', (proxyReq, _req, _res) => {
                    const config = getAiProxyConfigFromFile(envDir);
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
