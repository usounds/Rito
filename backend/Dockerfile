# ---------- Build Stage ----------
FROM node:22-alpine AS build

RUN apk update && apk upgrade --no-cache
# 作業ディレクトリ
WORKDIR /app

# pnpm インストール
RUN npm install -g pnpm

# 依存関係だけ先にコピーしてインストール
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# lockfileどおりに依存関係をインストール
RUN pnpm install --frozen-lockfile

# ソースコードをコピー
COPY . .

# Prisma Client生成に必要な接続先をbuildへ渡す
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Prisma Clientを生成してTypeScriptを事前コンパイルし、本番不要の依存関係を除去
RUN pnpm run build && pnpm prune --prod

# ---------- Production Stage ----------
FROM node:22-alpine AS production

ENV NODE_ENV=production
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# build ステージから必要なファイルだけコピー
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# 本番用の起動コマンド
CMD ["node", "dist/index.js"]
