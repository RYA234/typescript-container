# ===========================
# Stage 1: Build Stage
# ===========================
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# 依存関係のインストール（開発依存関係含む）
COPY package.json package-lock.json* ./
RUN npm ci

# TypeScriptソースコードをコピー
COPY tsconfig.json ./
COPY src ./src

# TypeScriptをコンパイル
RUN npm run build

# ===========================
# Stage 2: Production Stage
# ===========================
FROM node:18-alpine

WORKDIR /usr/src/app

# 本番依存関係のみインストール
COPY package.json package-lock.json* ./
RUN npm ci --only=production && \
    npm cache clean --force

# ビルドステージからコンパイル済みJSをコピー
COPY --from=builder /usr/src/app/dist ./dist
COPY src/rag ./dist/src/rag
COPY src/agent ./dist/src/agent
COPY src/phaser ./dist/src/phaser

EXPOSE 3000

# コンパイル済みJavaScriptを実行
CMD ["node", "dist/src/app.js"]