import { test, expect, type Page } from '@playwright/test';

const AUTH_TIMEOUT_MS = 20_000;
const BOARD_TIMEOUT_MS = 15_000;

interface ICredential {
  email: string;
  password: string;
}

const createCredential = (): ICredential => {
  const suffix = `sharelink-${Date.now()}@example.com`;
  return {
    email: suffix,
    password: `ShareLink!${Date.now()}`,
  };
};

const signUp = async (page: Page, credential: ICredential): Promise<void> => {
  await page.goto('/login');
  await page.locator('button[role="tab"]:has-text("Sign Up")').click();
  await page.locator('#signup-email').fill(credential.email);
  await page.locator('#signup-password').fill(credential.password);
  await page.locator('#confirm-password').fill(credential.password);
  await page.locator('button:has-text("Create Account")').click();
};

const signIn = async (page: Page, credential: ICredential): Promise<void> => {
  await page.locator('button[role="tab"]:has-text("Sign In")').click();
  await page.locator('#email').fill(credential.email);
  await page.locator('#password').fill(credential.password);
  await page.locator('form:has(#email) button[type="submit"]').click();
};

const waitForBoardVisible = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({
    timeout: BOARD_TIMEOUT_MS,
  });
};

test.describe('Share link / deep-linking', () => {
  test.setTimeout(60_000);

  test('opening share link when logged in loads that board', async ({ page, context }) => {
    const credential = createCredential();

    await page.goto('/');
    await page.waitForLoadState('load');

    await signUp(page, credential);
    await waitForBoardVisible(page);

    const shareUrl = page.url();
    expect(shareUrl).toMatch(/\/board\/[^/]+/);

    const page2 = await context.newPage();
    await page2.goto(shareUrl);
    await page2.waitForLoadState('load');

    await expect(page2.locator('[data-testid="board-canvas"]')).toBeVisible({
      timeout: BOARD_TIMEOUT_MS,
    });
    await expect(page2).toHaveURL(/\/board\/.+/);

    await page2.close();
  });

  test('opening share link when logged out shows auth; after login user is on that board', async ({
    browser,
    context,
  }) => {
    const credential = createCredential();

    const authPage = await context.newPage();
    await authPage.goto('/');
    await authPage.waitForLoadState('load');

    await signUp(authPage, credential);
    await waitForBoardVisible(authPage);

    const boardId = new URL(authPage.url()).pathname.split('/')[2];
    expect(boardId).toBeTruthy();
    await authPage.close();

    const incognito = await browser.newContext();
    const guestPage = await incognito.newPage();
    await guestPage.goto(`/board/${boardId}`);
    await guestPage.waitForLoadState('load');

    await expect(guestPage.locator('text=Sign In').first()).toBeVisible({
      timeout: AUTH_TIMEOUT_MS,
    });
    await expect(guestPage.locator('#email')).toBeVisible();

    await signIn(guestPage, credential);

    await expect(guestPage.locator('[data-testid="board-canvas"]')).toBeVisible({
      timeout: BOARD_TIMEOUT_MS,
    });
    await expect(guestPage).toHaveURL(new RegExp(`/board/${boardId}`));

    await incognito.close();
  });

  test('refreshing the page on a board URL keeps user on that board', async ({ page }) => {
    const credential = createCredential();

    await page.goto('/');
    await page.waitForLoadState('load');

    await signUp(page, credential);
    await waitForBoardVisible(page);

    const urlBefore = page.url();
    expect(urlBefore).toMatch(/\/board\/[^/]+/);

    await page.reload();
    await page.waitForLoadState('load');

    await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({
      timeout: BOARD_TIMEOUT_MS,
    });
    await expect(page).toHaveURL(urlBefore);
  });

  test('visiting / when authenticated redirects to active board', async ({ page }) => {
    const credential = createCredential();

    await page.goto('/');
    await page.waitForLoadState('load');

    await signUp(page, credential);
    await waitForBoardVisible(page);

    const boardUrlAfterSignUp = page.url();
    expect(boardUrlAfterSignUp).toMatch(/\/board\/[^/]+/);

    await page.goto('/');
    await page.waitForLoadState('load');

    await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({
      timeout: BOARD_TIMEOUT_MS,
    });
    await expect(page).toHaveURL(/\/board\/[^/]+/);
  });
});
