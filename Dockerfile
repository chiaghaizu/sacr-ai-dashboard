# Production image: Google Cloud Run, Railway, Render, etc. (Express + Vite static build).
FROM node:20-alpine

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/
COPY server/package.json server/

RUN pnpm install --frozen-lockfile

COPY client ./client
COPY server ./server

RUN pnpm build

WORKDIR /workspace/server

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]
