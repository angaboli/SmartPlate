-- CreateTable
CREATE TABLE "rate_limit_attempts" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_attempts_identifier_action_createdAt_idx" ON "rate_limit_attempts"("identifier", "action", "createdAt");
