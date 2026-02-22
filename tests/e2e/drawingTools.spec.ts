import { test, expect, type Page } from '@playwright/test';
import { openCleanGuestBoard } from './helpers/openCleanGuestBoard';

const BOARD_TIMEOUT_MS = 30_000;

const waitForBoardVisible = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({
    timeout: BOARD_TIMEOUT_MS,
  });
};

const openEditableBoard = async (page: Page): Promise<void> => {
  await openCleanGuestBoard(page, BOARD_TIMEOUT_MS);
};

test.describe('Drawing Tools', () => {
  test.setTimeout(60_000);

  test('can draw a rectangle', async ({ page }) => {
    await openEditableBoard(page);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas box unavailable');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    await page.click('[data-testid="tool-rectangle"]');
    await page.mouse.move(centerX - 100, centerY - 100);
    await page.mouse.down();
    await page.mouse.move(centerX + 100, centerY + 100, { steps: 5 });
    await page.mouse.up();

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1', { timeout: 10_000 });
  });
});
