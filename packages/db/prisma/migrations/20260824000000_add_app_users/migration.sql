-- CreateTable
CREATE TABLE "app_users" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "imageUrl" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_clerkUserId_key" ON "app_users"("clerkUserId");

-- CreateIndex
CREATE INDEX "app_users_organizationId_idx" ON "app_users"("organizationId");

-- AddForeignKey
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex (pairing session tokens must be unique; Postgres allows multiple NULLs so legacy devices are unaffected)
CREATE UNIQUE INDEX "agent_devices_pairing_token_hash_key" ON "agent_devices"("pairingTokenHash");
