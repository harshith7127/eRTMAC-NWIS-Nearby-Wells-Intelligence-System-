import { test, expect } from '@playwright/test';

test.describe('Platform Navigation, Mode Switches, and Interactive Controls', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root dev server
    await page.goto('/');
    // Wait for initial load
    await page.waitForLoadState('domcontentloaded');
  });

  test('Page loads cleanly without error boundary', async ({ page }) => {
    // Verify no Application Shell Error dialog is present
    const errorBanner = page.locator('text=Application Shell Error');
    await expect(errorBanner).not.toBeVisible();

    // Verify main header and active viewport badge are present
    const viewportBadge = page.locator('#visualization-viewport');
    await expect(viewportBadge).toBeVisible();
    await expect(page.locator('text=Active Viewport: MAP')).toBeVisible();
  });

  test('Header mode buttons switch viewports and update URL', async ({ page }) => {
    // 1. Switch to Subsurface (3D)
    const btnSubsurface = page.getByRole('button', { name: /Subsurface \(3D\)/i });
    await expect(btnSubsurface).toBeVisible();
    await btnSubsurface.click();

    // Verify HUD updates
    await expect(page.locator('text=Active Viewport: SUBSURFACE')).toBeVisible();
    await expect(page).toHaveURL(/mode=SUBSURFACE/);

    // 2. Switch to Near-Well
    const btnNearWell = page.getByRole('button', { name: /Near-Well/i });
    await expect(btnNearWell).toBeVisible();
    await btnNearWell.click();

    await expect(page.locator('text=Active Viewport: NEAR_WELL')).toBeVisible();
    await expect(page).toHaveURL(/mode=NEAR_WELL/);

    // 3. Switch to Comparison
    const btnComparison = page.getByRole('button', { name: /Comparison/i });
    await expect(btnComparison).toBeVisible();
    await btnComparison.click();

    await expect(page.locator('text=Active Viewport: COMPARISON')).toBeVisible();
    await expect(page).toHaveURL(/mode=COMPARISON/);

    // 4. Switch to Analysis
    const btnAnalysis = page.getByRole('button', { name: /^Analysis$/i });
    await expect(btnAnalysis).toBeVisible();
    await btnAnalysis.click();

    await expect(page.locator('text=Active Viewport: ANALYSIS')).toBeVisible();
    await expect(page).toHaveURL(/mode=ANALYSIS/);

    // 5. Switch to Report
    const btnReport = page.getByRole('button', { name: /^Report$/i });
    await expect(btnReport).toBeVisible();
    await btnReport.click();

    await expect(page.locator('text=Active Viewport: REPORT')).toBeVisible();
    await expect(page).toHaveURL(/mode=REPORT/);

    // 6. Return to Map (2D)
    const btnMap = page.getByRole('button', { name: /Map \(2D\)/i });
    await expect(btnMap).toBeVisible();
    await btnMap.click();

    await expect(page.locator('text=Active Viewport: MAP')).toBeVisible();
    await expect(page).toHaveURL(/mode=MAP/);
  });

  test('DetailsPanel tabs switch correctly', async ({ page }) => {
    // Click Overview tab
    const tabOverview = page.getByRole('tab', { name: /Overview/i });
    await tabOverview.click();
    await expect(page.locator('text=Total Depth (TD)')).toBeVisible();

    // Click Formation tab
    const tabFormation = page.getByRole('tab', { name: /Formation/i });
    await tabFormation.click();
    await expect(page.getByText(/Stratigraphic Tops/i)).toBeVisible();

    // Click Lookahead tab
    const tabLookahead = page.getByRole('tab', { name: /Look-ahead|Lookahead/i });
    await tabLookahead.click();
    await expect(page.locator('text=Offset Hazard Identified Ahead').or(page.locator('text=No Hazard Identified in Offset Interval'))).toBeVisible();
  });

  test('Enter Subsurface button transitions from Map to Subsurface', async ({ page }) => {
    // Ensure we start on MAP
    await expect(page.locator('text=Active Viewport: MAP')).toBeVisible();

    // Click ENTER SUBSURFACE button in the details panel
    const btnEnterSubsurface = page.locator('#btn-enter-subsurface');
    await expect(btnEnterSubsurface).toBeVisible();
    await btnEnterSubsurface.click();

    // Viewport should switch to SUBSURFACE
    await expect(page.locator('text=Active Viewport: SUBSURFACE')).toBeVisible();
    await expect(page).toHaveURL(/mode=SUBSURFACE/);
  });

  test('Site Analysis & Report button opens modal and can be closed', async ({ page }) => {
    const btnSiteAnalysis = page.getByRole('button', { name: /Site Analysis & Report/i });
    await expect(btnSiteAnalysis).toBeVisible();
    await btnSiteAnalysis.click();

    // Modal should appear
    const modalHeading = page.locator('text=Explainable Proposed Well Site Analysis');
    await expect(modalHeading).toBeVisible();

    // Close button should close modal
    const closeBtn = page.getByTitle('Close Analysis Modal');
    await closeBtn.click();
    await expect(modalHeading).not.toBeVisible();
  });
});
