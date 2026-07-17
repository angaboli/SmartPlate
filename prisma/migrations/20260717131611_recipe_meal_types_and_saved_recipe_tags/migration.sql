-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "mealTypes" "MealType"[] DEFAULT ARRAY[]::"MealType"[];

-- AlterTable: replace single-value "tag" with a "tags" array, preserving existing data
ALTER TABLE "saved_recipes" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "saved_recipes" SET "tags" = ARRAY["tag"] WHERE "tag" IS NOT NULL;

ALTER TABLE "saved_recipes" DROP COLUMN "tag";
