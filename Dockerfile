# 軽量な Node.js イメージ
FROM node:18-alpine

WORKDIR /usr/src/app

# 依存関係だけ先にコピーしてキャッシュを有効にする
COPY package.json package-lock.json* ./

# 依存関係をインストール
RUN npm install --production

# アプリコードをコピー
COPY . .

EXPOSE 3000

CMD ["node", "app.js"]