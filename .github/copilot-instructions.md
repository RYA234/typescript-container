# GitHub Copilot Custom Instructions

このプロジェクトは、TypeScriptベースのNode.js/Express.jsアプリケーションで、AWS ECS Fargateにデプロイされます。

## プロジェクト概要

- **言語**: TypeScript
- **フレームワーク**: Express.js
- **デプロイ先**: AWS ECS Fargate
- **テスト**: Jest (Unit tests), Playwright (E2E tests)
- **アーキテクチャ**: Feature-based（業務ドメインごとのフォルダ分割）

## フォルダ構成

```
src/
├── interfaces/        # 型定義（TypeScript interfaces）
│   ├── config.ts     # 設定関連の型
│   ├── common.ts     # 共通の型
│   └── [feature].ts  # 各機能の型定義
├── shared/           # 共通コード
│   └── config.ts     # 環境変数管理と検証
├── [feature]/        # 機能ごとのフォルダ（例: sample/, rag/, ux/）
│   ├── router.ts     # ルーティング定義
│   ├── controller.ts # リクエストハンドラ
│   ├── service.ts    # ビジネスロジック
│   ├── types/        # 機能固有の型（必要に応じて）
│   ├── tests/        # 機能のテスト
│   └── views/        # 静的HTMLファイル（必要に応じて）
├── public/           # 静的ファイル（CSS, JS, 画像など）
└── app.ts            # Express.jsアプリケーションのエントリポイント
```

## コーディング規約

### TypeScript

1. **型定義**: すべての関数、変数に明示的な型を付ける
2. **インターフェース**: 型定義は `src/interfaces/` に配置
3. **厳格モード**: `tsconfig.json` の strict オプションを有効化
4. **命名規則**:
   - インターフェース: PascalCase（例: `Config`, `HealthCheckResponse`）
   - 関数/変数: camelCase（例: `getHealthStatus`, `apiKey`）
   - クラス: PascalCase（例: `SampleService`, `SampleController`）
   - 定数: UPPER_SNAKE_CASE（例: `BASE_PATH`, `PORT`）

### Express.js

1. **アーキテクチャパターン**: Router → Controller → Service
   - **Router**: ルーティング定義のみ（ビジネスロジックを含めない）
   - **Controller**: リクエスト/レスポンスの処理、バリデーション
   - **Service**: ビジネスロジック、データ処理
2. **エンドポイント**: ベースパス `/node` を使用（ALBルーティング用）
3. **エラーハンドリング**: 適切なHTTPステータスコードを返す
4. **型安全性**: Request, Response型を明示的に指定

### 環境変数

1. **必須の環境変数**:
   - `GEMINI_API_KEY`: Gemini APIキー
   - `LANGCHAIN_API_KEY`: LangChain APIキー
   - `SUPABASE_URL`: Supabase URL
   - `SUPABASE_ANON_KEY`: Supabase匿名キー
   - `PORT`: ポート番号（デフォルト: 3000）

2. **設定管理**: `src/shared/config.ts` で一元管理
3. **バリデーション**: 起動時に環境変数の存在と形式をチェック
4. **ダミー値検出**: 本番環境で "dummy", "DEMO", "EXAMPLE", "demo-" を含む値を検出

### テスト

1. **Unit Tests (Jest)**:
   - テストファイルは `src/[feature]/tests/` に配置
   - ファイル名: `*.test.ts`
   - 環境変数は各テストファイルの先頭で設定
   - すべてのサービス、コントローラーにテストを書く

2. **E2E Tests (Playwright)**:
   - テストファイルは `tests/e2e/` に配置
   - ファイル名: `*.spec.ts`
   - 実際のサーバーを起動してテスト

### セキュリティ

1. **シークレット管理**: AWS Secrets Managerを使用
2. **本番環境**: 環境変数に機密情報を直接含めない
3. **ヘルスチェック**: 機密情報を露出しない（boolean値のみ返す）
4. **入力検証**: すべてのユーザー入力をバリデーション

## AWS ECS デプロイメント

1. **タスク定義**: `.aws/task-definition.json`
2. **シークレット参照**: `secrets` フィールドでSecrets Manager ARNを指定
3. **環境変数**: ECSタスク定義で設定
4. **ヘルスチェック**: `/` エンドポイントでALBヘルスチェック
5. **アプリケーションエンドポイント**: `/node` 配下

## 新機能の追加方法

1. **フォルダ作成**: `src/[feature-name]/` を作成
2. **型定義**: `src/interfaces/[feature-name].ts` を作成
3. **実装**:
   - `router.ts`: ルーティング定義
   - `controller.ts`: リクエストハンドラ
   - `service.ts`: ビジネスロジック
4. **テスト**: `src/[feature-name]/tests/` にテストを作成
5. **統合**: `src/app.ts` でルーターをマウント

## 例: 新機能 "sample" の実装

```typescript
// src/interfaces/sample.ts
export interface HealthCheckResponse {
  status: string;
  configured: ConfiguredServices;
  timestamp: string;
}

// src/sample/service.ts
export class SampleService {
  getHealthStatus(): HealthCheckResponse {
    // ビジネスロジック
  }
}

// src/sample/controller.ts
export class SampleController {
  private sampleService: SampleService;

  getHealth = (_req: Request, res: Response): void => {
    const healthStatus = this.sampleService.getHealthStatus();
    res.json(healthStatus);
  };
}

// src/sample/router.ts
const router = Router();
const sampleController = new SampleController();
router.get('/health', sampleController.getHealth);
export default router;

// src/app.ts
import { sampleRouter } from './sample';
app.use('/node', sampleRouter);
```

### 7. インデックスページを更新

新しい機能を追加したら、**必ず `src/sample/views/index.html` を更新**してください：

```html
<!-- src/sample/views/index.html -->
<li class="feature-item">
  <a href="/node/[feature-name]" class="feature-link">
    <div class="feature-name">
      [Feature Display Name]
      <span class="status active">稼働中</span>
    </div>
    <div class="feature-desc">
      機能の説明
    </div>
  </a>
</li>
```

開発予定の機能の場合は `status planned` を使用：

```html
<span class="status planned">開発予定</span>
```

## 禁止事項

1. **直接的なファイル操作**: ビジネスロジックでファイルシステムに直接アクセスしない
2. **グローバル変数**: 可能な限り避ける（設定は `config.ts` で管理）
3. **同期処理**: I/O操作は非同期で実行
4. **ハードコード**: 環境依存の値は環境変数から取得
5. **技術的なフォルダ分割**: models/, views/, controllers/ のような分割は避ける

## Git コミットメッセージ

- フォーマット: `[動詞] [対象] - [詳細]`
- 例:
  - `Add health check endpoint for sample feature`
  - `Fix dummy value detection in production`
  - `Refactor sample service to use new config`
- PRには必ず `Closes #[issue-number]` を含める

## その他

- **モノリシック**: 当面はモノリシックな構成を維持
- **シンプルなUI**: フロントエンドはシンプルなHTML/CSS/JSを使用（Next.jsなど重いフレームワークは避ける）
- **業務ドメイン**: RAG、UXなど業務ごとにフォルダを分ける
