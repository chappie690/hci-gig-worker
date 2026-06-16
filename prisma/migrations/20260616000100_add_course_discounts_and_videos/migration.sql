ALTER TABLE "Course" ADD COLUMN "courseVideoUrl" TEXT;
ALTER TABLE "Course" ADD COLUMN "discountPercent" REAL;
ALTER TABLE "Course" ADD COLUMN "discountLabel" TEXT;
ALTER TABLE "Course" ADD COLUMN "discountActive" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TrainingSession" ADD COLUMN "sessionVideoUrl" TEXT;
