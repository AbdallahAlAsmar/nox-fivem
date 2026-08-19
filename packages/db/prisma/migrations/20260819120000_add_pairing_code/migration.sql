-- AlterTable
ALTER TABLE "agent_devices" ADD COLUMN "pairingCode" TEXT;
ALTER TABLE "agent_devices" ADD COLUMN "pairingExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "agent_devices_pairingCode_key" ON "agent_devices"("pairingCode");
