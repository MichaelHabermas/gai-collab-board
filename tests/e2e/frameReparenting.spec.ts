import { test, expect, type Page } from '@playwright/test';

const BOARD_TIMEOUT_MS = 15_000;

interface ICredential {
  email: string;
  password: string;
}

const createCredential = (): ICredential => {
  const suffix = `framereparent-${Date.now()}@example.com`;
  return {
    email: suffix,
    password: `FrameReparent!${Date.now()}`,
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

test.describe('Frame Reparenting', () => {
  test.setTimeout(60_000);

  test('can drag shape into frame', async ({ page }) => {
    const credential = createCredential();
    await page.goto('/login?tab=signup');
    await page.waitForLoadState('load');
    await page.locator('#signup-email').waitFor({ state: 'visible', timeout: 10_000 });

    await signUp(page, credential);
    await waitForBoardVisible(page);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas box unavailable');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    // Create Frame
    await page.click('[data-testid="tool-frame"]');
    await page.mouse.move(centerX - 200, centerY - 200);
    await page.mouse.down();
    await page.mouse.move(centerX + 200, centerY + 200, { steps: 5 });
    await page.mouse.up();
    
    await expect(page.locator('[data-testid="object-count"]')).toContainText('1', { timeout: 10_000 });

    // Create Sticky outside
    await page.click('[data-testid="tool-sticky"]');
    await page.mouse.click(centerX - 300, centerY - 300);
    await expect(page.locator('[data-testid="object-count"]')).toContainText('2', { timeout: 10_000 });

    // Drag into frame
    await page.click('[data-testid="tool-select"]');
    await page.mouse.move(centerX - 300, centerY - 300);
    await page.mouse.down();
    await page.mouse.move(centerX, centerY, { steps: 5 });
    await page.mouse.up();

    await expect(page.locator('[data-testid="object-count"]')).toContainText('2');
  });
});
