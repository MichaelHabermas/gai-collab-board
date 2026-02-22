import { test, expect, type Page } from '@playwright/test';
import { openCleanGuestBoard } from './helpers/openCleanGuestBoard';

const BOARD_TIMEOUT_MS = 30_000;

const openEditableBoard = async (page: Page): Promise<void> => {
  await openCleanGuestBoard(page, BOARD_TIMEOUT_MS);
};

test.describe('Frame Title Edit', () => {
  test.setTimeout(60_000);

  test('can double click to edit frame title', async ({ page }) => {
    await openEditableBoard(page);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas box unavailable');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    // Create Frame
    await page.click('[data-testid="tool-frame"]');
    await page.mouse.move(centerX - 100, centerY - 100);
    await page.mouse.down();
    await page.mouse.move(centerX + 100, centerY + 100, { steps: 5 });
    await page.mouse.up();
    
    await expect(page.locator('[data-testid="object-count"]')).toContainText('1', { timeout: 10_000 });

    // Dblclick top edge for title edit
    await page.click('[data-testid="tool-select"]');
    await page.mouse.click(centerX, centerY - 80);
    await page.waitForTimeout(200);
    await page.mouse.dblclick(centerX, centerY - 80);

    const overlay = page.locator('input.frame-title-edit-overlay');
    await expect(overlay).toBeVisible();

    await overlay.fill('E2E frame edit');
    await overlay.press('Enter');

    await expect(overlay).not.toBeVisible();
  });
});
