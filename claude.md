# Claude AI Development Instructions

このドキュメントは、Claude AIがこのプロジェクトで開発を行う際に従うべき規約とガイドラインを定義します。

## プロジェクト概要

**プロジェクト名**: typescript-container
**目的**: TypeScript/Express.jsベースのWebアプリケーション（AWS ECS Fargateにデプロイ）
**アーキテクチャ**: Feature-based（業務ドメインごとのフォルダ分割）
**開発方針**: モノリシックな構成、シンプルなUI、業務ドメインごとの明確な分離

## 技術スタック

- **言語**: TypeScript 5.x
- **ランタイム**: Node.js
- **Webフレームワーク**: Express.js
- **テスト**: Jest (Unit), Playwright (E2E)
- **デプロイ**: Docker + AWS ECS Fargate
- **CI/CD**: GitHub Actions
- **シークレット管理**: AWS Secrets Manager

## アーキテクチャパターン

### Feature-based Architecture

プロジェクトは技術的なレイヤー（MVC）ではなく、**業務ドメイン（機能）** ごとにフォルダを分割します。

```
src/
├── interfaces/          # 型定義の集約
│   ├── config.ts       # 設定関連の型
│   ├── common.ts       # プロジェクト全体で使う共通型
│   └── [feature].ts    # 各機能の型定義
├── shared/             # プロジェクト全体で共有するコード
│   └── config.ts       # 環境変数の読み込みと検証
├── sample/             # サンプル機能（実装例）
│   ├── router.ts       # ルーティング定義
│   ├── controller.ts   # リクエスト処理
│   ├── service.ts      # ビジネスロジック
│   ├── tests/          # 機能のテスト
│   └── views/          # 静的HTMLファイル（必要に応じて）
├── rag/                # RAG機能（今後追加予定）
├── ux/                 # UX機能（今後追加予定）
├── public/             # 静的ファイル（CSS, JS, 画像）
└── app.ts              # Expressアプリケーションのエントリポイント
```

### Router/Controller/Service パターン

各機能フォルダ内では、以下のパターンを使用します：

1. **Router** (`router.ts`)
   - Express.jsのルーティング定義のみ
   - ビジネスロジックを含めない
   - Controllerのメソッドを呼び出す

2. **Controller** (`controller.ts`)
   - HTTPリクエスト/レスポンスの処理
   - リクエストのバリデーション
   - Serviceを呼び出してレスポンスを返す
   - ビジネスロジックは含めない

3. **Service** (`service.ts`)
   - ビジネスロジックの実装
   - データの加工、計算、外部API呼び出し
   - HTTPリクエスト/レスポンスに依存しない

**実装例**:

```typescript
// src/sample/service.ts
export class SampleService {
  getHealthStatus(): HealthCheckResponse {
    // ビジネスロジック
    return { status: 'healthy', ... };
  }
}

// src/sample/controller.ts
export class SampleController {
  private service: SampleService;

  getHealth = (req: Request, res: Response): void => {
    const result = this.service.getHealthStatus();
    res.json(result);
  };
}

// src/sample/router.ts
const router = Router();
const controller = new SampleController();
router.get('/health', controller.getHealth);
export default router;
```

## TypeScript コーディング規約

### 型定義

1. **すべての関数、変数に型を明示**
   ```typescript
   // Good
   function getUser(id: string): Promise<User> { ... }
   const port: number = 3000;

   // Bad
   function getUser(id) { ... }
   const port = 3000;
   ```

2. **インターフェースは `src/interfaces/` に配置**
   ```typescript
   // src/interfaces/user.ts
   export interface User {
     id: string;
     name: string;
     email: string;
   }
   ```

3. **共通型は `src/interfaces/common.ts` に配置**
   ```typescript
   export interface ApiResponse<T> {
     success: boolean;
     data?: T;
     error?: string;
   }
   ```

### 命名規則

- **インターフェース**: PascalCase（例: `HealthCheckResponse`, `ConfiguredServices`）
- **クラス**: PascalCase（例: `SampleService`, `SampleController`）
- **関数・メソッド**: camelCase（例: `getHealthStatus`, `validateConfig`）
- **変数**: camelCase（例: `apiKey`, `isDummy`）
- **定数**: UPPER_SNAKE_CASE（例: `BASE_PATH`, `DEFAULT_PORT`）
- **ファイル名**: kebab-case（例: `sample-service.ts`）または camelCase（例: `sampleService.ts`）
  - ただし、既存のファイルに合わせる（このプロジェクトでは camelCase）

### Import/Export

1. **Barrel Exports** を使用
   ```typescript
   // src/sample/index.ts
   export { default as sampleRouter } from './router';
   export { SampleController } from './controller';
   export { SampleService } from './service';

   // 使用側
   import { sampleRouter } from './sample';
   ```

2. **相対パスは最小限に**
   ```typescript
   // Good
   import { config } from '../shared';
   import { HealthCheckResponse } from '../interfaces';

   // Bad
   import { config } from '../../../shared/config';
   ```

## 環境変数管理

### 必須の環境変数

```bash
GEMINI_API_KEY=xxx        # Gemini APIキー
LANGCHAIN_API_KEY=xxx     # LangChain APIキー
SUPABASE_URL=https://...  # Supabase URL
SUPABASE_ANON_KEY=xxx     # Supabase匿名キー
PORT=3000                 # ポート番号（デフォルト: 3000）
```

### 設定管理

- **すべての環境変数は `src/shared/config.ts` で管理**
- 起動時に自動バリデーション
- 本番環境でダミー値を検出（"dummy", "DEMO", "EXAMPLE", "demo-" を含む値）

```typescript
// src/shared/config.ts
export const config: Config = {
  gemini: { apiKey: getEnvVar('GEMINI_API_KEY') },
  langchain: { apiKey: getEnvVar('LANGCHAIN_API_KEY') },
  supabase: {
    url: getEnvVar('SUPABASE_URL'),
    anonKey: getEnvVar('SUPABASE_ANON_KEY'),
  },
  port: parseInt(getOptionalEnvVar('PORT', '3000'), 10),
};
```

## テスト規約

### Unit Tests (Jest)

1. **配置**: `src/[feature]/tests/` に配置
2. **ファイル名**: `*.test.ts`
3. **環境変数**: テストファイルの先頭で設定
4. **カバレッジ**: すべてのサービス、コントローラーにテストを書く

```typescript
// src/sample/tests/sample.test.ts
process.env.GEMINI_API_KEY = 'test-key';
process.env.LANGCHAIN_API_KEY = 'test-key';
// ...

import { SampleService } from '../service';

describe('SampleService', () => {
  it('should return health status', () => {
    const service = new SampleService();
    const result = service.getHealthStatus();
    expect(result.status).toBe('healthy');
  });
});
```

### E2E Tests (Playwright)

1. **配置**: `tests/e2e/` に配置
2. **ファイル名**: `*.spec.ts`
3. **実行**: 実際のサーバーを起動してテスト

## セキュリティ要件

### AWS Secrets Manager

- 本番環境の機密情報は **AWS Secrets Manager** に保存
- ECSタスク定義で `secrets` フィールドを使用してARN参照
- ローカル開発では `.env` または環境変数で設定

### ヘルスチェックエンドポイント

- **機密情報を露出しない**
- 設定済みかどうかをboolean値で返す
- URLやAPIキーの実際の値は返さない

```typescript
// Good
res.json({
  status: 'healthy',
  configured: {
    gemini: true,
    langchain: true,
    supabase: true,
  }
});

// Bad（機密情報を露出）
res.json({
  gemini: { apiKey: 'AIza...' },
  supabase: { url: 'https://...' },
});
```

### ダミー値検出

本番環境で以下のパターンを含む値を検出し、`configured: false` を返す：

- "dummy"（大文字小文字問わず）
- "DEMO"
- "EXAMPLE"
- "demo-"（プレフィックス）

## AWS ECS デプロイメント

### ベースパス `/node`

ALBのルーティングルールに対応するため、すべてのエンドポイントは `/node` 配下に配置：

```typescript
// src/app.ts
const basePath = '/node';
app.use(basePath, sampleRouter);  // /node/health など
```

### ヘルスチェック

- **ALBヘルスチェック**: `/` エンドポイント（200 OK）
- **アプリケーションヘルスチェック**: `/node/health` エンドポイント

### タスク定義

`.aws/task-definition.json` でシークレット参照：

```json
{
  "secrets": [
    {
      "name": "GEMINI_API_KEY",
      "valueFrom": "arn:aws:secretsmanager:..."
    }
  ]
}
```

## 新機能の追加手順

### 1. Issueを作成

```bash
gh issue create --title "Add [feature] functionality"
```

### 2. ブランチを作成

```bash
git checkout -b feature/[issue-number]-[feature-name]
```

### 3. 型定義を作成

```typescript
// src/interfaces/[feature].ts
export interface [Feature]Response {
  // ...
}
```

### 4. 機能フォルダを作成

```
src/[feature]/
├── router.ts
├── controller.ts
├── service.ts
├── tests/
│   └── [feature].test.ts
└── views/         # 必要に応じて
    └── index.html
```

### 5. 実装

1. **Service**: ビジネスロジックを実装
2. **Controller**: リクエストハンドラを実装
3. **Router**: ルーティングを定義
4. **Tests**: テストを作成

### 6. app.ts に統合

```typescript
// src/app.ts
import { [feature]Router } from './[feature]';
app.use(basePath, [feature]Router);
```

### 7. テストとビルド

```bash
npm run build
npm test
```

### 8. コミットとPR

```bash
git add .
git commit -m "Add [feature] functionality

- Implement [feature] service
- Add [feature] endpoints
- Create tests for [feature]

Closes #[issue-number]"

git push -u typescript-container feature/[issue-number]-[feature-name]
gh pr create
```

## 禁止事項

### やってはいけないこと

1. **技術的なフォルダ分割**（models/, views/, controllers/）
   - 代わりに業務ドメインで分割（sample/, rag/, ux/）

2. **グローバル変数の濫用**
   - 設定は `src/shared/config.ts` で管理
   - 状態管理が必要な場合はクラスインスタンスを使用

3. **同期的なI/O操作**
   - ファイル読み込み、API呼び出しは非同期で実行

4. **ハードコード**
   - 環境依存の値は環境変数から取得
   - マジックナンバーは定数化

5. **重いフロントエンドフレームワーク**
   - Next.js、React、Vueは使用しない
   - シンプルなHTML/CSS/JavaScriptを使用

6. **直接的なファイル操作**
   - ビジネスロジックでファイルシステムに直接アクセスしない
   - 必要な場合は専用のサービスを作成

## Git運用

### ブランチ戦略

- **main**: 本番環境対応ブランチ
- **feature/[issue-number]-[name]**: 機能開発ブランチ

### コミットメッセージ

```
[動詞] [対象] - [詳細]

- 変更内容1
- 変更内容2

Closes #[issue-number]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

例:
```
Add health check endpoint for sample feature

- Implement SampleService with health check logic
- Add dummy value detection for production
- Create tests for health endpoint

Closes #26

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### PR作成

PRには必ず以下を含める：

1. **Summary**: 変更内容の概要
2. **Changes**: 変更したファイル・機能のリスト
3. **Test plan**: テストの実施状況（チェックリスト）
4. **Closes #[issue-number]**: 関連Issueへのリンク

## その他の重要事項

### モノリシック構成

- 当面はモノリシックな構成を維持
- マイクロサービス化は考えない
- すべてを1つのリポジトリ、1つのデプロイ単位で管理

### シンプルなUI

- フロントエンドは **シンプルなHTML/CSS/JavaScript**
- 静的ファイルは `src/public/` または `src/[feature]/views/` に配置
- Express.jsの `express.static()` で配信

### 業務ドメインの分離

- **RAG**: RAG（Retrieval-Augmented Generation）機能
- **UX**: ユーザー体験関連機能
- **sample**: サンプル・ヘルスチェック機能

各ドメインは独立したフォルダとして管理し、明確な責任範囲を持つ。

## Claude AIへの期待

このプロジェクトで開発を行う際は、以下を常に意識してください：

1. **型安全性**: TypeScriptの型システムを最大限活用
2. **アーキテクチャの遵守**: Feature-based、Router/Controller/Serviceパターン
3. **テストの作成**: すべての新機能にテストを追加
4. **セキュリティ**: 機密情報の露出を防ぐ
5. **シンプルさ**: 過度な抽象化や複雑な設計を避ける
6. **一貫性**: 既存のコードスタイルとパターンに従う

質問や不明点がある場合は、既存のコード（特に `src/sample/`）を参考にしてください。
