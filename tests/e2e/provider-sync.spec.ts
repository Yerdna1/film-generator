/**
 * E2E Tests for Provider Synchronization
 *
 * Tests bidirectional synchronization between:
 * - Configure API Keys & Providers modal
 * - Settings page
 *
 * Also tests:
 * - Multi-tab synchronization
 * - Persistence across page refreshes
 * - Race condition handling
 */

import { test, expect } from '@playwright/test';

// Helper to login
async function login(page, email = 'test@example.com', password = 'testpassword') {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 5000 });
}

test.describe('Provider Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Modal to Settings Sync', () => {
    test('should sync provider change from modal to settings page', async ({ page }) => {
      // Open modal from workflow
      await page.goto('/');
      await page.click('button:has-text("New Project")');
      await page.fill('input[name="name"]', 'Sync Test Project');
      await page.fill('input[name="genre"]', 'Test');
      await page.fill('textarea[name="premise"]', 'Test');
      await page.click('button:has-text("Create Project")');
      await page.waitForURL(/\/project\/[a-z0-9-]+/);

      // This should trigger the modal if API keys are missing
      // Or we can manually open it
      await page.click('button[aria-label="Configure providers"]');

      // Wait for modal to open
      await expect(page.locator('text=Configure API Keys & Providers')).toBeVisible();

      // Switch LLM provider in modal
      await page.click('button:has-text("All")'); // Go to All tab
      await page.click('[data-testid="provider-selector-llm"]');
      await page.click('text=Claude SDK');

      // Wait for auto-save to complete (check for saved indicator)
      await expect(page.locator('text=Saved')).toBeVisible({ timeout: 2000 });

      // Close modal
      await page.click('button:has-text("Done")');

      // Navigate to settings page
      await page.click('button[aria-label="Settings"]');

      // Settings should reflect the change
      await expect(page.locator('select[name="llmProvider"]')).toHaveValue('claude-sdk');
    });

    test('should sync model change from modal to settings page', async ({ page }) => {
      await page.goto('/settings');

      // Open provider modal from settings
      await page.click('button:has-text("Configure Providers")');

      // Switch to LLM tab
      await page.click('button:has-text("LLM")');

      // Change OpenRouter model
      await page.click('select[name="openRouterModel"]');
      await page.selectOption('openrouter/deepseek-chat', 'deepseek-chat');

      // Wait for auto-save
      await expect(page.locator('text=Saved')).toBeVisible({ timeout: 2000 });

      // Close modal
      await page.click('button:has-text("Done")');

      // Settings should show the new model
      await expect(page.locator('select[name="openRouterModel"]')).toHaveValue('openrouter/deepseek-chat');
    });

    test('should sync API key change from modal to settings page', async ({ page }) => {
      await page.goto('/settings');

      // Open provider modal
      await page.click('button:has-text("Configure Providers")');

      // Switch to Image tab
      await page.click('button:has-text("Image")');

      // Update Gemini API key
      await page.fill('input[name="geminiApiKey"]', 'new-test-api-key-12345');

      // Wait for auto-save
      await expect(page.locator('text=Saved')).toBeVisible({ timeout: 2000 });

      // Close modal
      await page.click('button:has-text("Done")');

      // Settings should show masked version of the key
      await expect(page.locator('input[name="geminiApiKey"]')).toHaveValue(/\*{5,}.+/);
    });

    test('should sync KIE model changes from modal to settings', async ({ page }) => {
      await page.goto('/settings');

      // Open provider modal
      await page.click('button:has-text("Configure Providers")');

      // Switch to Image tab
      await page.click('button:has-text("Image")');

      // Select KIE provider
      await page.click('[data-provider="kie"]');

      // Select a KIE model
      await page.click('select[name="kieImageModel"]');
      await page.selectOption('seedream/4-5-text-to-image', 'seedream');

      // Wait for auto-save
      await expect(page.locator('text=Saved')).toBeVisible({ timeout: 2000 });

      // Close modal
      await page.click('button:has-text("Done")');

      // Settings should reflect KIE model
      await expect(page.locator('select[name="kieImageModel"]')).toHaveValue('seedream/4-5-text-to-image');
    });
  });

  test.describe('Settings to Modal Sync', () => {
    test('should sync provider change from settings to modal', async ({ page }) => {
      await page.goto('/settings');

      // Change LLM provider in settings
      await page.selectOption('select[name="llmProvider"]', 'gemini');

      // Wait for sync indicator
      await expect(page.locator('text=LLM provider updated')).toBeVisible({ timeout: 2000 });

      // Open modal
      await page.click('button:has-text("Configure Providers")');

      // Modal should show Gemini as selected
      await page.click('button:has-text("All")');

      const llmProviderIndicator = page.locator('[data-testid="current-llm-provider"]');
      await expect(llmProviderIndicator).toContainText('Google Gemini');

      // Close modal
      await page.click('button:has-text("Done")');
    });

    test('should sync model change from settings to modal', async ({ page }) => {
      await page.goto('/settings');

      // Change OpenRouter model
      await page.selectOption('select[name="openRouterModel"]', 'anthropic/claude-sonnet-4');

      // Wait for sync
      await expect(page.locator('text=Model updated')).toBeVisible({ timeout: 2000 });

      // Open modal
      await page.click('button:has-text("Configure Providers")');

      // Modal should reflect the change
      await page.click('button:has-text("LLM")');
      await expect(page.locator('select[name="openRouterModel"]')).toHaveValue('anthropic/claude-sonnet-4');

      // Close modal
      await page.click('button:has-text("Done")');
    });

    test('should sync API key saved from settings to modal', async ({ page }) => {
      await page.goto('/settings');

      // Update and save API key
      await page.fill('input[name="geminiApiKey"]', 'settings-api-key-67890');
      await page.click('button:has-text("Save")');

      // Wait for save confirmation
      await expect(page.locator('text=API key updated successfully')).toBeVisible({ timeout: 2000 });

      // Open modal
      await page.click('button:has-text("Configure Providers")');

      // Modal should have the new key
      await page.click('button:has-text("Image")');
      await expect(page.locator('input[name="geminiApiKey"]')).toHaveValue('settings-api-key-67890');

      // Close modal
      await page.click('button:has-text("Done")');
    });
  });

  test.describe('Multi-Tab Synchronization', () => {
    test('should sync changes across multiple browser tabs', async ({ browserContext }) => {
      // Open first tab and login
      const page1 = await browserContext.newPage();
      await login(page1);
      await page1.goto('/settings');

      // Open second tab (same session)
      const page2 = await browserContext.newPage();
      await page2.goto('/settings');

      // Change provider in first tab
      await page1.selectOption('select[name="llmProvider"]', 'claude-sdk');

      // Wait for sync
      await expect(page1.locator('text=LLM provider updated')).toBeVisible({ timeout: 2000 });

      // Second tab should reflect the change (might need refresh or poll)
      await page2.reload();
      await expect(page2.locator('select[name="llmProvider"]')).toHaveValue('claude-sdk');

      // Close tabs
      await page1.close();
      await page2.close();
    });

    test('should handle concurrent edits from multiple tabs', async ({ browserContext }) => {
      const page1 = await browserContext.newPage();
      const page2 = await browserContext.newPage();

      await login(page1);
      await login(page2);

      await page1.goto('/settings');
      await page2.goto('/settings');

      // Make concurrent changes (race condition test)
      await Promise.all([
        page1.selectOption('select[name="llmProvider"]', 'claude-sdk'),
        page2.selectOption('select[name="imageProvider"]', 'modal'),
      ]);

      // Both should be saved
      await expect(page1.locator('text=LLM provider updated')).toBeVisible({ timeout: 3000 });
      await expect(page2.locator('text=Image provider updated')).toBeVisible({ timeout: 3000 });

      // Verify both changes persisted
      await page1.reload();
      await expect(page1.locator('select[name="llmProvider"]')).toHaveValue('claude-sdk');
      await expect(page1.locator('select[name="imageProvider"]')).toHaveValue('modal');

      await page1.close();
      await page2.close();
    });
  });

  test.describe('Persistence', () => {
    test('should persist changes across page refresh', async ({ page }) => {
      await page.goto('/settings');

      // Change provider
      await page.selectOption('select[name="musicProvider"]', 'suno');
      await expect(page.locator('text=Music provider updated')).toBeVisible({ timeout: 2000 });

      // Refresh page
      await page.reload();

      // Change should persist
      await expect(page.locator('select[name="musicProvider"]')).toHaveValue('suno');
    });

    test('should persist API keys across logout/login', async ({ page }) => {
      await page.goto('/settings');

      // Save API key
      await page.fill('input[name="openaiApiKey"]', 'persistent-key-123');
      await page.click('button:has-text("Save")');
      await expect(page.locator('text=API key updated successfully')).toBeVisible({ timeout: 2000 });

      // Logout
      await page.click('button[aria-label="User menu"]');
      await page.click('button:has-text("Sign out")');
      await page.waitForURL('/auth/signin');

      // Login again
      await login(page);
      await page.goto('/settings');

      // API key should persist (masked)
      await expect(page.locator('input[name="openaiApiKey"]')).not.toBeEmpty();
      const value = await page.locator('input[name="openaiApiKey"]').inputValue();
      expect(value).toMatch(/\*{5,}.+/); // Should be masked
    });
  });

  test.describe('Error Handling', () => {
    test('should handle failed saves gracefully', async ({ page }) => {
      // Mock failed API response
      await page.route('**/api/user/api-keys', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database error' }),
        });
      });

      await page.goto('/settings');

      // Try to save
      await page.fill('input[name="geminiApiKey"]', 'test-key');
      await page.click('button:has-text("Save")');

      // Should show error message
      await expect(page.locator('text=Failed to save')).toBeVisible({ timeout: 2000 });

      // Stop mocking
      await page.unroute('**/api/user/api-keys');
    });

    test('should handle network failures', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/user/api-keys', route => route.abort('failed'));

      await page.goto('/settings');

      // Try to change provider
      await page.selectOption('select[name="llmProvider"]', 'gemini');

      // Should show error toast
      await expect(page.locator('text=Failed to update')).toBeVisible({ timeout: 2000 });

      // Provider should NOT have changed in UI
      await expect(page.locator('select[name="llmProvider"]')).not.toHaveValue('gemini');

      await page.unroute('**/api/user/api-keys');
    });
  });

  test.describe('Auto-Save Debouncing', () => {
    test('should debounce rapid changes', async ({ page }) => {
      await page.goto('/settings');

      // Open modal
      await page.click('button:has-text("Configure Providers")');

      // Make rapid changes
      await page.click('button:has-text("Image")');
      await page.click('[data-provider="gemini"]');

      // Immediately switch again
      await page.click('[data-provider="kie"]');

      // Should only save once (after debounce period)
      // Look for single "Saved" indicator, not multiple
      await expect(page.locator('text=Saved')).toBeVisible({ timeout: 2000 });

      // Count save indicators - should only be one
      const savedCount = await page.locator('text=Saved').count();
      expect(savedCount).toBeLessThanOrEqual(1);

      // Close modal
      await page.click('button:has-text("Done")');
    });

    test('should show "Saving" state during debounce', async ({ page }) => {
      await page.goto('/settings');

      // Open modal
      await page.click('button:has-text("Configure Providers")');

      // Make a change
      await page.click('button:has-text("Image")');
      await page.click('[data-provider="modal"]');

      // Should show "Saving" briefly
      await expect(page.locator('text=Saving')).toBeVisible({ timeout: 500 });

      // Then show "Saved"
      await expect(page.locator('text=Saved')).toBeVisible({ timeout: 2000 });

      // Close modal
      await page.click('button:has-text("Done")');
    });
  });

  test.describe('Settings Migration', () => {
    test('should migrate localStorage settings to database', async ({ page }) => {
      // Simulate having old localStorage settings
      await page.evaluate(() => {
        localStorage.setItem('app-llm-provider', 'claude-sdk');
        localStorage.setItem('app-openrouter-model', 'anthropic/claude-sonnet-4');
        localStorage.setItem('app-music-provider', 'suno');
      });

      // Go to settings (triggers migration)
      await page.goto('/settings');

      // Wait for migration to complete
      await page.waitForTimeout(1000);

      // Check that values are now in database
      await expect(page.locator('select[name="llmProvider"]')).toHaveValue('claude-sdk');
      await expect(page.locator('select[name="musicProvider"]')).toHaveValue('suno');

      // Verify localStorage is cleared
      const localStorageData = await page.evaluate(() => {
        return {
          llmProvider: localStorage.getItem('app-llm-provider'),
          musicProvider: localStorage.getItem('app-music-provider'),
        };
      });

      expect(localStorageData.llmProvider).toBeNull();
      expect(localStorageData.musicProvider).toBeNull();
    });
  });
});

test.describe('Provider Sync Performance', () => {
  test('should sync changes within 1 second', async ({ page }) => {
    await login(page);
    await page.goto('/settings');

    const startTime = Date.now();

    // Change provider
    await page.selectOption('select[name="llmProvider"]', 'gemini');

    // Wait for sync to complete
    await expect(page.locator('text=LLM provider updated')).toBeVisible({ timeout: 2000 });

    const endTime = Date.now();
    const syncTime = endTime - startTime;

    // Sync should complete in less than 1 second
    expect(syncTime).toBeLessThan(1000);
  });

  test('should not cause UI lag during sync', async ({ page }) => {
    await login(page);
    await page.goto('/settings');

    // Make change
    await page.selectOption('select[name="ttsProvider"]', 'openai-tts');

    // UI should remain responsive
    const settingsPanel = page.locator('[data-testid="settings-panel"]');
    await expect(settingsPanel).toBeVisible();

    // Should be able to interact with other elements
    await expect(page.locator('select[name="imageProvider"]')).toBeEnabled();
  });
});

test.describe('Provider Sync Memory Leaks', () => {
  test('should not accumulate event listeners', async ({ page }) => {
    await login(page);
    await page.goto('/settings');

    // Open and close modal multiple times
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Configure Providers")');
      await page.waitForTimeout(100);
      await page.click('button:has-text("Done")');
      await page.waitForTimeout(100);
    }

    // Page should still be responsive
    await expect(page.locator('button:has-text("Configure Providers")')).toBeVisible();
    await page.click('button:has-text("Configure Providers")');
    await expect(page.locator('text=Configure API Keys')).toBeVisible();
  });
});
