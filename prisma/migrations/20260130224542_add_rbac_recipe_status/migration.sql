-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'editor', 'admin');

-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('draft', 'pending_review', 'published', 'rejected');

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "status" "RecipeStatus" NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'user';

-- CreateIndex
CREATE INDEX "recipes_status_idx" ON "recipes"("status");
