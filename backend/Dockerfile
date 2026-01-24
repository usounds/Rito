# ---------- Build Stage ----------
FROM node:22-alpine AS build

RUN apk update && apk upgrade --no-cache
# 作業ディレクトリ
WORKDIR /app

# pnpm インストール
RUN npm install -g pnpm

# 依存関係だけ先にコピーしてインストール
COPY package.json pnpm-lock.yaml* ./

# 本番用依存だけインストール
RUN pnpm install 

# ソースコードをコピー
COPY . .

# Prisma クライアントを生成
RUN pnpm exec prisma generate

# ---------- Production Stage ----------
FROM node:22-alpine AS production

ENV NODE_ENV=production
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# pnpm インストール
RUN npm install -g pnpm

# build ステージから必要なファイルだけコピー
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json

# 本番用の起動コマンド
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
