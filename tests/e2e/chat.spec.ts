import { expect, test } from '@playwright/test';
import { ChatPage } from '../pages/chat';

test.describe('Chat Routing, App Proxy Guard & Sidebar Thread History E2E', () => {
  test('redirects unauthenticated user accessing /chat to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fchat/);
  });

  test.describe('Authenticated Chat Operations', () => {
    const mockUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

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
      await expect(chatPage.getModelSelectorTrigger()).toHaveText(/Gemini 3.5 Flash/);

      await chatPage.sendUserMessage('Write a Python quicksort function');
      await expect(page.getByText(/Here is a Python quicksort/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('python', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Copy code' })).toBeVisible();

      const copyBtn = page.getByRole('button', { name: 'Copy code' });
      await copyBtn.click();
      await expect(page.getByText('Copied')).toBeVisible();
    });

    test('verifies model popover selection updates active model and request payload', async ({
      page,
    }) => {
      let capturedModel = '';

      await page.route('**/api/chat', async (route) => {
        const postData = route.request().postDataJSON();
        capturedModel = postData?.selectedChatModel || postData?.model || '';

        const sseBody = [
          'event: message',
          'data: {"type":"text-start","id":"part-1"}',
          '',
          'event: message',
          'data: {"type":"text-delta","id":"part-1","delta":"Response from model"}',
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

      await expect(chatPage.getModelSelectorTrigger()).toHaveText(/Gemini 3.5 Flash/);

      await chatPage.getModelSelectorTrigger().click();
      await expect(chatPage.getModelOption('gpt-4o-mini')).toBeVisible();

      await chatPage.getModelOption('gpt-4o-mini').click();
      await expect(chatPage.getModelSelectorTrigger()).toHaveText(/GPT-4o Mini/);

      await chatPage.sendUserMessage('Test model switch');
      await expect(page.getByText('Response from model')).toBeVisible();
      expect(capturedModel).toBe('gpt-4o-mini');
    });

    test('verifies thread URL replacement, sidebar history, thread switching, and deletion', async ({
      page,
    }) => {
      const seededChatId = '11111111-1111-4111-a111-111111111111';
      let historyDeleted = false;

      await page.route('**/api/history', async (route) => {
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chats: historyDeleted
              ? []
              : [
                  {
                    id: seededChatId,
                    userId: mockUserId,
                    title: 'First Chat Thread',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
            hasMore: false,
          }),
        });
      });

      await page.route('**/api/chat*', async (route) => {
        if (route.request().method() === 'DELETE') {
          historyDeleted = true;
          await route.fulfill({
            status: 200,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: seededChatId }),
          });
          return;
        }

        const sseBody = [
          'event: message',
          'data: {"type":"data-chat-title","data":"Introductions & Hello"}',
          '',
          'event: message',
          'data: {"type":"text-start","id":"part-1"}',
          '',
          'event: message',
          'data: {"type":"text-delta","id":"part-1","delta":"Hello! I am your AI learning assistant."}',
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

      // 1. Send prompt on /chat
      await chatPage.sendUserMessage('Hello, introduce yourself');

      // 2. Assert URL changes to /chat/[uuid]
      await expect(page).toHaveURL(/\/chat\/[0-9a-f-]{36}/i, { timeout: 10000 });

      // 3. Assert assistant response streams and finishes
      await expect(page.getByText('Hello! I am your AI learning assistant.')).toBeVisible();

      // 4. Assert sidebar history shows seeded item
      await expect(page.getByText('First Chat Thread')).toBeVisible();

      // 5. Click New Chat
      await chatPage.getNewChatButton().first().click();
      await expect(page).toHaveURL(/\/chat$/);

      // 6. Click First Chat Thread in sidebar to switch back
      await page.getByText('First Chat Thread').click();
      await expect(page).toHaveURL(new RegExp(`/chat/${seededChatId}`));

      // 7. Delete thread from sidebar
      await chatPage.deleteChat(seededChatId);
      await expect(page.getByTestId(`chat-history-item-${seededChatId}`)).not.toBeVisible();
    });
  });
});
