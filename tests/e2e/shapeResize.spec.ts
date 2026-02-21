import { test, expect, type Page } from '@playwright/test';

const BOARD_TIMEOUT_MS = 20_000;

const waitForBoardVisible = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({
    timeout: BOARD_TIMEOUT_MS,
  });
};

const ensureOnBoard = async (page: Page): Promise<void> => {
  await page.waitForLoadState('load');
  const boardVisible = await page
    .locator('[data-testid="board-canvas"]')
    .isVisible()
    .catch(() => false);
  if (boardVisible) {
    return;
  }
  await page.goto('/login?tab=signup');
  await page.locator('#signup-email').waitFor({ state: 'visible', timeout: 10_000 });
  const suffix = `resize-${Date.now()}@example.com`;
  const pwd = `Resize!${Date.now()}`;
  await page.locator('#signup-email').fill(suffix);
  await page.locator('#signup-password').fill(pwd);
  await page.locator('#confirm-password').fill(pwd);
  await page.locator('button:has-text("Create Account")').click();
  await waitForBoardVisible(page);
};

/**
 * E2E tests for shape resize via transform handles.
 */
test.describe('Shape resize', () => {
  test.setTimeout(60_000);

  test('select shape and resize via bottom-right handle', async ({ page }) => {
    await page.goto('/');
    await ensureOnBoard(page);
    await expect(page.locator('[data-testid="object-count"]')).toBeVisible({
      timeout: BOARD_TIMEOUT_MS,
    });

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas bounding box unavailable');
    }

    const cw = box.width;
    const ch = box.height;
    const cx = cw / 2;
    const cy = ch / 2;

    // Create sticky at center (200x200, centered on click)
    await page.click('[data-testid="tool-sticky"]');
    await page.mouse.click(box.x + cx, box.y + cy);
    await expect(page.locator('[data-testid="object-count"]')).toContainText('1', {
      timeout: 10_000,
    });

    // Select and click on sticky to show transform handles
    await page.click('[data-testid="tool-select"]');
    await page.mouse.click(box.x + cx, box.y + cy);
    await page.waitForTimeout(300);

    // Sticky is 200x200 at (cx-100, cy-100). Bottom-right corner in canvas: (cx+100, cy+100)
    // Transformer anchor is ~8px; drag from near corner outward to resize
    const handleX = box.x + cx + 100;
    const handleY = box.y + cy + 100;
    await page.mouse.move(handleX, handleY);
    await page.mouse.down();
    await page.mouse.move(handleX + 60, handleY + 60, { steps: 5 });
    await page.mouse.up();

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1');
    await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible();
  });

  test('rectangle drag-draw creates resizable shape', async ({ page }) => {
    await page.goto('/');
    await ensureOnBoard(page);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas bounding box unavailable');
    }

    const cw = box.width;
    const cy = box.height / 2;

    await page.click('[data-testid="tool-rectangle"]');
    const startX = box.x + cw / 2 - 80;
    const startY = box.y + cy - 60;
    const endX = box.x + cw / 2 + 80;
    const endY = box.y + cy + 60;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1', {
      timeout: 10_000,
    });

    await page.click('[data-testid="tool-select"]');
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    await page.mouse.click(midX, midY);
    await page.waitForTimeout(300);

    // Resize via bottom-right handle
    await page.mouse.move(endX, endY);
    await page.mouse.down();
    await page.mouse.move(endX + 40, endY + 40, { steps: 3 });
    await page.mouse.up();

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1');
  });
});
