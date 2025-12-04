# TypeScript Container - ECS デプロイ

このリポジトリは、Node.js Express アプリケーションを Docker コンテナ化し、GitHub Actions を使用して Amazon ECS に自動デプロイするためのサンプルプロジェクトです。

## 📋 前提条件

- AWS アカウント
- GitHub アカウント
- AWS CLI のインストール（ローカル開発用、オプション）

## 🚀 セットアップ手順

### オプション A: 自動セットアップ（推奨）

セットアップスクリプトを使用すると、AWS リソースを自動的に作成できます：

```bash
# AWS CLI が設定されていることを確認
aws configure

# セットアップスクリプトを実行
./setup-aws.sh
```

このスクリプトは以下のリソースを自動的に作成します：
- ECR リポジトリ
- ECS クラスター
- CloudWatch ロググループ
- セキュリティグループ
- ECS タスク定義
- ECS サービス

### オプション B: 手動セットアップ

以下の手順で手動で AWS リソースを作成することもできます：

### 1. AWS リソースの作成

以下の AWS リソースを作成する必要があります：

#### a) ECR リポジトリの作成

```bash
aws ecr create-repository \
    --repository-name typescript-container \
    --region ap-northeast-1
```

#### b) ECS クラスターの作成

```bash
aws ecs create-cluster \
    --cluster-name typescript-container-cluster \
    --region ap-northeast-1
```

#### c) CloudWatch ロググループの作成

```bash
aws logs create-log-group \
    --log-group-name /ecs/typescript-container \
    --region ap-northeast-1
```

#### d) IAM ロールの作成

**ecsTaskExecutionRole** と **ecsTaskRole** が必要です。これらのロールが存在しない場合は、AWS コンソールまたは CLI で作成してください。

- **ecsTaskExecutionRole**: ECR からイメージをプル、CloudWatch Logs にログを書き込むための権限
- **ecsTaskRole**: タスクが実行時に必要とする AWS サービスへのアクセス権限

#### e) タスク定義の更新

`.aws/task-definition.json` ファイルを開き、以下の値を実際の値に置き換えてください：

- `YOUR_AWS_ACCOUNT_ID` → あなたの AWS アカウント ID（例: 123456789012）

#### f) ECS サービスの作成

まず、VPC とサブネット、セキュリティグループを確認してから、ECS サービスを作成します：

```bash
# VPC IDとサブネットIDを確認
aws ec2 describe-vpcs --region ap-northeast-1
aws ec2 describe-subnets --region ap-northeast-1

# セキュリティグループの作成（ポート3000を許可）
aws ec2 create-security-group \
    --group-name typescript-container-sg \
    --description "Security group for typescript container" \
    --vpc-id vpc-xxxxx \
    --region ap-northeast-1

# インバウンドルールの追加
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxx \
    --protocol tcp \
    --port 3000 \
    --cidr 0.0.0.0/0 \
    --region ap-northeast-1
```

最初のデプロイの前に、タスク定義を手動で登録する必要があります：

```bash
aws ecs register-task-definition \
    --cli-input-json file://.aws/task-definition.json \
    --region ap-northeast-1
```

その後、ECS サービスを作成します：

```bash
aws ecs create-service \
    --cluster typescript-container-cluster \
    --service-name typescript-container-service \
    --task-definition typescript-container-task \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
    --region ap-northeast-1
```

### 2. GitHub Secrets の設定

リポジトリの Settings > Secrets and variables > Actions から以下のシークレットを追加してください：

| シークレット名 | 説明 | 取得方法 |
|---------------|------|----------|
| `AWS_ACCESS_KEY_ID` | AWS アクセスキー ID | IAM ユーザーから取得 |
| `AWS_SECRET_ACCESS_KEY` | AWS シークレットアクセスキー | IAM ユーザーから取得 |

**IAM ユーザーに必要な最小限の権限:**

テスト環境では以下の管理ポリシーを使用できます：
- AmazonEC2ContainerRegistryPowerUser
- AmazonECS_FullAccess
- CloudWatchLogsFullAccess

**本番環境では最小権限の原則に従ってカスタム IAM ポリシーを作成することを強く推奨します：**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": "arn:aws:iam::*:role/ecsTaskExecutionRole"
    }
  ]
}
```

### 3. ワークフローファイルの設定確認

`.github/workflows/deploy-to-ecs.yml` ファイルの環境変数を確認し、必要に応じて変更してください：

```yaml
env:
  AWS_REGION: ap-northeast-1                    # リージョン
  ECR_REPOSITORY: typescript-container          # ECR リポジトリ名
  ECS_SERVICE: typescript-container-service     # ECS サービス名
  ECS_CLUSTER: typescript-container-cluster     # ECS クラスター名
```

## 🔄 デプロイ方法

### 自動デプロイ

`main` または `master` ブランチにプッシュすると、自動的に GitHub Actions が実行され、ECS にデプロイされます。

```bash
git add .
git commit -m "Update application"
git push origin main
```

### 手動デプロイ

GitHub リポジトリの Actions タブから「Deploy to Amazon ECS」ワークフローを選択し、「Run workflow」ボタンをクリックして手動で実行することもできます。

## 📊 デプロイの確認

1. GitHub Actions のログを確認
2. AWS ECS コンソールでタスクの状態を確認
3. CloudWatch Logs でアプリケーションログを確認
4. タスクのパブリック IP アドレスにアクセスして動作確認

タスクの IP アドレスを取得：

```bash
aws ecs list-tasks \
    --cluster typescript-container-cluster \
    --service-name typescript-container-service \
    --region ap-northeast-1

aws ecs describe-tasks \
    --cluster typescript-container-cluster \
    --tasks <task-arn> \
    --region ap-northeast-1
```

## 🛠️ ローカル開発

### 環境変数の設定

ローカル開発では `.env` ファイルから環境変数を読み込みます。

1. `.env.example` をコピーして `.env` ファイルを作成：
   ```bash
   cp .env.example .env
   ```

2. `.env` ファイルを編集して、実際のAPIキーなどを設定：
   ```bash
   GEMINI_API_KEY=your_actual_gemini_api_key
   LANGCHAIN_API_KEY=your_actual_langchain_api_key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_actual_supabase_anon_key
   PORT=3000
   ```

3. **注意**: `.env` ファイルは `.gitignore` に含まれており、Gitにコミットされません。機密情報を含むため、絶対にリポジトリに含めないでください。

#### Supabaseの設定

Supabase統合を使用する場合：

1. [Supabase](https://supabase.com/)でプロジェクトを作成
2. プロジェクトの設定から以下を取得：
   - **Project URL**: Settings > API > Project URL
   - **Anon Key**: Settings > API > Project API keys > anon public
3. `.env`ファイルに設定：
   ```bash
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. 接続テスト：
   ```bash
   curl http://localhost:3000/node/supabase/test
   ```

### Docker Compose で実行

```bash
docker-compose up --build
```

ブラウザで http://localhost:3000 にアクセス

### Node.js で直接実行

```bash
npm install
npm run dev    # 開発モード（.envファイルを自動読み込み）
# または
npm start      # 本番モード
```

## 📝 ファイル構成

```
.
├── .aws/
│   └── task-definition.json    # ECS タスク定義
├── .github/
│   └── workflows/
│       └── deploy-to-ecs.yml   # GitHub Actions ワークフロー
├── Dockerfile                   # Docker イメージ定義
├── docker-compose.yml          # ローカル開発用
├── app.js                      # Express アプリケーション
├── package.json                # Node.js 依存関係
└── README.md                   # このファイル
```

## 🔧 カスタマイズ

### リソースの調整

タスク定義（`.aws/task-definition.json`）で CPU とメモリを調整できます：

- `cpu`: "256", "512", "1024", "2048", "4096"
- `memory`: CPU に応じた値（詳細は AWS ドキュメント参照）

### 環境変数の追加

タスク定義の `environment` セクションに環境変数を追加できます：

```json
"environment": [
  {
    "name": "PORT",
    "value": "3000"
  },
  {
    "name": "NODE_ENV",
    "value": "production"
  }
]
```

## 🔐 セキュリティのベストプラクティス

- AWS アクセスキーは GitHub Secrets として安全に保管
- 本番環境では最小権限の原則に従った IAM ポリシーを使用（上記の例を参照）
- セキュリティグループで必要最小限のポートのみ開放
- **本番環境では**：Application Load Balancer (ALB) を使用し、ECS タスクをプライベートサブネットに配置することを強く推奨
- 定期的なセキュリティパッチの適用とイメージの更新
- シークレット情報は AWS Secrets Manager または Systems Manager Parameter Store を使用

## 📚 参考リンク

- [Amazon ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [Docker Documentation](https://docs.docker.com/)

## 📄 ライセンス

MIT
