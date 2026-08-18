# Railway entrypoint — runs the orchestrator via tsx (no build step).
# tsx is a devDependency, so we must install WITH dev deps (not --prod).

FROM node:20-alpine

RUN apk add --no-cache git python3 make g++

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/orchestrator/ ./apps/orchestrator/

# Install deps WITH dev deps so tsx is available
RUN pnpm install --frozen-lockfile --filter @fivem-ai/orchestrator --filter @fivem-ai/db --filter @fivem-ai/shared

# Generate Prisma client
RUN pnpm --filter @fivem-ai/db generate

EXPOSE 3001

CMD ["pnpm", "--filter", "@fivem-ai/orchestrator", "exec", "tsx", "src/index.ts"]