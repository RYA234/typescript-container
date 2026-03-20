# 外部設計書 - マルチエージェント

## 概要

OrchestratorAgent（タスク分解）/ ResearchAgent（情報収集）/ SummaryAgent（まとめ）の 3 エージェントが協調してタスクを実行するマルチエージェント構成。

## 0. 画面モック

```
│ [← Back to Home]  [GitHub Source #81]  [設計書]      │
├──────────────────────────────────────────────────────┤
┌──────────────────────────────────────────────────────┐
│ マルチエージェントデモ                                 │
├──────────────────────────────────────────────────────┤
│ タスクを入力してください:                              │
│ ┌────────────────────────────────────────────────┐   │
│ │ TypeScriptとPythonの比較レポートを作成してください│   │
│ └────────────────────────────────────────────────┘   │
│                              [実行する]               │
│                                                      │
│ エージェント実行ログ:                                 │
│ ┌────────────────────────────────────────────────┐   │
│ │ [Orchestrator] タスク分解                      │   │
│ │   → ["TypeScript調査","Python調査","比較まとめ"]│   │
│ │ [ResearchAgent] TypeScript調査 ......完了       │   │
│ │ [ResearchAgent] Python調査 .........完了        │   │
│ │ [SummaryAgent]  比較まとめ ..........完了        │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ 最終レポート:                                         │
│ ┌────────────────────────────────────────────────┐   │
│ │ 【TypeScript】静的型付き、コンパイル言語...     │   │
│ │ 【Python】動的型付き、データサイエンスに強い... │   │
│ │ 【比較】用途により選択基準が異なる...           │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

## エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| POST | /node/agent/multi-agent/chat | マルチエージェントへのタスク送信 |
| GET | /node/agent/multi-agent/health | ヘルスチェック |

### リクエスト / レスポンス

#### POST /node/agent/multi-agent/chat

**Request Body**
```json
{
  "message": "TypeScript と Python の比較レポートを作成してください"
}
```

**Response Body**
```json
{
  "reply": "TypeScript と Python の比較レポートを作成しました。\n\n【TypeScript】...\n【Python】...",
  "agentLog": [
    { "agent": "Orchestrator", "action": "タスク分解", "result": ["TypeScript 調査", "Python 調査", "比較まとめ"] },
    { "agent": "ResearchAgent", "action": "TypeScript 調査", "result": "..." },
    { "agent": "ResearchAgent", "action": "Python 調査", "result": "..." },
    { "agent": "SummaryAgent",  "action": "比較まとめ", "result": "最終レポートテキスト" }
  ]
}
```

## クラス図

```mermaid
classDiagram
    class MultiAgentController {
        -service: MultiAgentService
        +chat(req, res): Promise~void~
    }
    class MultiAgentService {
        -orchestrator: OrchestratorAgent
        -researchAgent: ResearchAgent
        -summaryAgent: SummaryAgent
        +run(message: string): Promise~MultiAgentResponse~
    }
    class OrchestratorAgent {
        -geminiClient: GeminiClient
        +decomposeTask(message: string): Promise~string[]~
    }
    class ResearchAgent {
        -geminiClient: GeminiClient
        -searchDb: Map~string, string~
        +research(topic: string): Promise~string~
    }
    class SummaryAgent {
        -geminiClient: GeminiClient
        +summarize(results: ResearchResult[]): Promise~string~
    }
    class AgentLogEntry {
        +agent: string
        +action: string
        +result: string
    }
    MultiAgentController --> MultiAgentService
    MultiAgentService --> OrchestratorAgent
    MultiAgentService --> ResearchAgent
    MultiAgentService --> SummaryAgent
    MultiAgentService --> AgentLogEntry
```

## シーケンス図

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant MultiAgentService
    participant Orchestrator
    participant ResearchAgent
    participant SummaryAgent
    participant Gemini

    Client->>Controller: POST /chat { message }
    Controller->>MultiAgentService: run(message)
    MultiAgentService->>Orchestrator: decomposeTask(message)
    Orchestrator->>Gemini: タスク分解プロンプト
    Gemini-->>Orchestrator: ["TypeScript 調査", "Python 調査", "比較まとめ"]
    loop 各サブタスク
        MultiAgentService->>ResearchAgent: research(topic)
        ResearchAgent->>Gemini: 情報収集プロンプト
        Gemini-->>ResearchAgent: 調査結果
    end
    MultiAgentService->>SummaryAgent: summarize(results)
    SummaryAgent->>Gemini: まとめプロンプト
    Gemini-->>SummaryAgent: 最終レポート
    MultiAgentService-->>Controller: MultiAgentResponse
    Controller-->>Client: 200 OK
```
