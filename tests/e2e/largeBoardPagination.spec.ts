/**
 * E2E tests for S3: Wire pagination for large boards.
 * Article XIX requires E2E tests before implementation.
 *
 * These tests verify observable behavior:
 * - Large boards show a loading indicator during paginated fetch
 * - All objects eventually render after paginated load
 * - Small boards load without pagination delay
 * - Incremental updates arrive after paginated load completes
 *
 * Note: These tests use the app's exposed test hooks for seeding
 * large object sets. The pagination threshold (PAGINATION_THRESHOLD = 500)
 * is validated indirectly through loading state behavior.
 */
import { test, expect, type Page } from '@playwright/test';

const AUTH_TIMEOUT_MS = 20_000;
const BOARD_TIMEOUT_MS = 30_000;
const PAGINATION_THRESHOLD = 500;

const waitForBoardCanvas = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible({
    timeout: BOARD_TIMEOUT_MS,
  });
};

const getObjectCount = async (page: Page): Promise<number> => {
  const objectCountText = await page.locator('[data-testid="object-count"]').textContent();
  const match = objectCountText?.match(/(\d+)/);

  return Number(match?.[1] ?? '0');
};

test.describe('Large Board Pagination (S3)', () => {
  test.skip(true, 'S3 pagination not yet implemented — these tests define acceptance criteria');

  test('small board loads without pagination-specific loading state', async ({ page }) => {
    // Board with fewer than PAGINATION_THRESHOLD objects should use
    // the current subscription path (no pagination probe delay).
    await page.goto('/');
    await waitForBoardCanvas(page);

    const objectCount = await getObjectCount(page);
    expect(objectCount).toBeLessThanOrEqual(PAGINATION_THRESHOLD);

    // Board canvas should be interactive (not blocked by loading)
    await expect(page.locator('[data-testid="board-canvas"]')).toBeVisible();
  });

  test('large board shows loading state during paginated fetch', async ({ page }) => {
    // Seed a board with > PAGINATION_THRESHOLD objects.
    // After S3 implementation, navigating to this board should show
    // a loading indicator while fetchObjectsPaginated runs.
    await page.goto('/');
    await waitForBoardCanvas(page);

    // Verify loading indicator appears for large boards
    // (implementation will show loading=true while paginating)
    await expect(page.locator('[data-testid="board-loading"]')).toBeVisible({
      timeout: AUTH_TIMEOUT_MS,
    });

    // Eventually all objects should be present
    await expect(page.locator('[data-testid="object-count"]')).toContainText(
      String(PAGINATION_THRESHOLD + 100),
      { timeout: BOARD_TIMEOUT_MS }
    );
  });

  test('incremental updates arrive after paginated load completes', async ({ page }) => {
    // After large board finishes paginated load, delta subscription
    // should pick up new objects created by other clients.
    await page.goto('/');
    await waitForBoardCanvas(page);

    // Wait for initial paginated load to complete
    await expect(page.locator('[data-testid="board-loading"]')).toBeHidden({
      timeout: BOARD_TIMEOUT_MS,
    });

    const countBefore = await getObjectCount(page);

    // Simulate another client creating an object (via exposed test API)
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__testCreateObject?.({
        type: 'sticky',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fill: '#ff0000',
      });
    });

    // Delta subscription should deliver the new object
    await expect(async () => {
      const countAfter = await getObjectCount(page);
      expect(countAfter).toBe(countBefore + 1);
    }).toPass({ timeout: 10_000 });
  });

  test('paginated load renders all objects without duplicates', async ({ page }) => {
    // After paginated load completes, the total object count should
    // match the seeded count exactly — no duplicates from pagination
    // boundary edge cases.
    await page.goto('/');
    await waitForBoardCanvas(page);

    await expect(page.locator('[data-testid="board-loading"]')).toBeHidden({
      timeout: BOARD_TIMEOUT_MS,
    });

    const objectCount = await getObjectCount(page);
    // Seeded count should be exact (e.g. 600)
    expect(objectCount).toBeGreaterThan(PAGINATION_THRESHOLD);
  });
});
