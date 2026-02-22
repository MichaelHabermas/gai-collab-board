import { expect, type Page } from '@playwright/test';

const DEFAULT_BOARD_TIMEOUT_MS = 30_000;

const parseTotalCount = (value: string | null): number => {
  if (!value) {
    return 0;
  }

  const slashMatch = value.match(/\/(\d+)/);
  if (slashMatch?.[1]) {
    return Number.parseInt(slashMatch[1], 10);
  }

  const firstMatch = value.match(/\d+/);
  if (firstMatch?.[0]) {
    return Number.parseInt(firstMatch[0], 10);
  }

  return 0;
};

const getTotalCount = async (page: Page): Promise<number> => {
  const text = await page.locator('[data-testid="object-count"]').textContent();
  return parseTotalCount(text);
};

const clearBoardObjects = async (page: Page): Promise<void> => {
  const countLocator = page.locator('[data-testid="object-count"]');
  await expect(countLocator).toBeVisible({ timeout: 10_000 });

  const countBefore = await getTotalCount(page);
  if (!countBefore) {
    return;
  }

  await page.click('[data-testid="tool-select"]');
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');

  await expect
    .poll(async () => getTotalCount(page), {
      timeout: 10_000,
      message: 'Expected guest board to clear to zero objects',
    })
    .toBe(0);
};

export const openCleanGuestBoard = async (
  page: Page,
  boardTimeoutMs = DEFAULT_BOARD_TIMEOUT_MS
): Promise<void> => {
  await page.goto('/board/guest');
  await page.waitForLoadState('load');
  await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({
    timeout: boardTimeoutMs,
  });
  await clearBoardObjects(page);
};
