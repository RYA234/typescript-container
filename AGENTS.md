```chatagent

# リポジトリ用エージェント: 開発・デプロイ手順

このファイルはリポジトリ内で利用するエージェント向けの運用ガイドです。開発フロー、ブランチ/PR ルール、デプロイ時の注意点を簡潔にまとめています。

目的:
- 開発・レビュー・デプロイの共通手順を明文化する
- 自動化エージェント（Human-AI）の応答品質を安定させる

運用フロー（短縮版）:
1. Issue を作成する（目的・再現手順・期待結果）
2. ブランチを切る（命名規則に従う）
3. 実装 → ローカルでビルド・簡易テスト
4. PR を作成しレビューを受ける（CI がパスしていること）
5. main にマージされると自動デプロイ（GitHub Actions + OIDC）

ブランチ命名規則:
- `feature/<ISSUE番号>-<short-desc>` 例: `feature/123-add-login`
- `fix/<ISSUE番号>-<short-desc>` 例: `fix/234-fix-typo`
- `chore/<short-desc>` 例: `chore/update-deps`

PR チェックリスト:
- タイトルに Issue 番号を含める
- 変更点の要約（What / Why）を記載
- 必要なら環境変数・シークレットの追記を `DEPLOYMENT_GUIDE.md` に行う
- CI（lint・テスト・build）が通っていること

デプロイ関連の注意点:
- `AWS_ACCOUNT_ID` 等の機密情報は `secrets` から注入する（リポジトリにハードコーディングしない）
- テスト目的で信頼ポリシーを緩めている場合、安定後は `main` のみに戻す
- デプロイ失敗時は Actions のログ → CloudWatch Logs の順で確認

運用上の約束事（短い）:
- 直接 `main` にコミットしない。PR を介して変更すること
- 機密情報はコミットしない、必要なら Secrets を設定する

参照:
- `DEPLOYMENT_GUIDE.md`（デプロイ手順・IAM ポリシーの例）

---

```
