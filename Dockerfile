FROM node:20-alpine

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

EXPOSE 4000 5173
