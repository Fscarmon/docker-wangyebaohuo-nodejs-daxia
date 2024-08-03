# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 运行阶段
FROM node:18-alpine

# 安装 Chromium 和必要的依赖
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

WORKDIR /app

# 从构建阶段复制 node_modules 和其他文件
COPY --from=builder /app ./

# 设置 Puppeteer 使用系统安装的 Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 暴露端口
EXPOSE 7860

# 启动命令
CMD ["node", "index.js"]
