CREATE TABLE "prompt_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "prompt_conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "prompt_conversations_userId_updatedAt_idx" ON "prompt_conversations"("userId", "updatedAt");

CREATE TABLE "prompt_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "prompt_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "prompt_messages_conversationId_createdAt_idx" ON "prompt_messages"("conversationId", "createdAt");
ALTER TABLE "prompt_messages" ADD CONSTRAINT "prompt_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "prompt_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "prompt_anonymous_usage" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "prompt_anonymous_usage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "prompt_anonymous_usage_fingerprint_day_key" ON "prompt_anonymous_usage"("fingerprint", "day");
CREATE INDEX "prompt_anonymous_usage_day_idx" ON "prompt_anonymous_usage"("day");
