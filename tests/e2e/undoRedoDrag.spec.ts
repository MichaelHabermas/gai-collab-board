import { test, expect, type Page } from '@playwright/test';

const BOARD_TIMEOUT_MS = 15_000;

interface ICredential {
  email: string;
  password: string;
}

const createCredential = (): ICredential => {
  const suffix = `undoredo-${Date.now()}@example.com`;
  return {
    email: suffix,
    password: `UndoRedo!${Date.now()}`,
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

test.describe('Undo/Redo Drag', () => {
  test.setTimeout(60_000);

  test('can undo and redo a shape drag', async ({ page }) => {
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
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 150, centerY + 150, { steps: 5 });
    await page.mouse.up();

    // Trigger undo
    await page.click('[data-testid="tool-undo"]');
    await page.waitForTimeout(500);

    // Trigger redo
    await page.click('[data-testid="tool-redo"]');
    await expect(page.locator('[data-testid="object-count"]')).toContainText('1');
  });
});
