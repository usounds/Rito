Deployment Skill

このスキルは、Ritoのフロントエンドおよびバックエンドのデプロイプロセスを管理します。変更内容を自動的に検知し、適切なビルドおよびデプロイフローを実行します。
コマンド: /deploy
ユーザーがデプロイを指示した場合、以下の手順を順番に実行してください。

1. 変更検知とプリチェック（許可不要）
まず、プロジェクトルートで変更箇所を確認します。
git status および git diff --name-only HEAD を実行し、frontend/ と backend/ と chrome_extension/のいずれかに変更があるか特定する。
未コミットの重要な変更がある場合はユーザーに警告し処理を中断する。
すべてコミットされていたら、次へ進む。
schema.prismaが両フォルダで一致しているかを確認する

2. フロントエンドのデプロイフロー（許可不要）
frontend/ ディレクトリに変更が含まれる場合、以下の手順を厳密に実行してください。
ディレクトリ移動: cd frontend
ビルド確認: pnpm run build を実行。
エラーが発生した場合は、デプロイを中断しエラー内容を報告する。
データ更新とイメージ送信:
pnpm run update:blocklist
pnpm run update:publicsuffix
pnpm run docker:push （Dockerレジストリへのプッシュ）

3. バックエンドのデプロイフロー（許可不要）
backend/ ディレクトリに変更が含まれる場合、以下の手順を厳密に実行してください。
ディレクトリ移動: cd backend
ビルド確認: pnpm run test を実行。
エラーが発生した場合は、デプロイを中断しエラー内容を報告する。
データ更新とイメージ送信:
pnpm run docker:push （Dockerレジストリへのプッシュ）

4. chrome_extensionのデプロイフロー（許可不要）
chrome_extension/ ディレクトリに変更が含まれる場合、以下の手順を厳密に実行してください。
ブラウザ拡張機能のファイルを、配布・申請用にZip形式で圧縮します。不要なファイル（.DS_Storeなど）は自動的に除外されます。
`chrome_extension` ディレクトリに移動します。
以下のコマンドを実行して、ルートディレクトリに `rito-extension.zip` を作成します。
zip -r ../rito-extension.zip . -x "*.DS_Store" -x ".gitignore" -x "__MACOSX" "*.zip"

5. デプロイ完了
すべての手順が正常に完了した場合は、ユーザーにデプロイ完了の通知を送信してください。