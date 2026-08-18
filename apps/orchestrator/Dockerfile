FROM node:20-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/orchestrator/ ./apps/orchestrator/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @fivem-ai/orchestrator

# Build TypeScript
RUN pnpm --filter @fivem-ai/orchestrator build

# Generate Prisma client
COPY packages/db/prisma ./packages/db/prisma
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/src ./packages/db/src
RUN pnpm --filter @fivem-ai/db generate

EXPOSE 8080

CMD ["node", "apps/orchestrator/dist/index.js"]
