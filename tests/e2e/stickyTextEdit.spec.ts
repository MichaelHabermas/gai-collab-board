import { test, expect, type Page } from '@playwright/test';

const BOARD_TIMEOUT_MS = 15_000;

interface ICredential {
  email: string;
  password: string;
}

const createCredential = (): ICredential => {
  const suffix = `stickytext-${Date.now()}@example.com`;
  return {
    email: suffix,
    password: `StickyText!${Date.now()}`,
  };
};

const signUp = async (page: Page, credential: ICredential): Promise<void> => {
  await page.locator('#signup-email').fill(credential.email);
  await page.locator('#signup-password').fill(credential.password);
  await page.locator('#confirm-password').fill(credential.password);
  await page.locator('button:has-text("Create Account")').click();
};

const waitForBoardVisible = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({
    timeout: BOARD_TIMEOUT_MS,
  });
};

test.describe('Sticky Text Edit', () => {
  test.setTimeout(60_000);

  test('can double click to edit text', async ({ page }) => {
    const credential = createCredential();
    await page.goto('/login?tab=signup');
    await page.waitForLoadState('load');
    await page.locator('#signup-email').waitFor({ state: 'visible', timeout: 10_000 });

    await signUp(page, credential);
    await waitForBoardVisible(page);

    await page.click('[data-testid="tool-sticky"]');
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas box unavailable');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    await page.mouse.click(centerX, centerY);

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1', { timeout: 10_000 });

    await page.click('[data-testid="tool-select"]');
    await page.mouse.click(centerX + 20, centerY + 20);
    await page.waitForTimeout(200);
    await page.mouse.dblclick(centerX + 20, centerY + 20);

    const overlay = page.locator('textarea.sticky-note-edit-overlay');
    await expect(overlay).toBeVisible();

    await overlay.fill('E2E sticky edit');
    await overlay.press('Enter');

    await expect(overlay).not.toBeVisible();
  });
});
