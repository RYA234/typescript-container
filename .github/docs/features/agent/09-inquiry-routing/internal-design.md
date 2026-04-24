# 内部設計書 - 問い合わせ振り分けエージェント

## 型定義

```typescript
// src/interfaces/agent-inquiry-routing.ts

export type InquiryCategory =
  | "配送問題"
  | "商品不良"
  | "請求・支払い"
  | "技術サポート"
  | "一般問い合わせ";

export interface Ticket {
  id: string;
  content: string;
  department: string;
  category: InquiryCategory;
  createdAt: string;
}

export interface InquiryRequest {
  message: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface AgentResponse {
  reply: string;
  toolCalls: ToolCall[];
}
```

## ツール定義（Function Calling）

```typescript
const tools = [
  {
    functionDeclarations: [
      {
        name: "analyze_inquiry",
        description: "問い合わせテキストからカテゴリを判定する",
        parameters: {
          type: "object",
          properties: {
            text: { type: "string", description: "問い合わせテキスト" },
          },
          required: ["text"],
        },
      },
      {
        name: "get_department",
        description: "問い合わせカテゴリから担当部門を返す",
        parameters: {
          type: "object",
          properties: {
            category: { type: "string", description: "問い合わせカテゴリ" },
          },
          required: ["category"],
        },
      },
      {
        name: "create_ticket",
        description: "問い合わせ内容と担当部門でサポートチケットを作成する",
        parameters: {
          type: "object",
          properties: {
            content:    { type: "string", description: "問い合わせ内容" },
            department: { type: "string", description: "担当部門" },
          },
          required: ["content", "department"],
        },
      },
    ],
  },
];
```

## サービス実装詳細

### analyzeInquiry

キーワードマッチングでカテゴリを判定:
```typescript
const KEYWORD_MAP: Record<string, InquiryCategory> = {
  "届かない|配送|発送|遅延": "配送問題",
  "壊れ|不良|欠陥|破損": "商品不良",
  "請求|支払|返金|領収": "請求・支払い",
  "エラー|動かない|バグ|不具合": "技術サポート",
};
// マッチしない場合は "一般問い合わせ"
```

### getDepartment

カテゴリ→部門の固定マッピング Map を参照。

### createTicket

- チケット ID: `TKT-${String(++ticketCounter).padStart(3, "0")}`
- `tickets` 配列に追加して ID を返す

## テスト方針

| テスト種別 | 対象 | 確認事項 |
|-----------|------|---------|
| Unit | analyzeInquiry | 各キーワード・複合パターン |
| Unit | getDepartment | 全カテゴリ |
| Unit | createTicket | ID 採番・連番 |
| Integration | runAgent | 3 ツール連鎖・チケット作成確認 |
