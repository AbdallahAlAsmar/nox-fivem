FROM node:20-slim

RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/orchestrator/ ./apps/orchestrator/

# Install ALL deps
RUN pnpm install --frozen-lockfile

# Generate Prisma client for Linux binary
RUN cd packages/db && npx prisma generate --schema=./prisma/schema.prisma

EXPOSE 3001

CMD ["pnpm", "--filter", "@fivem-ai/orchestrator", "exec", "tsx", "src/index.ts"]
