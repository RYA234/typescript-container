import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../shared/config';
import { GraphResponse, MessageType } from '../../interfaces/agent-langgraph';

const SEARCH_DB: Record<string, string> = {
  '東京': '東京都人口: 約1,400万人（2024年）',
  '大阪': '大阪府人口: 約880万人（2024年）',
  '名古屋': '名古屋市人口: 約230万人（2024年）',
  '福岡': '福岡市人口: 約165万人（2024年）',
  '札幌': '札幌市人口: 約197万人（2024年）',
  '日本': '日本の総人口: 約1億2,400万人（2024年）',
  'Python': 'Python: 汎用プログラミング言語。データサイエンス・AI分野で広く利用。',
  'TypeScript': 'TypeScript: MicrosoftによるJavaScriptのスーパーセット。型安全な開発を実現。',
};

const StateAnnotation = Annotation.Root({
  messages:     Annotation<string[]>({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  messageType:  Annotation<MessageType | undefined>({ reducer: (_, b) => b, default: () => undefined }),
  searchResult: Annotation<string | undefined>({ reducer: (_, b) => b, default: () => undefined }),
  calcResult:   Annotation<string | undefined>({ reducer: (_, b) => b, default: () => undefined }),
  finalAnswer:  Annotation<string | undefined>({ reducer: (_, b) => b, default: () => undefined }),
});

type State = typeof StateAnnotation.State;

export class LangGraphService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  private buildGraph() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workflow = new StateGraph(StateAnnotation) as any;

    workflow.addNode('classify',  this.classifyNode.bind(this));
    workflow.addNode('search',    this.searchNode.bind(this));
    workflow.addNode('calculate', this.calcNode.bind(this));
    workflow.addNode('answer',    this.answerNode.bind(this));

    workflow.addEdge(START, 'classify');
    workflow.addConditionalEdges('classify', this.routeByType.bind(this), {
      search:    'search',
      calculate: 'calculate',
      answer:    'answer',
    });
    workflow.addEdge('search',    'answer');
    workflow.addEdge('calculate', 'answer');
    workflow.addEdge('answer',    END);

    return workflow.compile();
  }

  private async classifyNode(state: State): Promise<Partial<State>> {
    const message = state.messages[state.messages.length - 1] ?? '';
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `次のメッセージを分類してください。「search」「calculate」「answer」のいずれか1単語だけ返してください。
- search: 都市・人物・技術などの情報検索が必要な質問
- calculate: 数式や四則演算の計算が必要な質問
- answer: 検索や計算なしで直接回答できる質問

メッセージ: ${message}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim().toLowerCase();
    const messageType: MessageType = raw.includes('search') ? 'search'
      : raw.includes('calculate') ? 'calculate'
      : 'answer';

    return { messageType };
  }

  routeByType(state: State): string {
    return state.messageType ?? 'answer';
  }

  searchNode(state: State): Partial<State> {
    const message = state.messages[state.messages.length - 1] ?? '';
    for (const [keyword, value] of Object.entries(SEARCH_DB)) {
      if (message.includes(keyword)) return { searchResult: value };
    }
    return { searchResult: '該当するドキュメントが見つかりませんでした' };
  }

  calcNode(state: State): Partial<State> {
    const message = state.messages[state.messages.length - 1] ?? '';
    const match = message.match(/([\d\s+\-*/().]+)/);
    if (!match) return { calcResult: '計算式が見つかりませんでした' };
    const expression = match[1].trim();
    if (!/^[\d\s+\-*/().]+$/.test(expression)) return { calcResult: '計算できない式です' };
    try {
      const result = Function(`"use strict"; return (${expression})`)() as number;
      if (!isFinite(result)) return { calcResult: 'ゼロ除算または計算不能な式です' };
      return { calcResult: `${expression} = ${result.toLocaleString()}` };
    } catch {
      return { calcResult: '式の計算に失敗しました' };
    }
  }

  private async answerNode(state: State): Promise<Partial<State>> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const message = state.messages[state.messages.length - 1] ?? '';
    const context = [
      state.searchResult ? `検索結果: ${state.searchResult}` : '',
      state.calcResult   ? `計算結果: ${state.calcResult}` : '',
    ].filter(Boolean).join('\n');

    const prompt = context
      ? `以下の情報を使って質問に回答してください。\n${context}\n\n質問: ${message}`
      : message;

    const result = await model.generateContent(prompt);
    return { finalAnswer: result.response.text() };
  }

  async runGraph(message: string): Promise<GraphResponse> {
    const graph = this.buildGraph();
    const result = await graph.invoke({ messages: [message] }) as State;

    const graphPath = ['classify'];
    if (result.messageType === 'search')    graphPath.push('search');
    if (result.messageType === 'calculate') graphPath.push('calculate');
    graphPath.push('answer');

    return {
      reply: result.finalAnswer ?? '',
      graphPath,
      state: {
        messageType:  result.messageType,
        searchResult: result.searchResult,
        calcResult:   result.calcResult,
      },
    };
  }
}
