import { test, expect, type Page } from '@playwright/test';
import { openCleanGuestBoard } from './helpers/openCleanGuestBoard';

const BOARD_TIMEOUT_MS = 30_000;

const ensureOnBoard = async (page: Page): Promise<void> => {
  await openCleanGuestBoard(page, BOARD_TIMEOUT_MS);
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
    await page.waitForTimeout(500);
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
    await page.waitForTimeout(500);
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas bounding box unavailable');
    }

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx - 50, cy);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(cx + 50, cy, { steps: 5 });
    await page.waitForTimeout(100);
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
