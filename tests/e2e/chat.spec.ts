import { expect, test } from '@playwright/test';
import { ChatPage } from '../pages/chat';

test.describe('Chat UI Components E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.context().addCookies([
      {
        name: 'sb-mock-auth',
        value: JSON.stringify({
          email: 'test@example.com',
          // biome-ignore lint/style/useNamingConvention: Supabase metadata keys
          user_metadata: { full_name: 'Test User' },
        }),
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('verifies prompt submission and streaming response with syntax highlighting', async ({
    page,
  }) => {
    await page.route('**/api/chat', async (route) => {
      const sseBody = [
        'event: message',
        'data: {"type":"text-start","id":"part-1"}',
        '',
        'event: message',
        'data: {"type":"text-delta","id":"part-1","delta":"Here is a Python quicksort implementation:\\n\\n```python\\ndef quicksort(arr):\\n    return arr\\n```"}',
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
    await expect(page).toHaveURL(/\/chat/);

    await expect(chatPage.getChatTitle()).toHaveText('New Chat');
    await expect(page.getByText('gemini-2.5-flash')).toBeVisible();

    await chatPage.sendUserMessage('Write a Python quicksort function');
    await expect(page.getByText(/Here is a Python quicksort/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('python', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy code' })).toBeVisible();

    const copyBtn = page.getByRole('button', { name: 'Copy code' });
    await copyBtn.click();
    await expect(page.getByText('Copied')).toBeVisible();
  });

  test('verifies stop generation button cancels stream', async ({ page }) => {
    let isSecondPrompt = false;

    await page.route('**/api/chat', async (route) => {
      if (isSecondPrompt) {
        // Infinite delay until cancelled by stop button
        return;
      }

      const sseBody = [
        'event: message',
        'data: {"type":"text-start","id":"part-1"}',
        '',
        'event: message',
        'data: {"type":"text-delta","id":"part-1","delta":"Streaming content..."}',
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

    isSecondPrompt = true;
    await chatPage.sendUserMessage('Long running task');
    const stopBtn = chatPage.getStopButton();
    await expect(stopBtn).toBeVisible({ timeout: 5000 });
    await stopBtn.click();
    await expect(chatPage.getSendButton()).toBeVisible({ timeout: 5000 });
  });

  test('verifies scroll to bottom floating button on scroll up', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      const sseBody = [
        'event: message',
        'data: {"type":"text-start","id":"part-1"}',
        '',
        'event: message',
        'data: {"type":"text-delta","id":"part-1","delta":"' +
          'Line of text\\n\\n'.repeat(100) +
          '"}',
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
    await chatPage.sendUserMessage('Generate long text');

    await expect(page.getByText('Line of text').first()).toBeVisible({ timeout: 10000 });

    const scrollContainer = page.locator('div.overflow-y-auto');
    await scrollContainer.evaluate((el) => {
      el.scrollTop = 0;
      el.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(500);

    const scrollToBottomBtn = chatPage.getScrollToBottomButton();
    await expect(scrollToBottomBtn).toBeVisible();

    await scrollToBottomBtn.click();

    await expect(async () => {
      const isAtBottom = await scrollContainer.evaluate((el) => {
        return el.scrollTop + el.clientHeight >= el.scrollHeight - 120;
      });
      expect(isAtBottom).toBe(true);
    }).toPass({ timeout: 3000 });
  });
});
