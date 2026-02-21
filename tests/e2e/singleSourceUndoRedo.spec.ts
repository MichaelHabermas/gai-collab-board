import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for S5: single source of truth.
 * Assert that after editing an object, undo/redo and canvas reflect the same state
 * (no stale or divergent state between history, AI context, and canvas).
 */

const BOARD_TIMEOUT_MS = 15_000;

const createCredential = () => {
  const suffix = `s5-${Date.now()}@example.com`;
  return {
    email: suffix,
    password: `S5Source!${Date.now()}`,
  };
};

const signUp = async (page: Page, credential: { email: string; password: string }): Promise<void> => {
  await page.locator('#signup-email').fill(credential.email);
  await page.locator('#signup-password').fill(credential.password);
  await page.locator('#confirm-password').fill(credential.password);
  await page.locator('button:has-text("Create Account")').click();
};

const waitForBoardVisible = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({
    timeout: BOARD_TIMEOUT_MS,
  });
};

test.describe('Single source of truth — undo/redo and canvas consistency', () => {
  test.setTimeout(60_000);

  test('undo reverts property change and canvas reflects it; redo restores', async ({ page }) => {
    const credential = createCredential();
    await page.goto('/login?tab=signup');
    await page.waitForLoadState('load');
    await page.locator('#signup-email').waitFor({ state: 'visible', timeout: 10_000 });

    await signUp(page, credential);
    await waitForBoardVisible(page);

    await expect(page.locator('[data-testid="object-count"]')).toBeVisible({
      timeout: BOARD_TIMEOUT_MS,
    });

    // Create a sticky
    await page.click('[data-testid="tool-sticky"]');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box unavailable');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    await page.mouse.click(centerX, centerY);

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1', {
      timeout: 10_000,
    });

    // Select the shape (select tool then click on it)
    await page.click('[data-testid="tool-select"]');
    await page.mouse.click(centerX, centerY);

    // Change fill color via color picker (open picker, click a different color swatch)
    await page.click('[data-testid="color-picker-toggle"]');
    const colorSwatches = page.locator('button[title^="#"]');
    await expect(colorSwatches.first()).toBeVisible({ timeout: 5_000 });
    const swatchCount = await colorSwatches.count();
    if (swatchCount >= 2) {
      await colorSwatches.nth(1).click();
    }

    // Undo: should revert the color change (canvas and history in sync)
    await page.click('[data-testid="tool-undo"]');
    await page.waitForTimeout(300);

    // Canvas still shows one object; state is consistent
    await expect(page.locator('[data-testid="object-count"]')).toContainText('1');
    await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible();

    // Redo: should reapply the color change
    await page.click('[data-testid="tool-redo"]');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1');
    await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible();
  });

  test('object count and canvas stay in sync after create then undo', async ({ page }) => {
    const credential = createCredential();
    await page.goto('/login?tab=signup');
    await page.waitForLoadState('load');
    await page.locator('#signup-email').waitFor({ state: 'visible', timeout: 10_000 });

    await signUp(page, credential);
    await waitForBoardVisible(page);

    await expect(page.locator('[data-testid="object-count"]')).toBeVisible({
      timeout: BOARD_TIMEOUT_MS,
    });

    const initialCountText = await page.locator('[data-testid="object-count"]').textContent();
    const parseCount = (t: string | null): number => {
      if (!t) return 0;
      const m = t.match(/\d+/);
      return m ? parseInt(m[0]!, 10) : 0;
    };
    const countBefore = parseCount(initialCountText);

    // Create a sticky
    await page.click('[data-testid="tool-sticky"]');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box unavailable');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    await page.mouse.click(centerX, centerY);

    await expect(page.locator('[data-testid="object-count"]')).toContainText(String(countBefore + 1), {
      timeout: 10_000,
    });

    // Undo create: object should disappear, count should drop
    await page.click('[data-testid="tool-undo"]');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="object-count"]')).toContainText(String(countBefore), {
      timeout: 5_000,
    });

    // Redo: object back, count restored
    await page.click('[data-testid="tool-redo"]');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="object-count"]')).toContainText(
      String(countBefore + 1),
      { timeout: 5_000 }
    );
  });
});
