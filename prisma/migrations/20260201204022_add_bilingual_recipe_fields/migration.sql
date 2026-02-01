-- AlterTable
ALTER TABLE "recipe_ingredients" ADD COLUMN     "textFr" TEXT;

-- AlterTable
ALTER TABLE "recipe_steps" ADD COLUMN     "textFr" TEXT;

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "descriptionFr" TEXT,
ADD COLUMN     "titleFr" TEXT;
