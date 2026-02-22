/**
 * E2E perf baseline capture for Imperative Konva migration (RL1).
 * Measures frame times, React renders, selector evals, and TTI.
 * Outputs JSON to stdout when CAPTURE_PERF_BASELINE=1.
 *
 * Run: CAPTURE_PERF_BASELINE=1 bun run test:e2e -- tests/e2e/perfBaseline.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

const BOARD_TIMEOUT_MS = 20_000;
const CAPTURE_MODE = process.env.CAPTURE_PERF_BASELINE === '1';
const CAPTURE_OUTPUT_PATH = process.env.CAPTURE_PERF_BASELINE_OUTPUT;

interface ICredential {
  email: string;
  password: string;
}

const createCredential = (): ICredential => ({
  email: `perf-baseline-${Date.now()}@example.com`,
  password: `PerfBaseline!${Date.now()}`,
});

const waitForBoardVisible = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({
    timeout: BOARD_TIMEOUT_MS,
  });
  await expect(page.locator('[data-testid="object-count"]')).toBeVisible({
    timeout: BOARD_TIMEOUT_MS,
  });
};

const createFreshBoard = async (page: Page, suffix: string): Promise<void> => {
  await page.getByRole('tab', { name: 'Boards' }).click();
  await page.locator('[data-testid="board-list-new-board"]').click();
  await page.locator('[data-testid="board-list-create-name-input"]').fill(`Perf ${suffix}`);
  await page.locator('[data-testid="board-list-create-submit"]').click();
  await waitForBoardVisible(page);
  await expect
    .poll(
      async () => {
        const text = await page.locator('[data-testid="object-count"]').textContent();
        const match = text?.match(/(\d+)/);
        return Number(match?.[1] ?? '0');
      },
      { timeout: 10_000, intervals: [100, 200, 400] }
    )
    .toBe(0);
};

const ensureAuthenticated = async (page: Page, credential: ICredential): Promise<void> => {
  await page.goto('/');
  await page.waitForLoadState('load');

  if (
    await page
      .locator('[data-testid="board-canvas"]')
      .isVisible()
      .catch(() => false)
  ) {
    return;
  }

  await page.goto('/login?tab=signup');
  await page.waitForLoadState('load');
  await page.locator('#signup-email').waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('#signup-email').fill(credential.email);
  await page.locator('#signup-password').fill(credential.password);
  await page.locator('#confirm-password').fill(credential.password);
  await page.locator('button:has-text("Create Account")').click();

  const boardLocator = page.locator('[data-testid="board-canvas"]');
  try {
    await boardLocator.waitFor({ state: 'visible', timeout: 20_000 });
  } catch {
    await page.locator('button[role="tab"]:has-text("Sign In")').click();
    await page.locator('#email').fill(credential.email);
    await page.locator('#password').fill(credential.password);
    await page.locator('form:has(#email) button[type="submit"]').click();
    await waitForBoardVisible(page);
  }
};

const seedObjects = async (page: Page, count: number): Promise<void> => {
  await page.evaluate((n) => {
    const store = (window as unknown as Record<string, unknown>).__objectsStore as {
      getState: () => { setAll: (objects: Record<string, unknown>[]) => void };
    };
    if (!store) {
      throw new Error('__objectsStore not exposed — dev mode required');
    }

    const objects = Array.from({ length: n }, (_, i) => ({
      id: `perf-${i}`,
      type: 'rectangle',
      x: 100 + (i % 25) * 110,
      y: 100 + Math.floor(i / 25) * 90,
      width: 100,
      height: 80,
      rotation: 0,
      fill: '#93c5fd',
      stroke: '#1e40af',
      strokeWidth: 2,
      createdBy: 'perf-baseline',
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    }));

    store.getState().setAll(objects);
  }, count);

  await page.waitForTimeout(500);
};

/** Collect frame deltas in page during drag, return percentiles. */
const measureFrameTimes = async (
  page: Page,
  startX: number,
  startY: number,
  dragDistance: number,
  durationMs: number
): Promise<{ p50: number; p95: number; p99: number }> => {
  const resultPromise = page.evaluate(async ({ durationMs }) => {
    const frameDurations: number[] = [];
    let lastTs = 0;

    return new Promise<{ p50: number; p95: number; p99: number }>((resolve) => {
      const step = (now: number) => {
        if (lastTs > 0) {
          frameDurations.push(now - lastTs);
        }
        lastTs = now;
        const elapsed = frameDurations.reduce((a, b) => a + b, 0);
        if (frameDurations.length >= 30 && elapsed >= durationMs) {
          const sorted = [...frameDurations].sort((a, b) => a - b);
          const idx = (p: number) =>
            Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
          const p50Val = sorted[idx(50)];
          const p95Val = sorted[idx(95)];
          const p99Val = sorted[idx(99)];
          resolve({
            p50: Math.round((p50Val ?? 0) * 100) / 100,
            p95: Math.round((p95Val ?? 0) * 100) / 100,
            p99: Math.round((p99Val ?? 0) * 100) / 100,
          });
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { durationMs });

  // Perform drag
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  const steps = 45;
  for (let i = 1; i <= steps; i++) {
    const dx = (dragDistance / steps) * i;
    await page.mouse.move(startX + dx, startY + dx * 0.5, { steps: 1 });
  }
  await page.waitForTimeout(durationMs);
  await page.mouse.up();

  return resultPromise;
};

/** Measure frame times during pan (500 objects). */
const measureFrameTimesDuringPan = async (
  page: Page,
  centerX: number,
  centerY: number,
  durationMs: number
): Promise<{ p50: number; p95: number; p99: number }> => {
  await page.locator('[data-testid="tool-pan"]').click();
  await page.waitForTimeout(200);

  const resultPromise = page.evaluate(
    async ({ durationMs }) => {
      const frameDurations: number[] = [];
      let lastTs = 0;

      return new Promise<{ p50: number; p95: number; p99: number }>((resolve) => {
        const step = (now: number) => {
          if (lastTs > 0) {
            frameDurations.push(now - lastTs);
          }
          lastTs = now;
          const elapsed = frameDurations.reduce((a, b) => a + b, 0);
          if (frameDurations.length >= 30 && elapsed >= durationMs) {
            const sorted = [...frameDurations].sort((a, b) => a - b);
            const idx = (p: number) =>
              Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
            const p50Val = sorted[idx(50)];
            const p95Val = sorted[idx(95)];
            const p99Val = sorted[idx(99)];
            resolve({
              p50: Math.round((p50Val ?? 0) * 100) / 100,
              p95: Math.round((p95Val ?? 0) * 100) / 100,
              p99: Math.round((p99Val ?? 0) * 100) / 100,
            });
            return;
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { durationMs }
  );

  for (let i = 0; i < 20; i++) {
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 40, centerY + 20);
    await page.mouse.up();
    await page.mouse.wheel(0, i % 2 === 0 ? 80 : -80);
  }
  await page.waitForTimeout(durationMs);

  return resultPromise;
};

test.describe('Perf Baseline Capture', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(({ browserName }) => browserName !== 'chromium', 'Perf capture runs on Chromium only');

  test('captures frameTime100Drag, frameTime500Pan, reactRenders, selectorEvals, tti1000', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const credential = createCredential();
    await ensureAuthenticated(page, credential);
    await waitForBoardVisible(page);
    await createFreshBoard(page, 'baseline');

    const metrics: Record<string, unknown> = {};

    // ── frameTime100Drag ──
    await seedObjects(page, 100);
    await page.waitForTimeout(300);
    await page.mouse.click(150, 140);
    await page.waitForTimeout(200);

    const frameTime100 = await measureFrameTimes(page, 150, 140, 300, 2500);
    metrics.frameTime100Drag = frameTime100;

    // ── frameTime500Pan ──
    await createFreshBoard(page, 'pan500');
    await seedObjects(page, 500);
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas bounding box unavailable');
    }
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const frameTime500 = await measureFrameTimesDuringPan(page, centerX, centerY, 2500);
    metrics.frameTime500Pan = frameTime500;

    // ── reactRendersDuringDrag, selectorEvalsPerDragFrame (multi-select drag triggers groupDragOffset) ──
    await createFreshBoard(page, 'multi');
    await seedObjects(page, 3);
    await page.waitForTimeout(300);

    const canvasBox = await page.locator('canvas').first().boundingBox();
    if (!canvasBox) {
      throw new Error('Canvas box unavailable');
    }
    const ox = canvasBox.x;
    const oy = canvasBox.y;

    await page.locator('[data-testid="tool-select"]').click();
    await page.waitForTimeout(100);
    await page.mouse.move(ox + 80, oy + 80);
    await page.mouse.down();
    await page.mouse.move(ox + 380, oy + 200);
    await page.mouse.up();
    await page.waitForTimeout(200);

    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__PERF_MEASURING = true;
      (window as unknown as Record<string, number>).__perfStoreShapeRenderCount = 0;
      (window as unknown as Record<string, number>).__perfSelectorEvalCount = 0;
    });

    const dragSteps = 40;
    await page.mouse.move(ox + 220, oy + 130);
    await page.mouse.down();
    for (let i = 1; i <= dragSteps; i++) {
      await page.mouse.move(ox + 220 + i * 4, oy + 130 + i * 2, { steps: 1 });
    }
    await page.mouse.up();
    await page.waitForTimeout(100);

    const renderAndSelectorCounts = await page.evaluate(() => {
      const renders = (window as unknown as Record<string, number>).__perfStoreShapeRenderCount ?? 0;
      const selectorEvals = (window as unknown as Record<string, number>).__perfSelectorEvalCount ?? 0;
      (window as unknown as Record<string, unknown>).__PERF_MEASURING = false;
      return { renders, selectorEvals };
    });

    metrics.reactRendersDuringDrag = renderAndSelectorCounts.renders;
    metrics.selectorEvalsPerDragFrame = Math.round(
      renderAndSelectorCounts.selectorEvals / Math.max(dragSteps, 1)
    );

    // ── tti1000ObjectsMs ──
    await createFreshBoard(page, 'tti1000');
    await page.waitForTimeout(300);

    const ttiMs = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const store = (window as unknown as Record<string, unknown>).__objectsStore as {
          getState: () => { setAll: (objects: Record<string, unknown>[]) => void };
        };
        if (!store) {
          resolve(0);
          return;
        }

        const objects = Array.from({ length: 1000 }, (_, i) => ({
          id: `tti-${i}`,
          type: 'rectangle',
          x: 50 + (i % 40) * 100,
          y: 50 + Math.floor(i / 40) * 80,
          width: 90,
          height: 70,
          rotation: 0,
          fill: '#93c5fd',
          stroke: '#1e40af',
          strokeWidth: 2,
          createdBy: 'perf-baseline',
          createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
          updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
        }));

        const start = performance.now();
        store.getState().setAll(objects);

        // Proxy for TTI: time from setAll to 2 rAFs (React + Konva render pipeline)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(Math.round(performance.now() - start));
          });
        });
      });
    });

    await page.waitForTimeout(500);
    metrics.tti1000ObjectsMs = ttiMs > 0 ? ttiMs : 0;

    if (CAPTURE_MODE) {
      const json = JSON.stringify(metrics, null, 2);
      if (CAPTURE_OUTPUT_PATH) {
        const { writeFileSync } = await import('fs');
        writeFileSync(CAPTURE_OUTPUT_PATH, json, 'utf-8');
      } else {
        process.stdout.write(json);
      }
    }

    expect(metrics.frameTime100Drag).toBeDefined();
    expect(metrics.frameTime500Pan).toBeDefined();
    expect(metrics.reactRendersDuringDrag).toBeDefined();
    expect(metrics.selectorEvalsPerDragFrame).toBeDefined();
    expect(metrics.tti1000ObjectsMs).toBeDefined();
  });
});
