import { test, expect, type Page } from '@playwright/test';

/**
 * E2E acceptance tests for Guest Board feature.
 * Feature is not implemented yet; these tests describe desired behavior and will fail until implementation exists.
 * Use data-testid selectors throughout.
 */

const BOARD_TIMEOUT_MS = 15_000;
const AUTH_TIMEOUT_MS = 20_000;

interface ICredential {
  email: string;
  password: string;
}

const createCredential = (): ICredential => {
  const suffix = `guest-board-${Date.now()}@example.com`;
  return {
    email: suffix,
    password: `GuestBoard!${Date.now()}`,
  };
};

const signUp = async (page: Page, credential: ICredential): Promise<void> => {
  await page.goto('/login?tab=signup');
  await page.waitForLoadState('load');
  await page.locator('#signup-email').waitFor({ state: 'visible', timeout: 10_000 });
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

const addStickyOnCanvas = async (page: Page): Promise<void> => {
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
};

test.describe('Guest Board', () => {
  test.setTimeout(60_000);

  test('logged out: landing page guest CTA navigates to /board/guest and user can edit', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    await expect(page.locator('[data-testid="welcome-page"]')).toBeVisible({
      timeout: AUTH_TIMEOUT_MS,
    });

    const guestCta = page.locator('[data-testid="guest-board-cta"]');
    await expect(guestCta).toBeVisible();
    await guestCta.click();

    await expect(page).toHaveURL(/\/board\/guest/);
    await waitForBoardVisible(page);

    await addStickyOnCanvas(page);
  });

  test('logged in: header guest board link navigates to /board/guest and user can edit', async ({
    page,
  }) => {
    const credential = createCredential();
    await page.goto('/');
    await page.waitForLoadState('load');
    await signUp(page, credential);
    await waitForBoardVisible(page);

    const guestLink = page.locator('[data-testid="header-guest-board-link"]');
    await expect(guestLink).toBeVisible();
    await guestLink.click();

    await expect(page).toHaveURL(/\/board\/guest/);
    await waitForBoardVisible(page);

    await addStickyOnCanvas(page);
  });

  test('guest board does not appear in boards list sidebar when logged in on another board', async ({
    page,
  }) => {
    const credential = createCredential();
    await page.goto('/');
    await page.waitForLoadState('load');
    await signUp(page, credential);
    await waitForBoardVisible(page);

    const boardUrl = page.url();
    expect(boardUrl).toMatch(/\/board\/[^/]+/);
    const currentBoardId = new URL(boardUrl).pathname.split('/')[2];
    expect(currentBoardId).not.toBe('guest');

    await page.click('[data-testid="sidebar-rail-tab-boards"]');
    await expect(page.locator('[data-testid="board-list-sidebar"]')).toBeVisible({
      timeout: 5_000,
    });

    const guestBoardItem = page.locator('[data-testid="board-list-item-guest"]');
    await expect(guestBoardItem).not.toBeVisible();
  });

  test('delete board is not available when on guest board', async ({ page }) => {
    const credential = createCredential();
    await page.goto('/');
    await page.waitForLoadState('load');
    await signUp(page, credential);
    await waitForBoardVisible(page);

    await page.goto('/board/guest');
    await page.waitForLoadState('load');
    await waitForBoardVisible(page);
    await expect(page).toHaveURL(/\/board\/guest/);

    const shareButton = page.getByRole('button', { name: /share/i });
    if (await shareButton.isVisible()) {
      await shareButton.click();
      await expect(page.locator('[data-testid="share-dialog-delete-board"]')).not.toBeVisible();
    } else {
      const deleteBoardInUi = page.locator('[data-testid="share-dialog-delete-board"]');
      await expect(deleteBoardInUi).not.toBeVisible();
    }
  });
});
