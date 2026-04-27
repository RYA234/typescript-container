import { GoogleGenerativeAI } from '@google/generative-ai';
import { Client } from 'langsmith';
import { traceable } from 'langsmith/traceable';
import { config } from '../../shared/config';
import { SupabaseService } from '../../supabase/service';
import {
  BatchEvalResponse,
  BatchEvalResult,
  EvalQueryResponse,
  EvalScores,
  TestCase,
} from '../../interfaces/rag-langsmith-ragas';

const LANGSMITH_PROJECT = process.env.LANGCHAIN_PROJECT ?? 'rag-evaluation';
const isDummyKey = (key: string) =>
  key.includes('dummy') || key.includes('DEMO') || key.includes('EXAMPLE') || key.includes('demo-');

export class EvalService {
  private supabaseService: SupabaseService;
  private genAI: GoogleGenerativeAI;
  private langsmithClient: Client | null;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.langsmithClient = isDummyKey(config.langchain.apiKey)
      ? null
      : new Client({ apiKey: config.langchain.apiKey });
  }

  async queryWithEval(question: string, evaluate: boolean): Promise<EvalQueryResponse> {
    const start = Date.now();
    const supabase = this.supabaseService.getClient();
    const embedding = await this.generateEmbedding(question);

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 5,
    });
    if (error) throw new Error(`Supabase RPC error: ${error.message}`);

    const rows: Array<{ content: string; similarity: number }> = data ?? [];
    const contexts = rows.map((r) => r.content);

    let answer: string;
    let langsmithTraceUrl: string | null = null;

    if (this.langsmithClient) {
      const tracedGenerate = traceable(
        async (q: string, ctx: string) => this.generateAnswer(q, ctx),
        {
          name: 'rag-query',
          client: this.langsmithClient,
          project_name: LANGSMITH_PROJECT,
          metadata: { question, contextCount: contexts.length },
        },
      );
      answer = contexts.length > 0
        ? await tracedGenerate(question, contexts.map((c, i) => `[チャンク${i + 1}]\n${c}`).join('\n\n'))
        : '関連するドキュメントが見つかりませんでした。';
      langsmithTraceUrl = `https://smith.langchain.com/`;
    } else {
      const ctx = contexts.map((c, i) => `[チャンク${i + 1}]\n${c}`).join('\n\n');
      answer = contexts.length > 0
        ? await this.generateAnswer(question, ctx)
        : '関連するドキュメントが見つかりませんでした。';
    }

    const evaluation = evaluate && contexts.length > 0
      ? await this.evaluateWithRagas(question, answer, contexts)
      : null;

    return { answer, contexts, evaluation, langsmithTraceUrl, executionTimeMs: Date.now() - start };
  }

  async batchEval(testSet: TestCase[]): Promise<BatchEvalResponse> {
    const start = Date.now();
    const results: BatchEvalResult[] = [];

    for (const tc of testSet) {
      const res = await this.queryWithEval(tc.question, true);
      results.push({
        question: tc.question,
        answer: res.answer,
        evaluation: res.evaluation ?? this.zeroScores(),
      });
    }

    const averageScores = this.averageEvalScores(results.map((r) => r.evaluation));
    return { results, averageScores, executionTimeMs: Date.now() - start };
  }

  private async evaluateWithRagas(
    question: string,
    answer: string,
    contexts: string[],
  ): Promise<EvalScores> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const prompt = `あなたはRAGシステムの評価者です。以下の質問・回答・参照コンテキストを評価してください。

質問: ${question}
回答: ${answer}
参照コンテキスト:
${contexts.map((c, i) => `[${i + 1}] ${c}`).join('\n')}

以下の指標を0.0〜1.0のスコアで評価し、JSONのみで返してください（説明不要）:
- faithfulness: 回答がコンテキストに基づいているか（幻覚がないか）
- answerRelevancy: 回答が質問に関連しているか
- contextPrecision: コンテキストが質問に対して適切か

{"faithfulness": 0.0, "answerRelevancy": 0.0, "contextPrecision": 0.0}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const raw = result.response.text();
        const jsonMatch = raw.match(/\{[\s\S]*?"faithfulness"[\s\S]*?\}/);
        if (!jsonMatch) throw new Error(`No JSON in response: ${raw.substring(0, 100)}`);
        const scores = JSON.parse(jsonMatch[0]) as { faithfulness: number; answerRelevancy: number; contextPrecision: number };
        const overallScore = (scores.faithfulness + scores.answerRelevancy + scores.contextPrecision) / 3;
        return { ...scores, overallScore: Math.round(overallScore * 1000) / 1000 };
      } catch (err) {
        if (attempt === 2) {
          console.error('[EvalService] evaluateWithRagas failed:', err);
          return this.zeroScores();
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    return this.zeroScores();
  }

  private zeroScores(): EvalScores {
    return { faithfulness: 0, answerRelevancy: 0, contextPrecision: 0, overallScore: 0 };
  }

  private averageEvalScores(scores: EvalScores[]): EvalScores {
    if (scores.length === 0) return this.zeroScores();
    const sum = scores.reduce(
      (acc, s) => ({
        faithfulness: acc.faithfulness + s.faithfulness,
        answerRelevancy: acc.answerRelevancy + s.answerRelevancy,
        contextPrecision: acc.contextPrecision + s.contextPrecision,
        overallScore: acc.overallScore + s.overallScore,
      }),
      this.zeroScores(),
    );
    const n = scores.length;
    return {
      faithfulness: Math.round((sum.faithfulness / n) * 1000) / 1000,
      answerRelevancy: Math.round((sum.answerRelevancy / n) * 1000) / 1000,
      contextPrecision: Math.round((sum.contextPrecision / n) * 1000) / 1000,
      overallScore: Math.round((sum.overallScore / n) * 1000) / 1000,
    };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
      content: { parts: [{ text }], role: 'user' },
      outputDimensionality: 768,
    } as Parameters<typeof model.embedContent>[0]);
    return result.embedding.values;
  }

  private async generateAnswer(question: string, context: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    const prompt = `以下のドキュメントを参考に、質問に日本語で回答してください。

ドキュメント:
${context}

質問: ${question}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        if (attempt === 4) throw err;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
    throw new Error('generateAnswer failed');
  }
}
