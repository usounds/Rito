# Deployment Skill (Full Automation)

このスキルは、Ritoのフロントエンド、バックエンド、およびChrome拡張機能のデプロイプロセスを完全に自動化して管理します。

## コマンド: /deploy

ユーザーからデプロイの指示があった場合、以下のフローを**ユーザーの承認（Yes/No）を待つことなく**、エラーが発生しない限り一気通貫で実行してください。

### 1. 変更検知と整合性チェック（自動実行）
まず、プロジェクトルートで以下の確認を行います。

1. **変更箇所の特定**: `git status` および `git diff --name-only HEAD` を実行。
   - `frontend/`、`backend/`、`chrome_extension/` のいずれに変更があるかを把握する。
2. **コミット状態の確認**: 未コミットの変更がある場合は、更新内容に応じてGitに自動でコミットする。コメントのルールは遵守すること
   - すべてコミットされている場合のみ次へ進む。
3. **Prisma Schemaの一致確認**: `frontend/` と `backend/` の中にある `schema.prisma` ファイルの内容を比較（`diff`等）し、一致しているか確認する。
   - 不一致がある場合は、デプロイを中断しエラーを報告する。

### 2. フロントエンドのデプロイフロー（自動実行）
`frontend/` に変更がある場合に実行します。

1. **ディレクトリ移動**: `cd frontend`
2. **ビルド確認**: `pnpm run build`
   - 失敗した場合は中断。
3. **データ更新とプッシュ**:
   - `pnpm run update:blocklist`
   - `pnpm run update:publicsuffix`
   - `pnpm run docker:push`
4. **コミットとプッシュ**:
   - `git add .`
   - `git commit -m "list : アップデート"`
   - `git push`

### 3. バックエンドのデプロイフロー（自動実行）
`backend/` に変更がある場合に実行します。

1. **ディレクトリ移動**: `cd backend`
2. **テスト実行**: `pnpm run test`
   - 失敗した場合は中断。
3. **イメージ送信**:
   - `pnpm run docker:push`

### 4. Chrome拡張機能のデプロイフロー（自動実行）
`chrome_extension/` に変更がある場合に実行します。

1. **ディレクトリ移動**: `cd chrome_extension`
2. **パッケージング**:
   - 以下のコマンドでルートディレクトリに `rito-extension.zip` を作成する。
   - `zip -r ../rito-extension.zip . -x "*.DS_Store" -x ".gitignore" -x "__MACOSX" "*.zip"`

### 5. デプロイ完了通知
すべての対象ディレクトリの処理が正常に完了した後、以下の情報をユーザーに報告します。
- 更新されたコンポーネント（Frontend / Backend / Extension）のリスト。
- すべてのプロセスが正常に終了した旨の通知。

## エラーハンドリング
- コマンドが失敗した（ビルドエラー、テスト失敗、不一致検知等）場合のみ、即座に停止し、ユーザーに状況を報告してください。
- 正常に動作している限り、途中で入力を待つ必要はありません。