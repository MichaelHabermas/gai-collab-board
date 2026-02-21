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
  const suffix = `rotate-${Date.now()}@example.com`;
  const pwd = `Rotate!${Date.now()}`;
  await page.locator('#signup-email').fill(suffix);
  await page.locator('#signup-password').fill(pwd);
  await page.locator('#confirm-password').fill(pwd);
  await page.locator('button:has-text("Create Account")').click();
  await waitForBoardVisible(page);
};

/**
 * E2E tests for shape rotation via transform handles.
 * Konva Transformer has a rotation handle above the shape; dragging it rotates.
 */
test.describe('Shape rotation', () => {
  test.setTimeout(60_000);

  test('select shape and rotate via rotation handle', async ({ page }) => {
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

    await page.click('[data-testid="tool-sticky"]');
    await page.mouse.click(box.x + cx, box.y + cy);
    await expect(page.locator('[data-testid="object-count"]')).toContainText('1', {
      timeout: 10_000,
    });

    await page.click('[data-testid="tool-select"]');
    await page.mouse.click(box.x + cx, box.y + cy);
    await page.waitForTimeout(300);

    // Konva Transformer rotation handle is above top-center. Sticky top is at cy-100.
    // Rotation handle is typically ~20-30px above the top.
    const rotHandleX = box.x + cx;
    const rotHandleY = box.y + cy - 120;
    await page.mouse.move(rotHandleX, rotHandleY);
    await page.mouse.down();
    await page.mouse.move(rotHandleX + 80, rotHandleY, { steps: 5 });
    await page.mouse.up();

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1');
    await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible();
  });

  test('line shape supports rotation', async ({ page }) => {
    await page.goto('/');
    await ensureOnBoard(page);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas bounding box unavailable');
    }

    const cw = box.width;
    const cy = box.height / 2;

    await page.click('[data-testid="tool-line"]');
    const startX = box.x + cw / 2 - 60;
    const startY = box.y + cy - 40;
    const endX = box.x + cw / 2 + 60;
    const endY = box.y + cy + 40;

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

    // Drag rotation handle (above line midpoint)
    const rotY = midY - 40;
    await page.mouse.move(midX, rotY);
    await page.mouse.down();
    await page.mouse.move(midX + 60, rotY, { steps: 3 });
    await page.mouse.up();

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1');
  });
});
