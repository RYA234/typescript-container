# 内部設計書 - マルチエージェント

## 型定義

```typescript
// src/interfaces/agent-multi.ts

export interface AgentLogEntry {
  agent: "Orchestrator" | "ResearchAgent" | "SummaryAgent";
  action: string;
  result: string | string[];
}

export interface ResearchResult {
  topic: string;
  content: string;
}

export interface MultiAgentRequest {
  message: string;
}

export interface MultiAgentResponse {
  reply: string;
  agentLog: AgentLogEntry[];
}
```

## OrchestratorAgent 実装

```typescript
export class OrchestratorAgent {
  async decomposeTask(message: string): Promise<string[]> {
    const prompt = `
以下のタスクを 2〜4 個のサブタスクに分解してください。
タスク: "${message}"
JSON 配列（文字列のリスト）で返してください。
`;
    const response = await this.geminiClient.generateContent(prompt);
    // JSON パース。失敗時はメッセージ全体を 1 タスクとして返す
    return JSON.parse(response.text);
  }
}
```

## ResearchAgent 実装

```typescript
export class ResearchAgent {
  private searchDb: Map<string, string> = new Map([
    ["TypeScript", "TypeScript は Microsoft 製の静的型付け言語。JavaScript のスーパーセット。"],
    ["Python", "Python は動的型付けのインタープリタ言語。科学計算・AI 分野で広く使われる。"],
    ["比較", "TypeScript: 型安全・大規模開発向き。Python: 手軽・AI/ML 向き。"],
  ]);

  async research(topic: string): Promise<string> {
    const localResult = [...this.searchDb.entries()]
      .find(([key]) => topic.includes(key))?.[1] ?? "情報なし";
    const prompt = `次の情報をもとに "${topic}" について 2〜3 文でまとめてください: ${localResult}`;
    return await this.geminiClient.generateTextContent(prompt);
  }
}
```

## SummaryAgent 実装

```typescript
export class SummaryAgent {
  async summarize(results: ResearchResult[]): Promise<string> {
    const context = results
      .map((r) => `【${r.topic}】\n${r.content}`)
      .join("\n\n");
    const prompt = `次の調査結果をもとに、わかりやすいレポートを作成してください:\n\n${context}`;
    return await this.geminiClient.generateTextContent(prompt);
  }
}
```

## MultiAgentService フロー

```typescript
async run(message: string): Promise<MultiAgentResponse> {
  const log: AgentLogEntry[] = [];
  const tasks = await this.orchestrator.decomposeTask(message);
  log.push({ agent: "Orchestrator", action: "タスク分解", result: tasks });

  const results: ResearchResult[] = [];
  for (const task of tasks.slice(0, -1)) {  // 最後のタスクは SummaryAgent が担う
    const content = await this.researchAgent.research(task);
    results.push({ topic: task, content });
    log.push({ agent: "ResearchAgent", action: task, result: content });
  }

  const summary = await this.summaryAgent.summarize(results);
  log.push({ agent: "SummaryAgent", action: "まとめ", result: summary });
  return { reply: summary, agentLog: log };
}
```

## テスト方針

| テスト種別 | 対象 | 確認事項 |
|-----------|------|---------|
| Unit | OrchestratorAgent.decomposeTask | タスク配列の返却 |
| Unit | ResearchAgent.research | DB ヒット・ミス |
| Unit | SummaryAgent.summarize | まとめ生成 |
| Integration | MultiAgentService.run | 全エージェント協調動作 |
