# バックエンド開発

バックエンドをホスト上で実行し、PostgreSQLだけをローカルDockerで動かせます。

```bash
pnpm dev:docker
```

このコマンドは次の処理を行います。

- `127.0.0.1:5434` で永続化されたPostgreSQLコンテナを起動
- Prisma Clientを生成
- データベースマイグレーションを適用
- 現在のPrismaスキーマをローカルデータベースへ同期
- バックエンドを監視モードで起動

OpenAIキーやJetstream URLなど、データベース以外の設定は引き続き `backend/.env` から読み込みます。

バックエンドを終了してもデータベースコンテナは動作し続けます。管理には次のコマンドを使用します。

```bash
pnpm dev:db
pnpm dev:db:stop
pnpm dev:db:reset
```

`dev:db:reset` はローカル開発データベースを完全に削除してから再作成します。
