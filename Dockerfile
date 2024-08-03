# 使用官方的 Node.js Debian 镜像作为基础镜像
FROM node:18-buster

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果有的话）
COPY package*.json ./

# 安装 Node.js 依赖
RUN npm install

# 安装 Puppeteer 运行所需的库和 Chromium 浏览器
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    fonts-liberation \
    libappindicator3-1 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 设置 Puppeteer 使用的 Chromium 路径
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 复制应用程序代码
COPY . .

# 暴露应用程序端口
EXPOSE 7860
USER 1000
# 启动应用程序
CMD ["node", "index.js"]


