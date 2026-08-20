import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { ChatMessage } from './chat-message';

describe('ChatMessage', () => {
  it('renders user text message correctly', () => {
    const message: ChatMessageType = {
      id: 'msg-1',
      role: 'user',
      parts: [{ type: 'text', text: 'Explain neural networks' }],
    };

    const html = renderToString(<ChatMessage message={message} />);
    expect(html).toContain('Explain neural networks');
  });

  it('renders assistant message with tool-searchProjectMaterials and citations', () => {
    const message: ChatMessageType = {
      id: 'msg-2',
      role: 'assistant',
      parts: [
        {
          type: 'tool-searchProjectMaterials',
          toolCallId: 'tc-search-1',
          state: 'output-available',
          input: { query: 'backpropagation' },
          output: {
            query: 'backpropagation',
            results: [
              {
                materialId: 'mat-1',
                materialTitle: 'Deep Learning Basics',
                pageNumber: 15,
                chunkIndex: 3,
                similarity: 0.91,
                content: 'Backpropagation computes the gradient of the loss function.',
              },
            ],
            totalResults: 1,
          },
        } as unknown as ChatMessageType['parts'][number],
        {
          type: 'text',
          text: 'Backpropagation is an algorithm used to train neural networks **[Deep Learning Basics, Page 15]**.',
        },
      ],
    };

    const html = renderToString(<ChatMessage message={message} />);

    expect(html).toContain('Found 1 relevant source');
    expect(html).toContain('backpropagation');
    expect(html).toContain('Backpropagation is an algorithm');
    expect(html).toContain('<strong>[Deep Learning Basics, Page 15]</strong>');
  });

  it('renders searching tool state when tool is input-available or streaming', () => {
    const message: ChatMessageType = {
      id: 'msg-3',
      role: 'assistant',
      parts: [
        {
          type: 'tool-searchProjectMaterials',
          toolCallId: 'tc-search-2',
          state: 'input-streaming',
          input: { query: 'attention mechanism' },
        } as unknown as ChatMessageType['parts'][number],
      ],
    };

    const html = renderToString(<ChatMessage message={message} />);

    expect(html).toContain('Searching project materials');
    expect(html).toContain('attention mechanism');
  });
});
