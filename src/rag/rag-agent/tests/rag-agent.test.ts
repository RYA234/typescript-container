import { RagAgentChatService } from '../service';

jest.mock('../../../supabase/service');
jest.mock('@google/generative-ai');
jest.mock('../../company-rules/service');

describe('RagAgentChatService', () => {
  let service: RagAgentChatService;

  beforeEach(() => {
    service = new RagAgentChatService();
  });

  it('単純な質問はツールなしで回答する', async () => {
    jest.spyOn(service['ragService'], 'searchSimilar');
    const mockStartChat = jest.fn().mockReturnValue({
      sendMessage: jest.fn().mockResolvedValue({
        response: {
          candidates: [{ content: { parts: [] } }],
          text: () => 'こんにちは！ご質問をどうぞ。',
          functionCalls: () => [],
        },
      }),
    });
    (service['genAI'].getGenerativeModel as jest.Mock).mockReturnValue({
      startChat: mockStartChat,
    });

    const result = await service.chat('こんにちは');

    expect(result.answer).toBe('こんにちは！ご質問をどうぞ。');
    expect(result.toolsUsed).toHaveLength(0);
    expect(result.searchResults).toHaveLength(0);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('search_documents ツールを呼び出してRAG検索する', async () => {
    const mockSearchResult = {
      results: [
        { content: '有給休暇は年10日付与', similarity: 0.91, metadata: { source: 'hr.txt', chunkIndex: 0, totalChunks: 1 } },
      ],
      executionTimeMs: 100,
      message: '1件見つかりました',
    };
    jest.spyOn(service['ragService'], 'searchSimilar').mockResolvedValue(mockSearchResult);

    const sendMessage = jest.fn()
      .mockResolvedValueOnce({
        response: {
          candidates: [{
            content: {
              parts: [{ functionCall: { name: 'search_documents', args: { query: '有給休暇' } } }],
            },
          }],
          text: () => '',
        },
      })
      .mockResolvedValueOnce({
        response: {
          candidates: [{ content: { parts: [] } }],
          text: () => '有給休暇は年10日付与されます。',
        },
      });

    (service['genAI'].getGenerativeModel as jest.Mock).mockReturnValue({
      startChat: jest.fn().mockReturnValue({ sendMessage }),
    });

    const result = await service.chat('有給休暇について教えて');

    expect(result.toolsUsed).toContain('search_documents');
    expect(result.searchResults).toHaveLength(1);
    expect(result.searchResults[0].content).toBe('有給休暇は年10日付与');
    expect(result.answer).toContain('有給休暇');
  });

  it('calculate ツールで計算できる', async () => {
    const sendMessage = jest.fn()
      .mockResolvedValueOnce({
        response: {
          candidates: [{
            content: {
              parts: [{ functionCall: { name: 'calculate', args: { expression: '5000000 - 2300000' } } }],
            },
          }],
          text: () => '',
        },
      })
      .mockResolvedValueOnce({
        response: {
          candidates: [{ content: { parts: [] } }],
          text: () => '残予算は2,700,000円です。',
        },
      });

    (service['genAI'].getGenerativeModel as jest.Mock).mockReturnValue({
      startChat: jest.fn().mockReturnValue({ sendMessage }),
    });

    const result = await service.chat('5000000 - 2300000 を計算して');

    expect(result.toolsUsed).toContain('calculate');
    expect(result.answer).toContain('2,700,000');
  });

  it('get_current_date ツールで現在日時を返す', async () => {
    const sendMessage = jest.fn()
      .mockResolvedValueOnce({
        response: {
          candidates: [{
            content: {
              parts: [{ functionCall: { name: 'get_current_date', args: {} } }],
            },
          }],
          text: () => '',
        },
      })
      .mockResolvedValueOnce({
        response: {
          candidates: [{ content: { parts: [] } }],
          text: () => '現在の日時は2026年4月25日です。',
        },
      });

    (service['genAI'].getGenerativeModel as jest.Mock).mockReturnValue({
      startChat: jest.fn().mockReturnValue({ sendMessage }),
    });

    const result = await service.chat('今日の日付を教えて');

    expect(result.toolsUsed).toContain('get_current_date');
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});
