FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install dependencies (including dev for build)
RUN pnpm install --frozen-lockfile --filter @fivem-ai/web

# Build Next.js
RUN pnpm --filter @fivem-ai/web build

# Production dependencies only
RUN pnpm install --frozen-lockfile --filter @fivem-ai/web --prod

EXPOSE 3000

CMD ["pnpm", "--filter", "@fivem-ai/web", "start"]
