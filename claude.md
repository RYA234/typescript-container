# Claude AI Development Instructions

このドキュメントは、Claude AIがこのプロジェクトで開発を行う際に従うべき規約とガイドラインを定義します。

## 基本ルール

**プロジェクトの開発規約は [.github/copilot-instructions.md](.github/copilot-instructions.md) に記載されています。**

このファイルに記載されている以下の内容を必ず遵守してください：

- プロジェクト概要とフォルダ構成
- TypeScriptコーディング規約
- Express.jsのRouter/Controller/Serviceパターン
- 環境変数管理とセキュリティ要件
- テスト規約（Jest/Playwright）
- AWS ECSデプロイメントの注意事項
- 新機能の追加方法
- 禁止事項

## Claude固有の追加指示

### 実装時の注意事項

1. **コード実装前の確認**
   - 必ず既存のコード（特に `src/sample/`）を参照して、パターンを理解する
   - 新機能を追加する際は、Issueとブランチを先に作成する
   - 実装前に [.github/copilot-instructions.md](.github/copilot-instructions.md) の該当セクションを確認する

2. **型安全性の徹底**
   - TypeScriptの型システムを最大限活用
   - `any` 型の使用は極力避ける
   - すべての関数、変数に明示的な型を付ける
   - 型定義は必ず `src/interfaces/` に配置

3. **アーキテクチャの遵守**
   - Feature-based（業務ドメインごとのフォルダ分割）を厳守
   - Router/Controller/Serviceパターンを必ず使用
   - 技術的なレイヤー分割（MVC形式）は絶対に避ける

4. **テストの作成**
   - すべての新機能にテストを追加
   - Unit TestsはJest、E2E TestsはPlaywrightを使用
   - テストは実装と同時に作成（後回しにしない）

5. **セキュリティの確保**
   - 機密情報を露出しない
   - AWS Secrets Managerの使用を遵守
   - ダミー値検出ロジックを実装

6. **シンプルさの維持**
   - 過度な抽象化や複雑な設計を避ける
   - ビジネス要件に必要な最小限の実装に留める
   - Next.js、React、Vueなど重いフレームワークは使用しない

### 新機能追加の手順

[.github/copilot-instructions.md](.github/copilot-instructions.md) の「新機能の追加方法」セクションに従い、以下の順序で実装してください：

1. GitHub Issueを作成
2. featureブランチを作成
3. 型定義を `src/interfaces/` に作成
4. 機能フォルダを `src/[feature]/` に作成
5. Service → Controller → Routerの順で実装
6. テストを作成
7. `src/app.ts` にルーターを統合
8. ビルドとテストを実行
9. コミット・プッシュ・PR作成

### Git運用

- コミットメッセージは [.github/copilot-instructions.md](.github/copilot-instructions.md) のフォーマットに従う
- PRには必ず以下を含める：
  - Summary（変更内容の概要）
  - Changes（変更したファイル・機能のリスト）
  - Test plan（テストの実施状況）
  - `Closes #[issue-number]`
  - 末尾に以下を追加：
    ```
    🤖 Generated with [Claude Code](https://claude.com/claude-code)

    Co-Authored-By: Claude <noreply@anthropic.com>
    ```

### 参考実装

疑問点がある場合は、以下の既存コードを参照してください：

- **型定義の例**: [src/interfaces/sample.ts](src/interfaces/sample.ts)
- **Serviceの例**: [src/sample/service.ts](src/sample/service.ts)
- **Controllerの例**: [src/sample/controller.ts](src/sample/controller.ts)
- **Routerの例**: [src/sample/router.ts](src/sample/router.ts)
- **テストの例**: [src/sample/tests/sample.test.ts](src/sample/tests/sample.test.ts)
- **設定管理の例**: [src/shared/config.ts](src/shared/config.ts)

## 重要な注意事項

- **二重管理の禁止**: このファイルは [.github/copilot-instructions.md](.github/copilot-instructions.md) を参照するためのものです。詳細な規約は copilot-instructions.md に記載されています。
- **規約の一貫性**: GitHub Copilotと同じ規約に従うことで、コードの一貫性を保ちます。
- **質問は既存コードへ**: 不明点がある場合は、まず既存のコード（特に `src/sample/`）を参照してください。

---

**詳細な開発規約は [.github/copilot-instructions.md](.github/copilot-instructions.md) を参照してください。**
