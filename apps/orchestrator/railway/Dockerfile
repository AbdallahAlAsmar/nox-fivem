FROM node:20-alpine

RUN apk add --no-cache git python3 make g++

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/orchestrator/ ./apps/orchestrator/

# Install ALL deps (including devDeps) so tsx and prisma are available
RUN pnpm install --frozen-lockfile

# Generate Prisma client from the db package directory
RUN cd packages/db && npx prisma generate

EXPOSE 3001

CMD ["pnpm", "--filter", "@fivem-ai/orchestrator", "exec", "tsx", "src/index.ts"]
