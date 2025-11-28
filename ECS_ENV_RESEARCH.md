# ECS環境変数共有調査結果（Gemini API_KEY / Supabase）

## 調査概要

ECSタスクでGemini API_KEYやSupabase接続情報を安全に管理する方法を調査。

## 推奨アーキテクチャ

### 方式1: AWS Secrets Manager（推奨）

**利点:**
- 自動ローテーション対応
- 詳細なアクセス制御
- 監査ログ完備
- 暗号化済み保存

**実装手順:**

#### 1. Secrets Manager にシークレット作成

```bash
# Gemini API Key
aws secretsmanager create-secret \
  --name /ecs/typescript-container/gemini-api-key \
  --secret-string "YOUR_ACTUAL_GEMINI_API_KEY" \
  --region ap-northeast-1

# Supabase設定（JSON形式）
aws secretsmanager create-secret \
  --name /ecs/typescript-container/supabase \
  --secret-string '{
    "url": "https://your-project.supabase.co",
    "anon_key": "your-anon-key",
    "service_role_key": "your-service-role-key"
  }' \
  --region ap-northeast-1
```

#### 2. IAMロール権限追加

`ecsTaskExecutionRole` に以下のポリシーを追加:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:ap-northeast-1:AWS_ACCOUNT_ID:secret:/ecs/typescript-container/*"
      ]
    }
  ]
}
```

#### 3. Task Definition 更新

`.aws/task-definition.json` の `containerDefinitions` に追加:

```json
{
  "containerDefinitions": [
    {
      "name": "web",
      "secrets": [
        {
          "name": "GEMINI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:AWS_ACCOUNT_ID:secret:/ecs/typescript-container/gemini-api-key"
        },
        {
          "name": "SUPABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:AWS_ACCOUNT_ID:secret:/ecs/typescript-container/supabase:url::"
        },
        {
          "name": "SUPABASE_ANON_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:AWS_ACCOUNT_ID:secret:/ecs/typescript-container/supabase:anon_key::"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ]
    }
  ]
}
```

**ポイント:**
- `secrets`: 機密情報（API Key等）
- `environment`: 非機密情報（ポート番号等）

#### 4. アプリケーションコード

```typescript
// src/config.ts
export const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },
  port: parseInt(process.env.PORT || '3000', 10),
};
```

### 方式2: Parameter Store（コスト重視）

**利点:**
- 無料（10,000リクエスト/月まで）
- Systems Managerとの統合
- シンプル

**欠点:**
- 自動ローテーション非対応
- Secrets Managerより機能が少ない

**実装手順:**

```bash
# パラメータ作成（SecureString型）
aws ssm put-parameter \
  --name /ecs/typescript-container/gemini-api-key \
  --value "YOUR_ACTUAL_GEMINI_API_KEY" \
  --type SecureString \
  --region ap-northeast-1

aws ssm put-parameter \
  --name /ecs/typescript-container/supabase-url \
  --value "https://your-project.supabase.co" \
  --type String \
  --region ap-northeast-1
```

Task Definitionでは `valueFrom` に `arn:aws:ssm:...` を指定。

## CI/CD統合（GitHub Actions → ECS）

### GitHub Secrets設定

**不要**: Secrets ManagerやParameter Storeを使用する場合、GitHub Secretsには保存不要。
AWSアカウントIDやリージョンのみ管理。

### ワークフロー更新案

`.github/workflows/deploy-to-ecs.yml`:

```yaml
- name: Update task definition with secrets
  run: |
    # AWS_ACCOUNT_ID を置換（既存処理）
    sed -i 's/AWS_ACCOUNT_ID/${{ env.AWS_ACCOUNT_ID }}/g' ${{ env.ECS_TASK_DEFINITION }}

    # Task定義検証
    cat ${{ env.ECS_TASK_DEFINITION }}
```

シークレット自体はワークフローに含めず、ECSタスク実行時にSecrets Managerから取得。

## セキュリティ考慮事項

### 1. 最小権限の原則

- タスク実行ロール: シークレット読み取りのみ
- タスクロール: アプリケーションが必要な権限のみ

### 2. 監査ログ

CloudTrailで以下を記録:
- Secrets Manager アクセスログ
- IAMロール使用ログ

### 3. ローテーション

Gemini API Keyの定期ローテーション:
```bash
# 新しいキー作成
aws secretsmanager rotate-secret \
  --secret-id /ecs/typescript-container/gemini-api-key
```

### 4. ネットワークセキュリティ

- VPC内でタスク実行
- Secrets Manager用VPCエンドポイント設定（推奨）
- インターネット経由のアクセス回避

## 実装見積もり

### タスク分解

1. **AWS Secrets Manager設定** (30分)
   - シークレット作成
   - IAMポリシー追加

2. **Task Definition更新** (30分)
   - secrets フィールド追加
   - AWS_ACCOUNT_ID置換対応

3. **アプリケーションコード** (1時間)
   - config.ts作成
   - 環境変数読み込み処理
   - バリデーション追加

4. **テスト** (1時間)
   - ローカル環境変数テスト
   - ECSデプロイテスト
   - シークレット取得確認

5. **ドキュメント** (30分)
   - README更新
   - 運用手順書作成

**合計: 約3.5時間**

## サンプル実装コード

### src/config.ts

```typescript
export interface Config {
  gemini: {
    apiKey: string;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  port: number;
}

function validateConfig(): Config {
  const config: Config = {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
    },
    supabase: {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
    },
    port: parseInt(process.env.PORT || '3000', 10),
  };

  // 必須環境変数チェック
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }
  if (!config.supabase.url) {
    throw new Error('SUPABASE_URL is required');
  }
  if (!config.supabase.anonKey) {
    throw new Error('SUPABASE_ANON_KEY is required');
  }

  return config;
}

export const config = validateConfig();
```

### src/services/gemini.ts

```typescript
import { config } from '../config';

export class GeminiService {
  private apiKey: string;

  constructor() {
    this.apiKey = config.gemini.apiKey;
  }

  async generateContent(prompt: string): Promise<string> {
    // Gemini API呼び出し実装
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    return response.json();
  }
}
```

### src/services/supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);
```

## 推奨事項

1. **Secrets Manager使用** - セキュリティと管理性のバランスが最良
2. **VPCエンドポイント設定** - セキュリティ向上
3. **CloudWatch監視** - シークレット取得エラーをアラート
4. **定期ローテーション** - 3ヶ月ごとのキー更新

## 参考資料

- [AWS ECS Task Definition - Secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [Supabase環境変数](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
