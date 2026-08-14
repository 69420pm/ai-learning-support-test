import { expect, test } from '@playwright/test';
import { ChatPage } from '../pages/chat';

test.describe('Chat Model Selection & Header E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.context().addCookies([
      {
        name: 'sb-mock-auth',
        value: JSON.stringify({
          email: 'test@example.com',
          // biome-ignore lint/style/useNamingConvention: Supabase metadata key
          user_metadata: { full_name: 'Test User' },
        }),
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('verifies active model badge, popover dropdown selection, header button non-redundancy, and streaming payload', async ({
    page,
  }) => {
    let capturedRequestBody: Record<string, string> | null = null;

    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        try {
          capturedRequestBody = route.request().postDataJSON();
        } catch {
          /* ignore */
        }
      }

      const sseBody = [
        'event: message',
        'data: {"type":"text-start","id":"part-1"}',
        '',
        'event: message',
        'data: {"type":"text-delta","id":"part-1","delta":"Hello! Streaming from selected model."}',
        '',
        'event: message',
        'data: {"type":"text-end","id":"part-1"}',
        '',
        'event: message',
        'data: {"type":"finish","finishReason":"stop"}',
        '',
      ].join('\n');

      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'x-vercel-ai-ui-stream': 'v1',
        },
        body: sseBody,
      });
    });

    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // 1. Verify ChatHeader renders active model trigger badge (default Gemini 3.7 Flash)
    const modelTrigger = chatPage.getModelSelectorTrigger();
    await expect(modelTrigger).toBeVisible();
    await expect(modelTrigger).toContainText('Gemini 3.7 Flash');

    // 2. Verify ChatHeader does NOT render a top-right "New Chat" button inside the header banner
    const headerBanner = chatPage.getChatHeader();
    await expect(headerBanner.getByRole('button', { name: 'New Chat' })).not.toBeVisible();

    // 3. Click model selector trigger to open popover
    await modelTrigger.click();

    // 4. Verify popover opens showing list of SUPPORTED_MODELS
    await expect(page.getByTestId('model-selector-item-gemini-3.7-flash')).toBeVisible();
    await expect(page.getByTestId('model-selector-item-gemini-3.5-flash-lite')).toBeVisible();

    // 5. Select "Gemini 3.5 Flash-Lite" option
    await page.getByTestId('model-selector-item-gemini-3.5-flash-lite').click();

    // 6. Verify popover closes and trigger badge updates text
    await expect(modelTrigger).toContainText('Gemini 3.5 Flash-Lite');
    await expect(page.getByTestId('model-selector-item-gemini-3.5-flash-lite')).not.toBeVisible();

    // 7. Send message and verify payload model parameter
    await chatPage.sendUserMessage('Hello, test model selection');
    await expect(page.getByText('Hello! Streaming from selected model.')).toBeVisible({
      timeout: 10000,
    });

    const payload = capturedRequestBody as Record<string, string> | null;
    expect(payload).not.toBeNull();
    expect(payload?.model || payload?.selectedChatModel).toBe('gemini-3.5-flash-lite');

    // 8. Click sidebar top "New Chat" button to verify clean chat re-initialization
    const sidebarNewChat = chatPage.getNewChatButton().first();
    await expect(sidebarNewChat).toBeVisible();
    await sidebarNewChat.click();
    await expect(page).toHaveURL(/\/chat$/);
    await expect(chatPage.getChatTitle()).toHaveText('New Chat');
  });
});
