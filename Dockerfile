FROM node:18-slim

WORKDIR /app

# 创建必要的目录
RUN mkdir -p /app/views

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 80

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=80

# 启动命令
CMD ["node", "index.js"]