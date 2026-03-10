Deployment Skill

このスキルは、Ritoのフロントエンドおよびバックエンドのデプロイプロセスを管理します。変更内容を自動的に検知し、適切なビルドおよびデプロイフローを実行します。
コマンド: /deploy
ユーザーがデプロイを指示した場合、以下の手順を順番に実行してください。

1. 変更検知とプリチェック
まず、プロジェクトルートで変更箇所を確認します。
git status および git diff --name-only HEAD を実行し、frontend/ と backend/ のどちらに変更があるか特定する。
未コミットの重要な変更がある場合はユーザーに警告する。
schema.prismaが両フォルダで一致しているかを確認する

2. フロントエンドのデプロイフロー
frontend/ ディレクトリに変更が含まれる場合、以下の手順を厳密に実行してください。
ディレクトリ移動: cd frontend
ビルド確認: pnpm run build を実行。
エラーが発生した場合は、デプロイを中断しエラー内容を報告する。
データ更新とイメージ送信:
pnpm run update:blocklist
pnpm run update:publicsuffix
pnpm run docker:push （Dockerレジストリへのプッシュ）

3. バックエンドのデプロイフロー
backend/ ディレクトリに変更が含まれる場合、以下の手順を厳密に実行してください。
ディレクトリ移動: cd backend
ビルド確認: pnpm run build を実行。
エラーが発生した場合は、デプロイを中断しエラー内容を報告する。
データ更新とイメージ送信:
pnpm run docker:push （Dockerレジストリへのプッシュ）
