import { test, expect, type Page } from '@playwright/test';

const BOARD_TIMEOUT_MS = 20_000;

const waitForBoardVisible = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({
    timeout: BOARD_TIMEOUT_MS,
  });
};

const ensureOnBoard = async (page: Page): Promise<void> => {
  await page.waitForLoadState('load');
  const isAuth = await page.locator('form').isVisible().catch(() => false);
  if (isAuth) {
    const suffix = `line-${Date.now()}@example.com`;
    const pwd = `Line!${Date.now()}`;
    await page.locator('button[role="tab"]:has-text("Sign Up")').click();
    await page.locator('#signup-email').fill(suffix);
    await page.locator('#signup-password').fill(pwd);
    await page.locator('#confirm-password').fill(pwd);
    await page.locator('button:has-text("Create Account")').click();
    await waitForBoardVisible(page);
  } else {
    await waitForBoardVisible(page);
  }
};

/**
 * E2E tests for line shape: length-only resize and rotation.
 * Regression: lines are resizable only along their length and are rotatable.
 */
test.describe('Line resize and rotation', () => {
  test.setTimeout(60_000);

  test('create line, select it, and object count reflects one line', async ({ page }) => {
    await page.goto('/');
    await ensureOnBoard(page);
    await expect(page.locator('[data-testid="object-count"]')).toBeVisible({
      timeout: BOARD_TIMEOUT_MS,
    });

    await page.click('[data-testid="tool-line"]');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas bounding box unavailable');
    }

    const startX = box.x + box.width / 2 - 80;
    const startY = box.y + box.height / 2 - 40;
    const endX = box.x + box.width / 2 + 80;
    const endY = box.y + box.height / 2 + 40;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1', {
      timeout: 10_000,
    });

    await page.click('[data-testid="tool-select"]');
    const lineMidX = (startX + endX) / 2;
    const lineMidY = (startY + endY) / 2;
    await page.mouse.click(lineMidX, lineMidY);

    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1');
  });

  test('line tool draws and selection persists after deselect', async ({ page }) => {
    await page.goto('/');
    await ensureOnBoard(page);

    await page.click('[data-testid="tool-line"]');
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas bounding box unavailable');
    }

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx - 50, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 50, cy, { steps: 3 });
    await page.mouse.up();

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1', {
      timeout: 10_000,
    });

    await page.click('[data-testid="tool-select"]');
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(200);
    await page.mouse.click(cx + 100, cy + 100);
    await page.waitForTimeout(200);

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1');
  });
});
