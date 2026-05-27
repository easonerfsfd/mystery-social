#!/bin/bash
set -e

echo "→ 构建前端..."
npm run build

echo "→ 上传前端..."
scp -r client/dist vps:/app/mystery-social/client/

echo "→ 上传服务端..."
scp server/src/routes/ai.js vps:/app/mystery-social/server/src/routes/ai.js
scp server/src/index.js     vps:/app/mystery-social/server/src/index.js

echo "→ 重启服务..."
ssh vps "pm2 restart 1"

echo "✓ 部署完成 → http://xymoniqi.com"
