import { test, expect, type Page } from '@playwright/test';

const BOARD_TIMEOUT_MS = 15_000;

interface ICredential {
  email: string;
  password: string;
}

const createCredential = (): ICredential => {
  const suffix = `snapgrid-${Date.now()}@example.com`;
  return {
    email: suffix,
    password: `SnapGrid!${Date.now()}`,
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

test.describe('Snap-to-grid drag parity', () => {
  test.setTimeout(60_000);

  test('with snap to grid on, drag object and board remains consistent', async ({ page }) => {
    const credential = createCredential();
    await page.goto('/login?tab=signup');
    await page.waitForLoadState('load');
    await page.locator('#signup-email').waitFor({ state: 'visible', timeout: 10_000 });

    await signUp(page, credential);
    await waitForBoardVisible(page);

    await expect(page.locator('[data-testid="object-count"]')).toBeVisible({
      timeout: BOARD_TIMEOUT_MS,
    });

    // Enable snap to grid (button title becomes "Disable snap to grid" when on)
    await page.click('[data-testid="toggle-snap-to-grid"]');
    await expect(page.locator('[data-testid="toggle-snap-to-grid"]')).toHaveAttribute(
      'title',
      'Disable snap to grid'
    );

    // Create a sticky note (click to create)
    await page.click('[data-testid="tool-sticky"]');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error('Canvas bounding box unavailable');
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    await page.mouse.click(centerX, centerY);

    await expect(page.locator('[data-testid="object-count"]')).toContainText('1', {
      timeout: 10_000,
    });

    // Select tool and drag the shape
    await page.click('[data-testid="tool-select"]');
    const dragStartX = centerX;
    const dragStartY = centerY;
    await page.mouse.move(dragStartX, dragStartY);
    await page.mouse.down();
    await page.mouse.move(dragStartX + 120, dragStartY + 80, { steps: 5 });
    await page.mouse.up();

    // Object should still be present; with snap to grid the position is constrained during drag and on end
    await expect(page.locator('[data-testid="object-count"]')).toContainText('1');
    await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible();
  });
});
