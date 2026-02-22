import { test, expect, type Page } from '@playwright/test';
import { openCleanGuestBoard } from './helpers/openCleanGuestBoard';

const BOARD_TIMEOUT_MS = 30_000;

const openEditableBoard = async (page: Page): Promise<void> => {
  await openCleanGuestBoard(page, BOARD_TIMEOUT_MS);
};

test.describe('Multi-select Drag', () => {
  test.setTimeout(60_000);

  test('can drag multiple shapes together', async ({ page }) => {
    await openEditableBoard(page);

    await page.click('[data-testid="tool-sticky"]');
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas box unavailable');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    await page.mouse.click(centerX - 100, centerY - 100);
    await page.mouse.click(centerX + 100, centerY - 100);

    await expect(page.locator('[data-testid="object-count"]')).toContainText('2', { timeout: 10_000 });

    // Marquee select both
    await page.click('[data-testid="tool-select"]');
    await page.mouse.move(centerX - 200, centerY - 200);
    await page.mouse.down();
    await page.mouse.move(centerX + 200, centerY + 200, { steps: 5 });
    await page.mouse.up();

    // Drag the selection
    await page.mouse.move(centerX, centerY - 100);
    await page.mouse.down();
    await page.mouse.move(centerX + 50, centerY - 50, { steps: 5 });
    await page.mouse.up();

    await expect(page.locator('[data-testid="object-count"]')).toContainText('2');
  });
});
