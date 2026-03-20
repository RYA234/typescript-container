# 外部設計書 - 単位変換エージェント

## 概要

convert_unit（値・from 単位・to 単位 → 変換結果）の 1 ツールで km/mile/kg/lb/℃/℉ などを変換する単位変換エージェント。

## 0. 画面モック

```
│ [← Back to Home]  [GitHub Source #71]  [設計書]      │
├──────────────────────────────────────────────────────┤
┌──────────────────────────────────────────────────────┐
│ 単位変換エージェントデモ                               │
├──────────────────────────────────────────────────────┤
│ 変換について質問してください:                          │
│ ┌────────────────────────────────────────────────┐   │
│ │ 100kmは何マイルですか？                         │   │
│ └────────────────────────────────────────────────┘   │
│                              [送信する]               │
│                                                      │
│ エージェント応答:                                     │
│ ┌────────────────────────────────────────────────┐   │
│ │ 100 km は約 62.14 マイルです。                  │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ツール呼び出しログ:                                   │
│ ┌────────────────────────────────────────────────┐   │
│ │ [1] convert_unit(100, "km", "mile") → "62.14"  │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ 変換例:                                               │
│ ┌──────────────┬──────────────┬──────────────────┐   │
│ │ 距離         │ 重量         │ 温度             │   │
│ │ km ↔ mile    │ kg ↔ lb      │ °C ↔ °F         │   │
│ │ m ↔ ft       │ g ↔ oz       │ °C ↔ K          │   │
│ └──────────────┴──────────────┴──────────────────┘   │
└──────────────────────────────────────────────────────┘
```

## エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| POST | /node/agent/unit-convert/chat | 単位変換エージェントへの問い合わせ |
| GET | /node/agent/unit-convert/health | ヘルスチェック |

### リクエスト / レスポンス

#### POST /node/agent/unit-convert/chat

**Request Body**
```json
{
  "message": "100km は何マイルですか？"
}
```

**Response Body**
```json
{
  "reply": "100 km は約 62.14 マイルです。",
  "toolCalls": [
    {
      "name": "convert_unit",
      "args": { "value": 100, "fromUnit": "km", "toUnit": "mile" },
      "result": "62.14"
    }
  ]
}
```

## クラス図

```mermaid
classDiagram
    class UnitConvertController {
        -service: UnitConvertService
        +chat(req, res): Promise~void~
    }
    class UnitConvertService {
        -geminiClient: GeminiClient
        +runAgent(message: string): Promise~AgentResponse~
        -callTool(name: string, args: object): string
        +convertUnit(value: number, from: string, to: string): string
    }
    class ConversionRule {
        +factor: number
        +offset: number
    }
    UnitConvertController --> UnitConvertService
    UnitConvertService --> ConversionRule
```

## シーケンス図

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant Service
    participant Gemini

    Client->>Controller: POST /chat { message }
    Controller->>Service: runAgent(message)
    Service->>Gemini: generateContent(message + toolDefs)
    Gemini-->>Service: functionCall: convert_unit(100, "km", "mile")
    Service->>Service: convertUnit(100, "km", "mile") → "62.14"
    Service->>Gemini: generateContent + tool result
    Gemini-->>Service: text: "100km は 62.14 マイルです"
    Service-->>Controller: AgentResponse
    Controller-->>Client: 200 OK
```

## 対応単位一覧

| カテゴリ | from | to |
|---------|------|----|
| 距離 | km ↔ mile ↔ m ↔ ft |  |
| 重量 | kg ↔ lb ↔ g |  |
| 温度 | celsius ↔ fahrenheit ↔ kelvin |  |
| 容量 | liter ↔ gallon ↔ ml |  |
