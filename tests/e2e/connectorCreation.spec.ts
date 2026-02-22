import { test, expect, type Page } from '@playwright/test';
import { openCleanGuestBoard } from './helpers/openCleanGuestBoard';

const BOARD_TIMEOUT_MS = 30_000;

const ensureOnBoard = async (page: Page): Promise<void> => {
  await openCleanGuestBoard(page, BOARD_TIMEOUT_MS);
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
  const canvas = page.locator('[data-testid="board-canvas"] canvas').first();
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

    const boardCanvas = page.locator('[data-testid="board-canvas"]');
    await expect(boardCanvas).toBeVisible();
    const canvas = boardCanvas.locator('canvas').first();
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
    await page.waitForTimeout(300);
    await page.click('[data-testid="tool-sticky"]');
    await page.waitForTimeout(200);
    await page.mouse.click(box.x + cx + 150, box.y + cy + 100);
    await expect(page.locator('[data-testid="object-count"]')).toContainText('2', {
      timeout: 10_000,
    });

    // Switch to select then click empty area so Transformer does not sit above connection nodes (avoid creating shape with sticky tool)
    await page.click('[data-testid="tool-select"]');
    await page.waitForTimeout(100);
    await page.mouse.click(box.x + 10, box.y + 10);
    await page.waitForTimeout(200);

    // Connector tool: click right anchor of sticky 1, then left anchor of sticky 2
    await page.click('[data-testid="tool-connector"]');
    await page.waitForTimeout(1000);

    // Right anchor of sticky 1 in screen coords (sticky at cx-250,cy-200 200x200 -> right edge center)
    const anchor1X = box.x + cx - 50;
    const anchor1Y = box.y + cy - 100;
    await page.mouse.click(anchor1X, anchor1Y);
    await page.waitForTimeout(1000);

    // Left anchor of sticky 2 (sticky at cx+50,cy 200x200 -> left edge center)
    const anchor2X = box.x + cx + 50;
    const anchor2Y = box.y + cy + 100;
    await page.mouse.click(anchor2X, anchor2Y);

    await expect(page.locator('[data-testid="object-count"]')).toContainText('3', {
      timeout: 20_000,
    });
    await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible();

    // After connector creation, tool should switch to select
    await expect(page.locator('[data-testid="tool-select"]')).toBeVisible();
  });
});
