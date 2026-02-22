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
  const suffix = `connector-${Date.now()}@example.com`;
  const pwd = `Connector!${Date.now()}`;
  await page.locator('#signup-email').fill(suffix);
  await page.locator('#signup-password').fill(pwd);
  await page.locator('#confirm-password').fill(pwd);
  await page.locator('button:has-text("Create Account")').click();
  await waitForBoardVisible(page);
};

/**
 * Create a sticky at the given canvas-relative coordinates.
 * Sticky is 200x200, centered on click. Canvas coords map 1:1 to screen when viewport is default.
 */
const createStickyAt = async (
  page: Page,
  canvasX: number,
  canvasY: number
): Promise<void> => {
  await page.click('[data-testid="tool-sticky"]');
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Canvas bounding box unavailable');
  }
  const screenX = box.x + canvasX;
  const screenY = box.y + canvasY;
  await page.mouse.click(screenX, screenY);
  await expect(page.locator('[data-testid="object-count"]')).toContainText('1', {
    timeout: 10_000,
  });
};

/**
 * E2E tests for connector creation: two-click flow on anchor nodes.
 */
test.describe('Connector creation', () => {
  test.setTimeout(60_000);

  test('creates connector between two shapes via anchor clicks', async ({ page }) => {
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

    // Sticky 1: click at (cx - 150, cy - 100) -> sticky at (cx - 250, cy - 200), size 200x200
    await createStickyAt(page, cx - 150, cy - 100);
    await page.click('[data-testid="tool-sticky"]');
    await page.mouse.click(box.x + cx + 150, box.y + cy + 100);
    await expect(page.locator('[data-testid="object-count"]')).toContainText('2', {
      timeout: 10_000,
    });

    // Connector tool: click right anchor of sticky 1 (cx-50, cy-100), then left anchor of sticky 2 (cx+50, cy+100)
    await page.click('[data-testid="tool-connector"]');
    await page.waitForTimeout(200);

    // Right anchor of sticky 1: (cx - 250 + 200, cy - 200 + 100) = (cx - 50, cy - 100)
    await page.mouse.click(box.x + cx - 50, box.y + cy - 100);
    await page.waitForTimeout(100);

    // Left anchor of sticky 2: (cx + 50, cy + 100)
    await page.mouse.click(box.x + cx + 50, box.y + cy + 100);

    await expect(page.locator('[data-testid="object-count"]')).toContainText('3', {
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible();

    // After connector creation, tool should switch to select
    await expect(page.locator('[data-testid="tool-select"]')).toBeVisible();
  });
});
