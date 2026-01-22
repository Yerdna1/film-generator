/**
 * E2E Tests for Unified Confirmation Dialogs
 *
 * Tests the confirmation dialog behavior across all workflow steps:
 * - Step 1: Prompt Generation
 * - Step 2: Character Generation
 * - Step 3: Scene Image Generation
 * - Step 4: Video Generation
 * - Step 5: Voiceover Generation
 * - Step 6: Music Generation
 */

import { test, expect } from '@playwright/test';

// Helper to login with test user
async function login(page, email = 'test@example.com', password = 'testpassword') {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForURL('/', { timeout: 5000 });
}

// Helper to create a test project
async function createProject(page, name = 'E2E Test Project') {
  await page.goto('/');
  await page.click('button:has-text("New Project")');

  await page.fill('input[name="name"]', name);

  // Fill in basic project details
  await page.fill('input[name="genre"]', 'Sci-Fi');
  await page.fill('textarea[name="premise"]', 'A test project for E2E testing');

  await page.click('button:has-text("Create Project")');

  // Wait for project creation
  await page.waitForURL(/\/project\/[a-z0-9-]+/, { timeout: 5000 });
}

test.describe('Unified Confirmation Dialogs', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test.describe('Step 1: Prompt Generation Dialog', () => {
    test('should show confirmation dialog before generating prompt', async ({ page }) => {
      await createProject(page);

      // Click generate prompt button
      await page.click('button:has-text("Generate Main Prompt")');

      // Dialog should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Generate Main Prompt')).toBeVisible();

      // Should show LLM provider
      await expect(page.locator('text=Provider')).toBeVisible();
      await expect(page.locator('[data-testid="provider-logo"]')).toBeVisible();

      // Should show model
      await expect(page.locator('text=Model')).toBeVisible();

      // Should show story context
      await expect(page.locator('text=Genre')).toBeVisible();
      await expect(page.locator('text=Sci-Fi')).toBeVisible();

      // Cancel button should close dialog
      await page.click('button:has-text("Cancel")');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('should generate prompt after confirmation', async ({ page }) => {
      await createProject(page);

      await page.click('button:has-text("Generate Main Prompt")');
      await page.click('button:has-text("Generate")');

      // Should show loading state
      await expect(page.locator('text=Generating')).toBeVisible();

      // Should show success state
      await expect(page.locator('text=Operation completed successfully')).toBeVisible();

      // Dialog should auto-close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Step 2: Character Generation Dialog', () => {
    test('should show confirmation dialog before generating characters', async ({ page }) => {
      await createProject(page);

      // Navigate to Step 2
      await page.click('a[href="#step2"]');

      // Click generate characters button
      await page.click('button:has-text("Generate All Characters")');

      // Dialog should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Generate Characters')).toBeVisible();

      // Should show image provider
      await expect(page.locator('text=Provider')).toBeVisible();

      // Should show character count
      await expect(page.locator('text=Count')).toBeVisible();

      // Should show resolution
      await expect(page.locator('text=Resolution')).toBeVisible();

      // Should show estimated cost
      await expect(page.locator('text=Estimated Cost')).toBeVisible();
    });

    test('should show dialog for individual character generation', async ({ page }) => {
      await createProject(page);
      await page.click('a[href="#step2"]');

      // Add a character first
      await page.click('button:has-text("Add Character")');
      await page.fill('input[name="name"]', 'Test Character');
      await page.click('button:has-text("Save")');

      // Generate individual character
      await page.click('button[aria-label*="Generate image for Test Character"]');

      // Should show confirmation dialog
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Test Character')).toBeVisible();
    });
  });

  test.describe('Step 3: Scene Image Generation Dialog', () => {
    test('should show confirmation dialog before generating scene images', async ({ page }) => {
      await createProject(page);

      // Generate scenes first
      await page.click('button:has-text("Generate Scenes")');
      await page.waitForTimeout(2000); // Wait for scene generation

      // Navigate to Step 3
      await page.click('a[href="#step3"]');

      // Click generate images button
      await page.click('button:has-text("Generate All Images")');

      // Dialog should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Generate Images')).toBeVisible();

      // Should show scene count
      await expect(page.locator('text=Count')).toBeVisible();

      // Should show resolution and aspect ratio
      await expect(page.locator('text=Resolution')).toBeVisible();
      await expect(page.locator('text=Aspect Ratio')).toBeVisible();
    });
  });

  test.describe('Step 4: Video Generation Dialog', () => {
    test('should show confirmation dialog before generating videos', async ({ page }) => {
      await createProject(page);

      // Navigate to Step 4
      await page.click('a[href="#step4"]');

      // Click generate videos button
      await page.click('button:has-text("Generate All Videos")');

      // Dialog should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Generate Videos')).toBeVisible();

      // Should show video provider
      await expect(page.locator('text=Provider')).toBeVisible();

      // Should show number of videos
      await expect(page.locator('text=Count')).toBeVisible();

      // Should show KIE model selection
      await expect(page.locator('text=Model')).toBeVisible();

      // Should show cost estimation
      await expect(page.locator('text=Estimated Cost')).toBeVisible();
    });

    test('should show dialog for individual video generation', async ({ page }) => {
      await createProject(page);
      await page.click('a[href="#step4"]');

      // Find first scene's generate button
      const firstSceneButton = page.locator('button[aria-label*="Generate video"]').first();
      await firstSceneButton.click();

      // Should show confirmation dialog
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });
  });

  test.describe('Step 5: Voiceover Generation Dialog', () => {
    test('should show confirmation dialog before generating voiceovers', async ({ page }) => {
      await createProject(page);

      // Navigate to Step 5
      await page.click('a[href="#step5"]');

      // Click generate voiceovers button
      await page.click('button:has-text("Generate All Voiceovers")');

      // Dialog should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Generate Voiceovers')).toBeVisible();

      // Should show TTS provider
      await expect(page.locator('text=Provider')).toBeVisible();

      // Should show voice assignments
      await expect(page.locator('text=Voice')).toBeVisible();

      // Should show language and line count
      await expect(page.locator('text=Language')).toBeVisible();
    });

    test('should show dialog for individual audio generation', async ({ page }) => {
      await createProject(page);
      await page.click('a[href="#step5"]');

      // Find first line's generate button
      const firstLineButton = page.locator('button[aria-label*="Generate audio"]').first();
      await firstLineButton.click();

      // Should show confirmation dialog
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Generate Audio')).toBeVisible();
    });
  });

  test.describe('Step 6: Music Generation Dialog', () => {
    test('should show confirmation dialog before generating music', async ({ page }) => {
      await createProject(page);

      // Navigate to Step 6
      await page.click('a[href="#step6"]');

      // Click generate music button
      await page.click('button:has-text("Generate Background Music")');

      // Dialog should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Generate Background Music')).toBeVisible();

      // Should show music provider
      await expect(page.locator('text=Provider')).toBeVisible();

      // Should show model
      await expect(page.locator('text=Model')).toBeVisible();

      // Should show type (instrumental/vocals)
      await expect(page.locator('text=Type')).toBeVisible();

      // Should show duration
      await expect(page.locator('text=Duration')).toBeVisible();
    });
  });

  test.describe('Dialog States and Interactions', () => {
    test('should handle loading state correctly', async ({ page }) => {
      await createProject(page);

      await page.click('button:has-text("Generate Main Prompt")');
      await page.click('button:has-text("Generate")');

      // Should show loading spinner
      await expect(page.locator('.animate-spin')).toBeVisible();

      // Should disable buttons during loading
      await expect(page.locator('button:has-text("Cancel")')).not.toBeVisible();
    });

    test('should handle error state with retry option', async ({ page }) => {
      await createProject(page);

      // Mock API failure
      await page.route('**/api/llm/generate', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'API Error' }),
        });
      });

      await page.click('button:has-text("Generate Main Prompt")');
      await page.click('button:has-text("Generate")');

      // Should show error state
      await expect(page.locator('text=Error')).toBeVisible();

      // Should show retry button
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    });

    test('should cancel dialog when Cancel button clicked', async ({ page }) => {
      await createProject(page);

      await page.click('button:has-text("Generate Main Prompt")');
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await page.click('button:has-text("Cancel")');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('should close dialog on Escape key', async ({ page }) => {
      await createProject(page);

      await page.click('button:has-text("Generate Main Prompt")');
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('should close dialog on backdrop click', async ({ page }) => {
      await createProject(page);

      await page.click('button:has-text("Generate Main Prompt")');
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Click backdrop (fixed overlay)
      const backdrop = page.locator('.fixed.inset-0.bg-black\\/60');
      await backdrop.click({ force: true });
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });
  });

  test.describe('Provider Switching', () => {
    test('should update dialog when provider is switched', async ({ page }) => {
      await createProject(page);

      // Open settings
      await page.click('button[aria-label="Settings"]');

      // Switch image provider
      await page.click('button:has-text("Image Provider")');
      await page.click('button:has-text("KIE.ai")');
      await page.click('button:has-text("Save")');

      // Close settings
      await page.click('button[aria-label="Close settings"]');

      // Navigate to Step 3 and try to generate images
      await page.click('a[href="#step3"]');
      await page.click('button:has-text("Generate All Images")');

      // Dialog should show KIE provider
      await expect(page.locator('[data-provider="kie"]')).toBeVisible();
    });
  });

  test.describe('Cost Calculations', () => {
    test('should display accurate estimated costs', async ({ page }) => {
      await createProject(page);
      await page.click('a[href="#step2"]');

      await page.click('button:has-text("Generate All Characters")');

      // Should show cost in credits
      const costElement = page.locator('text=Estimated Cost');
      await expect(costElement).toBeVisible();

      const costText = await costElement.textContent();
      expect(costText).toContain('credits');
    });

    test('should update cost when resolution changes', async ({ page }) => {
      await createProject(page);

      // Open settings and change resolution
      await page.click('button[aria-label="Settings"]');
      await page.selectOption('select[name="imageResolution"]', '4k');
      await page.click('button:has-text("Save")');
      await page.click('button[aria-label="Close settings"]');

      // Check character generation dialog
      await page.click('a[href="#step2"]');
      await page.click('button:has-text("Generate All Characters")');

      // Should reflect higher cost for 4K
      await expect(page.locator('text=4K')).toBeVisible();
    });
  });
});

test.describe('Confirmation Dialogs Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await login(page);
    await createProject(page);

    await page.click('button:has-text("Generate Main Prompt")');

    // Focus should be on confirm button
    const confirmButton = page.locator('button:has-text("Generate")');
    await expect(confirmButton).toBeFocused();

    // Tab to cancel button
    await page.keyboard.press('Tab');
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeFocused();
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    await login(page);
    await createProject(page);

    await page.click('button:has-text("Generate Main Prompt")');

    // Check dialog has proper role
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveAttribute('role', 'dialog');

    // Check for aria-live on status updates
    await expect(dialog.locator('[aria-live="polite"]')).toBeVisible();
  });
});

test.describe('Confirmation Dialogs Performance', () => {
  test('should open dialog without UI lag', async ({ page }) => {
    await login(page);
    await createProject(page);

    const startTime = Date.now();
    await page.click('button:has-text("Generate Main Prompt")');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    const endTime = Date.now();

    // Should open in less than 100ms
    expect(endTime - startTime).toBeLessThan(100);
  });

  test('should not block UI during dialog animation', async ({ page }) => {
    await login(page);
    await createProject(page);

    await page.click('button:has-text("Generate Main Prompt")');

    // Background should be visible (not frozen)
    await expect(page.locator('text=Sci-Fi')).toBeVisible();
  });
});
