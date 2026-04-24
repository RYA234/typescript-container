# 内部設計書 - 与信チェックエージェント

## 型定義

```typescript
// src/interfaces/agent-credit-check.ts

export interface CompanyRecord {
  creditScore: number;
  isValid: boolean;
}

export type CreditJudgment =
  | "優良承認"
  | "承認"
  | "条件付き承認"
  | "否認";

export interface CreditCheckRequest {
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
        name: "validate_company",
        description: "会社名の存在・形式バリデーションを行う",
        parameters: {
          type: "object",
          properties: {
            companyName: { type: "string", description: "会社名" },
          },
          required: ["companyName"],
        },
      },
      {
        name: "score_credit",
        description: "会社名から与信スコア（0〜100）を算出する",
        parameters: {
          type: "object",
          properties: {
            companyName: { type: "string", description: "会社名" },
          },
          required: ["companyName"],
        },
      },
      {
        name: "judge_credit",
        description: "与信スコアから最終判定を返す",
        parameters: {
          type: "object",
          properties: {
            score: { type: "number", description: "与信スコア（0〜100）" },
          },
          required: ["score"],
        },
      },
    ],
  },
];
```

## サービス実装詳細

### ダミーデータ

```typescript
const COMPANY_DB: Map<string, CompanyRecord> = new Map([
  ["株式会社サンプル",     { creditScore: 75, isValid: true }],
  ["テスト商事株式会社",   { creditScore: 85, isValid: true }],
  ["有限会社デモ",         { creditScore: 55, isValid: true }],
  ["株式会社不審",         { creditScore: 30, isValid: true }],
  ["架空企業",             { creditScore: 0,  isValid: false }],
]);
```

### validateCompany

- `isValid === false` → `"invalid: 存在しない会社です"`
- 会社名が空 or 1 文字以下 → `"invalid: 会社名が短すぎます"`
- それ以外 → `"valid"`

### scoreCredit

- DB に存在する → `creditScore.toString()`
- DB にない → ランダムではなく固定値 `"50"` を返す

### judgeCredit

スコア値から判定文字列を返す（判定基準表参照）。

## テスト方針

| テスト種別 | 対象 | 確認事項 |
|-----------|------|---------|
| Unit | validateCompany | valid・invalid・空文字 |
| Unit | scoreCredit | 既知・未知の会社名 |
| Unit | judgeCredit | 各スコア境界値 |
| Integration | runAgent | 3 ツール連続実行フロー |
