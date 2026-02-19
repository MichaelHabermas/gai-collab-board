import { test, expect, type BrowserContext, type Page } from '@playwright/test';

interface ICredential {
  email: string;
  password: string;
}

const AUTH_TIMEOUT_MS = 20_000;
const BOARD_TIMEOUT_MS = 20_000;
const BENCHMARK_STRICT_MODE = process.env.BENCHMARK_STRICT === '1';
const MIN_FPS_TARGET = Number(process.env.BENCHMARK_MIN_FPS ?? '58');
const MAX_PROPAGATION_MS = Number(process.env.BENCHMARK_MAX_PROPAGATION_MS ?? '3000');
const MULTIUSER_REPETITIONS = Number(
  process.env.BENCHMARK_MULTIUSER_REPETITIONS ?? (BENCHMARK_STRICT_MODE ? '3' : '1')
);
const MAX_AI_COMMAND_MS = Number(process.env.BENCHMARK_MAX_AI_COMMAND_MS ?? '2000');

const assertLessThan = (actual: number, target: number): void => {
  if (BENCHMARK_STRICT_MODE) {
    expect(actual).toBeLessThan(target);
  } else {
    expect.soft(actual).toBeLessThan(target);
  }
};

const assertGreaterThanOrEqual = (actual: number, target: number): void => {
  if (BENCHMARK_STRICT_MODE) {
    expect(actual).toBeGreaterThanOrEqual(target);
  } else {
    expect.soft(actual).toBeGreaterThanOrEqual(target);
  }
};

const getObjectCount = async (page: Page): Promise<number> => {
  const objectCountText = await page.locator('[data-testid="object-count"]').textContent();
  const match = objectCountText?.match(/(\d+)/);
  return Number(match?.[1] ?? '0');
};

const createCredential = (index: number): ICredential => {
  const suffix = `${Date.now()}-${index}`;
  return {
    email: `benchmark-user-${suffix}@example.com`,
    password: `Benchmark!${suffix}`,
  };
};

const waitForBoardVisible = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({
    timeout: BOARD_TIMEOUT_MS,
  });
  await expect(page.locator('[data-testid="object-count"]')).toBeVisible({
    timeout: BOARD_TIMEOUT_MS,
  });
};

const createFreshBoardForBenchmark = async (page: Page, suffix: string): Promise<string> => {
  await page.getByRole('tab', { name: 'Boards' }).click();
  await page.locator('[data-testid="board-list-new-board"]').click();
  await page.locator('[data-testid="board-list-create-name-input"]').fill(`Benchmark ${suffix}`);
  await page.locator('[data-testid="board-list-create-submit"]').click();
  await waitForBoardVisible(page);
  await expect
    .poll(async () => getObjectCount(page), {
      timeout: 10_000,
      intervals: [100, 200, 400],
    })
    .toBe(0);
  return page.url();
};

const trySignUp = async (page: Page, credential: ICredential): Promise<void> => {
  await page.locator('button[role="tab"]:has-text("Sign Up")').click();
  await page.locator('#signup-email').fill(credential.email);
  await page.locator('#signup-password').fill(credential.password);
  await page.locator('#confirm-password').fill(credential.password);
  await page.locator('button:has-text("Create Account")').click();
};

const signIn = async (page: Page, credential: ICredential): Promise<void> => {
  await page.locator('button[role="tab"]:has-text("Sign In")').click();
  await page.locator('#email').fill(credential.email);
  await page.locator('#password').fill(credential.password);
  await page.locator('form:has(#email) button[type="submit"]').click();
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
  await trySignUp(page, credential);

  const boardLocator = page.locator('[data-testid="board-canvas"]');
  try {
    await boardLocator.waitFor({ state: 'visible', timeout: AUTH_TIMEOUT_MS });
    return;
  } catch {
    await signIn(page, credential);
    await waitForBoardVisible(page);
  }
};

const createStickyWithAI = async (page: Page): Promise<void> => {
  const initialCount = await getObjectCount(page);
  await page.getByRole('tab', { name: 'AI' }).click();
  const aiInput = page.getByPlaceholder('Ask to create or edit board items...');
  await expect(aiInput).toBeVisible({ timeout: 10_000 });
  await aiInput.fill('Create one yellow sticky note with text "propagation benchmark".');
  await aiInput.press('Enter');
  await expect
    .poll(async () => getObjectCount(page), {
      timeout: 25_000,
      intervals: [200, 300, 500, 800],
    })
    .toBeGreaterThan(initialCount);
};

test.describe('MVP Benchmarks', () => {
  test.describe.configure({ mode: 'default' });
  test.skip(({ browserName }) => browserName !== 'chromium', 'Benchmarks run on Chromium only');

  test('supports 5 concurrent users with shared object propagation', async ({ browser }) => {
    test.setTimeout(180_000);
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];
    const userCount = 5;
    const credentials = Array.from({ length: userCount }, (_, index) => createCredential(index));

    try {
      for (const credential of credentials) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
        await ensureAuthenticated(page, credential);
      }

      let creatorPage: Page | null = null;
      for (const page of pages) {
        const isEnabled = await page.locator('[data-testid="tool-sticky"]').isEnabled();
        if (isEnabled) {
          creatorPage = page;
          break;
        }
      }

      if (!creatorPage) {
        throw new Error('No editable user context found for object creation benchmark');
      }

      for (let run = 0; run < MULTIUSER_REPETITIONS; run += 1) {
        const baselineCounts = await Promise.all(pages.map((page) => getObjectCount(page)));

        await createStickyWithAI(creatorPage);
        const propagationStart = Date.now();

        await Promise.all(
          pages.map(async (page, index) => {
            const baseline = baselineCounts[index] ?? 0;
            await expect
              .poll(async () => getObjectCount(page), {
                timeout: 15_000,
                intervals: [200, 300, 500],
              })
              .toBeGreaterThan(baseline);
          })
        );

        const propagationMs = Date.now() - propagationStart;
        assertLessThan(propagationMs, MAX_PROPAGATION_MS);
      }
    } finally {
      await Promise.all(
        contexts.map(async (context) => {
          try {
            await context.close();
          } catch {
            // Ignore cleanup errors if context is already closed by the runner.
          }
        })
      );
    }
  });

  test('maintains high frame throughput during pan and zoom interactions', async ({ page }) => {
    const credential = createCredential(99);
    await ensureAuthenticated(page, credential);
    await waitForBoardVisible(page);
    await createFreshBoardForBenchmark(page, 'fps');

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas bounding box is unavailable');
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await page.locator('[data-testid="tool-pan"]').click();

    const fpsPromise = page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frames = 0;
        const start = performance.now();

        const step = (now: number) => {
          frames += 1;
          if (now - start >= 2_000) {
            const fps = (frames * 1000) / (now - start);
            resolve(fps);
            return;
          }
          requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
      });
    });

    for (let index = 0; index < 16; index += 1) {
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 30, centerY + 15);
      await page.mouse.up();
      await page.mouse.wheel(0, index % 2 === 0 ? 120 : -120);
    }

    const fps = await fpsPromise;
    assertGreaterThanOrEqual(fps, MIN_FPS_TARGET);
  });

  test('responds to a single-step AI command within 2 seconds', async ({ page }) => {
    const credential = createCredential(199);
    await ensureAuthenticated(page, credential);
    await waitForBoardVisible(page);
    await createFreshBoardForBenchmark(page, 'ai');

    const initialCount = await getObjectCount(page);
    await page.getByRole('tab', { name: 'AI' }).click();

    const aiInput = page.getByPlaceholder('Ask to create or edit board items...');
    await expect(aiInput).toBeVisible({ timeout: 10_000 });

    const start = Date.now();
    await aiInput.fill('Create one yellow sticky note that says benchmark');
    await aiInput.press('Enter');

    await expect
      .poll(async () => getObjectCount(page), {
        timeout: 20_000,
        intervals: [200, 400, 600],
      })
      .toBeGreaterThan(initialCount);

    const durationMs = Date.now() - start;
    assertLessThan(durationMs, MAX_AI_COMMAND_MS);
  });
});
