# 内部設計書 - データ集計エージェント

## 型定義

```typescript
// src/interfaces/agent-data-aggregation.ts

export interface SalesRecord {
  period: string;
  totalAmount: number;
  prevMonthRatio: number;
  topProducts: { name: string; amount: number }[];
}

export interface InventoryRecord {
  productName: string;
  stock: number;
  turnoverRate: number;
}

export interface DataAggregationRequest {
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
        name: "get_sales",
        description: "指定期間（YYYY-MM）の売上データを取得する",
        parameters: {
          type: "object",
          properties: {
            period: { type: "string", description: "対象月（YYYY-MM）" },
          },
          required: ["period"],
        },
      },
      {
        name: "get_inventory",
        description: "現在の全商品在庫データを取得する",
        parameters: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "generate_report",
        description: "売上・在庫データからテキストレポートを生成する",
        parameters: {
          type: "object",
          properties: {
            salesData:     { type: "string", description: "売上データ（JSON 文字列）" },
            inventoryData: { type: "string", description: "在庫データ（JSON 文字列）" },
          },
          required: ["salesData", "inventoryData"],
        },
      },
    ],
  },
];
```

## サービス実装詳細

### ダミー売上データ

```typescript
const SALES_DATA: Map<string, SalesRecord> = new Map([
  ["2025-01", {
    period: "2025-01", totalAmount: 1250000, prevMonthRatio: 1.05,
    topProducts: [{ name: "ノートパソコン", amount: 600000 }, { name: "モニター", amount: 350000 }],
  }],
  ["2025-02", {
    period: "2025-02", totalAmount: 980000, prevMonthRatio: 0.78,
    topProducts: [{ name: "キーボード", amount: 250000 }, { name: "マウス", amount: 180000 }],
  }],
]);
```

### generateReport 出力形式

```
月次レポート: 2025年1月
========================
【売上サマリー】
  合計売上: 1,250,000 円
  前月比: +5%
  売れ筋商品: ノートパソコン（600,000円）

【在庫状況】
  ノートパソコン: 20台 （回転率 2.3）
  ...
========================
```

## テスト方針

| テスト種別 | 対象 | 確認事項 |
|-----------|------|---------|
| Unit | getSales | 存在する月・存在しない月 |
| Unit | getInventory | 全商品のリスト返却 |
| Unit | generateReport | レポート形式・数値の正確性 |
| Integration | runAgent | 3 ツール連鎖フロー |
