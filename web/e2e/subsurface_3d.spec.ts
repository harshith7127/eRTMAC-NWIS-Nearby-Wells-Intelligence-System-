import { test, expect } from '@playwright/test';

test.describe('3D Subsurface Geological Viewer & Workstation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to Subsurface mode
    await page.goto('/?ws=volve&mode=SUBSURFACE');
    await page.waitForLoadState('domcontentloaded');
  });

  test('3D WebGL Canvas initializes and renders with Subsurface controls', async ({ page }) => {
    // 1. Verify Active Viewport is SUBSURFACE
    await expect(page.locator('text=Active Viewport: SUBSURFACE')).toBeVisible();

    // 2. Verify Three.js WebGL canvas is mounted and sized
    const canvas = page.locator('#visualization-viewport canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.height).toBeGreaterThan(200);

    // 3. Verify Subsurface 3D Controls HUD is visible
    await expect(page.locator('text=SUBSURFACE 3D CONTROLS')).toBeVisible();

    // 4. Test Vertical Exaggeration controls (1x, 2x, 3x)
    const btn2x = page.getByRole('button', { name: /^2x$/i });
    await expect(btn2x).toBeVisible();
    await btn2x.click();
    await expect(page.locator('text=2.0x')).toBeVisible();

    const btn1x = page.getByRole('button', { name: /^1x$/i });
    await expect(btn1x).toBeVisible();
    await btn1x.click();
    await expect(page.locator('text=1.0x')).toBeVisible();

    // 5. Test 3D Viewport Action Buttons
    const btnReset = page.getByRole('button', { name: /Reset 3D View/i });
    await expect(btnReset).toBeVisible();
    await btnReset.click();

    const btnFocus = page.getByRole('button', { name: /Focus Well/i });
    await expect(btnFocus).toBeVisible();
    await btnFocus.click();

    const btnWireframe = page.getByRole('button', { name: /Wireframe/i });
    await expect(btnWireframe).toBeVisible();
    await btnWireframe.click();

    // 6. Test Slicing Plane toggle
    const btnSlice = page.getByRole('button', { name: /^OFF$/i });
    await expect(btnSlice).toBeVisible();
    await btnSlice.click();

    // 7. Verify camera interaction (orbit via mouse drag on canvas)
    const centerX = box!.x + box!.width / 2;
    const centerY = box!.y + box!.height / 2;
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 60, centerY + 60);
    await page.mouse.up();

    // 8. Verify zoom interaction via wheel on canvas
    await page.mouse.wheel(0, -100);

    // 9. Verify no WebGL or unhandled error boundaries occurred
    const errorBanner = page.locator('text=Application Shell Error');
    await expect(errorBanner).not.toBeVisible();
  });
});
