import { test, expect, type Page } from '@playwright/test';

const BOARD_TIMEOUT_MS = 15_000;

interface ICredential {
  email: string;
  password: string;
}

const createCredential = (): ICredential => {
  const suffix = `overlay-${Date.now()}@example.com`;
  return {
    email: suffix,
    password: `Overlay!${Date.now()}`,
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

const getOverlayBox = async (page: Page): Promise<{ x: number; y: number; width: number; height: number }> => {
  const overlay = page.locator('textarea.sticky-note-edit-overlay');
  const box = await overlay.boundingBox();
  if (!box) {
    throw new Error('Overlay bounding box unavailable');
  }

  return box;
};

test.describe('Text overlay stability (Task 7)', () => {
  test.setTimeout(60_000);

  test('sticky note overlay remains visible and usable after pan while editing', async ({
    page,
  }) => {
    const credential = createCredential();
    await page.goto('/login?tab=signup');
    await page.waitForLoadState('load');
    await page.locator('#signup-email').waitFor({ state: 'visible', timeout: 10_000 });

    await signUp(page, credential);
    await waitForBoardVisible(page);

    await expect(page.locator('[data-testid="object-count"]')).toBeVisible({
      timeout: BOARD_TIMEOUT_MS,
    });

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

    await page.click('[data-testid="tool-select"]');
    await page.mouse.dblclick(centerX, centerY);

    const overlay = page.locator('textarea.sticky-note-edit-overlay');
    await expect(overlay).toBeVisible({ timeout: 5_000 });
    const overlayBeforePan = await getOverlayBox(page);

    await page.click('[data-testid="tool-pan"]');
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 80, centerY + 40);
    await page.mouse.up();

    await expect(overlay).toBeVisible({ timeout: 10_000 });
    const overlayAfterPan = await getOverlayBox(page);
    const panDeltaX = overlayAfterPan.x - overlayBeforePan.x;
    const panDeltaY = overlayAfterPan.y - overlayBeforePan.y;

    // Overlay should track stage pan roughly 1:1; this catches transform double-apply drift.
    expect(panDeltaX).toBeGreaterThan(60);
    expect(panDeltaX).toBeLessThan(100);
    expect(panDeltaY).toBeGreaterThan(20);
    expect(panDeltaY).toBeLessThan(60);

    await overlay.fill('stable after pan');
    await overlay.press('Enter');

    await expect(overlay).not.toBeVisible();
    await expect(page.locator('[data-testid="object-count"]')).toContainText('1');
  });

  test('sticky note overlay remains visible after zoom while editing', async ({
    page,
  }) => {
    const credential = createCredential();
    await page.goto('/login?tab=signup');
    await page.waitForLoadState('load');
    await page.locator('#signup-email').waitFor({ state: 'visible', timeout: 10_000 });

    await signUp(page, credential);
    await waitForBoardVisible(page);

    await page.click('[data-testid="tool-sticky"]');
    const canvas = page.locator('canvas').first();
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

    await page.click('[data-testid="tool-select"]');
    await page.mouse.dblclick(centerX, centerY);

    const overlay = page.locator('textarea.sticky-note-edit-overlay');
    await expect(overlay).toBeVisible({ timeout: 5_000 });
    const overlayBeforeZoom = await getOverlayBox(page);

    await page.click('[data-testid="zoom-preset-200"]');

    await expect(overlay).toBeVisible({ timeout: 10_000 });
    const overlayAfterZoom = await getOverlayBox(page);
    const zoomWidthRatio = overlayAfterZoom.width / overlayBeforeZoom.width;
    const zoomHeightRatio = overlayAfterZoom.height / overlayBeforeZoom.height;

    // At 200%, overlay dimensions should scale about 2x.
    expect(zoomWidthRatio).toBeGreaterThan(1.7);
    expect(zoomWidthRatio).toBeLessThan(2.3);
    expect(zoomHeightRatio).toBeGreaterThan(1.7);
    expect(zoomHeightRatio).toBeLessThan(2.3);

    await overlay.press('Escape');
    await expect(overlay).not.toBeVisible();
  });
});
