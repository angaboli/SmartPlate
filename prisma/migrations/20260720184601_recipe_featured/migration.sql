-- AlterTable
ALTER TABLE "recipes" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "recipes" ADD COLUMN "featuredOrder" INTEGER;
