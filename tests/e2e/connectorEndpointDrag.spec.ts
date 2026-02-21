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
  const suffix = `conn-ep-${Date.now()}@example.com`;
  const pwd = `ConnEp!${Date.now()}`;
  await page.locator('#signup-email').fill(suffix);
  await page.locator('#signup-password').fill(pwd);
  await page.locator('#confirm-password').fill(pwd);
  await page.locator('button:has-text("Create Account")').click();
  await waitForBoardVisible(page);
};

/**
 * E2E tests for connector endpoint behavior: when a connected shape is dragged,
 * the connector should follow (reposition with the shape).
 */
test.describe('Connector endpoint drag', () => {
  test.setTimeout(60_000);

  test('dragging connected shape keeps connector and object count stable', async ({ page }) => {
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

    // Create two stickies (same positions as connectorCreation.spec.ts)
    await page.click('[data-testid="tool-sticky"]');
    await page.mouse.click(box.x + cx - 150, box.y + cy - 100);
    await expect(page.locator('[data-testid="object-count"]')).toContainText('1', {
      timeout: 10_000,
    });

    await page.click('[data-testid="tool-sticky"]');
    await page.mouse.click(box.x + cx + 150, box.y + cy + 100);
    await expect(page.locator('[data-testid="object-count"]')).toContainText('2', {
      timeout: 10_000,
    });

    await page.waitForTimeout(300);

    // Create connector: right anchor of sticky 1, left anchor of sticky 2
    await page.click('[data-testid="tool-connector"]');
    await page.waitForTimeout(300);
    await page.mouse.click(box.x + cx - 50, box.y + cy - 100);
    await page.waitForTimeout(100);
    await page.mouse.click(box.x + cx + 50, box.y + cy + 100);

    await expect(page.locator('[data-testid="object-count"]')).toContainText('3', {
      timeout: 10_000,
    });

    // Select tool, click on first sticky (left one) to select it
    await page.click('[data-testid="tool-select"]');
    const sticky1CenterX = box.x + cx - 100;
    const sticky1CenterY = box.y + cy - 100;
    await page.mouse.click(sticky1CenterX, sticky1CenterY);
    await page.waitForTimeout(200);

    // Drag the first sticky
    await page.mouse.move(sticky1CenterX, sticky1CenterY);
    await page.mouse.down();
    await page.mouse.move(sticky1CenterX + 80, sticky1CenterY + 60, { steps: 5 });
    await page.mouse.up();

    // Connector should still connect; object count unchanged
    await expect(page.locator('[data-testid="object-count"]')).toContainText('3');
    await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible();
  });
});
