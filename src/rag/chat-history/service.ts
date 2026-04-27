import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import {
  ChatDeleteResponse,
  ChatHistoryResponse,
  ChatSearchResponse,
  PostMessageResponse,
} from '../../interfaces/rag-chat-history';

export class ChatHistoryService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async postMessage(user: string, message: string, channel = 'general'): Promise<PostMessageResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();
    const embedding = await this.generateEmbedding(message);

    const { data, error } = await supabase
      .from('messages')
      .insert({ user_name: user, message, channel, embedding: `[${embedding.join(',')}]` })
      .select('id')
      .single();

    if (error) throw new Error(`Supabase insert error: ${error.message}`);

    return { success: true, messageId: data.id, executionTimeMs: Date.now() - start };
  }

  async getHistory(channel?: string, limit = 20): Promise<ChatHistoryResponse> {
    const supabase = this.supabaseService.getClient();
    let query = supabase
      .from('messages')
      .select('id, user_name, message, channel, posted_at')
      .order('posted_at', { ascending: false });

    if (channel) query = query.eq('channel', channel);

    const { data, error } = await query.limit(limit);
    if (error) throw new Error(`Supabase error: ${error.message}`);

    return {
      messages: (data ?? []).map((d) => ({
        id: d.id,
        user: d.user_name,
        message: d.message,
        channel: d.channel,
        postedAt: d.posted_at,
      })),
    };
  }

  async searchChatHistory(query: string, channel?: string, limit = 5): Promise<ChatSearchResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();
    const embedding = await this.generateEmbedding(query);

    const { data, error } = await supabase.rpc('match_messages', {
      query_embedding: embedding,
      filter_channel: channel ?? null,
      match_threshold: 0.3,
      match_count: limit,
    });

    if (error) throw new Error(`Supabase RPC error: ${error.message}`);

    return {
      results: (data ?? []).map((d: { id: string; user_name: string; message: string; channel: string; posted_at: string; similarity: number }) => ({
        id: d.id,
        user: d.user_name,
        message: d.message,
        channel: d.channel,
        postedAt: d.posted_at,
        similarity: d.similarity,
      })),
      executionTimeMs: Date.now() - start,
    };
  }

  async deleteAll(): Promise<ChatDeleteResponse> {
    const supabase = this.supabaseService.getClient();
    const { count, error } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw new Error(`Supabase delete error: ${error.message}`);

    const deletedCount = count ?? 0;
    return { success: true, deletedCount, message: `${deletedCount}件のメッセージを削除しました` };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
      content: { parts: [{ text }], role: 'user' },
      outputDimensionality: 768,
    } as Parameters<typeof model.embedContent>[0]);
    return result.embedding.values;
  }
}
