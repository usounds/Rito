# ---------- Build Stage ----------
FROM node:22-alpine AS build

# 作業ディレクトリ
WORKDIR /app

# 依存関係だけ先にコピーしてインストール
COPY package.json package-lock.json* ./

# 本番用依存だけインストール
RUN npm install --omit=dev

# ソースコードをコピー
COPY . .

# Prisma クライアントを生成
RUN npx prisma generate

# ---------- Production Stage ----------
FROM node:22-alpine AS production

WORKDIR /app

# build ステージから必要なファイルだけコピー
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json

# 本番用の起動コマンド
CMD ["npx", "tsx", "src/index.ts"]
