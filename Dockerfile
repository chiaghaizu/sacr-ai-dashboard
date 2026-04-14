# Production image: Google Cloud Run (Express + Vite static build).
FROM node:23-alpine

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Copy workspace configs and package manifests for dependency caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/
COPY server/package.json server/

# Install dependencies (frozen lockfile for reproducible builds)
RUN pnpm install --frozen-lockfile

# Copy source and build both packages
COPY client ./client
COPY server ./server

RUN pnpm build

WORKDIR /workspace/server

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]
