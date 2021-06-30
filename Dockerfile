# ベースイメージを指定
FROM node:14.15.1

# ディレクトリを移動する
WORKDIR /src

# node.js の環境変数を定義する
# 本番環境では production, 開発環境では development
ENV NODE_ENV=production

# ポート3000番を開放する
EXPOSE 3000
