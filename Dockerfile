FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV MCP_HTTP=true
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", "index.js", "--http"]
