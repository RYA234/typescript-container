# ECS タスク定義

このディレクトリには Amazon ECS のタスク定義ファイルが含まれています。

## task-definition.json

このファイルには ECS タスクの設定が定義されています。

### プレースホルダーについて

`YOUR_AWS_ACCOUNT_ID` というプレースホルダーは、以下のいずれかの方法で実際の AWS アカウント ID に置き換える必要があります：

1. **自動セットアップスクリプトを使用（推奨）**:
   ```bash
   ./setup-aws.sh
   ```
   このスクリプトが自動的にプレースホルダーを実際の AWS アカウント ID に置き換えます。

2. **手動で置き換え**:
   ```bash
   # AWS アカウント ID を取得
   aws sts get-caller-identity --query Account --output text
   
   # 取得した ID でプレースホルダーを置換
   # 例: YOUR_AWS_ACCOUNT_ID を 123456789012 に置換
   ```

### 設定値の説明

- **cpu**: タスクに割り当てる CPU ユニット（256 = 0.25 vCPU）
- **memory**: タスクに割り当てるメモリ（MB）
- **executionRoleArn**: ECR からのイメージ取得や CloudWatch へのログ送信に必要な IAM ロール
- **taskRoleArn**: アプリケーションが AWS サービスにアクセスする際に使用する IAM ロール
- **containerPort**: コンテナが公開するポート番号

### カスタマイズ

必要に応じて、以下の値を調整できます：

- CPU とメモリの割り当て
- 環境変数
- ログ設定
- ポートマッピング

詳細は [AWS ECS タスク定義のドキュメント](https://docs.aws.amazon.com/ja_jp/AmazonECS/latest/developerguide/task_definitions.html) を参照してください。
