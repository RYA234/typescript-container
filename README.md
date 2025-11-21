# TypeScript Container - ECS デプロイ

このリポジトリは、Node.js Express アプリケーションを Docker コンテナ化し、GitHub Actions を使用して Amazon ECS に自動デプロイするためのサンプルプロジェクトです。

## 📋 前提条件

- AWS アカウント
- GitHub アカウント
- AWS CLI のインストール（ローカル開発用、オプション）

## 🚀 セットアップ手順

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

**IAM ユーザーに必要な権限:**
- AmazonEC2ContainerRegistryPowerUser
- AmazonECS_FullAccess
- CloudWatchLogsFullAccess

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

### Docker Compose で実行

```bash
docker-compose up --build
```

ブラウザで http://localhost:3000 にアクセス

### Node.js で直接実行

```bash
npm install
npm start
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
- 本番環境では IAM ロールを使用した権限管理を推奨
- セキュリティグループで必要最小限のポートのみ開放
- VPC のプライベートサブネットでタスクを実行（ALB 経由でアクセス）

## 📚 参考リンク

- [Amazon ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [Docker Documentation](https://docs.docker.com/)

## 📄 ライセンス

MIT
