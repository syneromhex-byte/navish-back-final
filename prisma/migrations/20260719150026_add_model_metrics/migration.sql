-- AlterTable
ALTER TABLE "models" ADD COLUMN     "compressionRatio" DOUBLE PRECISION,
ADD COLUMN     "optimizedSize" BIGINT,
ADD COLUMN     "originalSize" BIGINT,
ADD COLUMN     "processingTime" INTEGER,
ADD COLUMN     "storageSaved" BIGINT;
