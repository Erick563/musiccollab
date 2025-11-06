-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "state" JSONB;

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "audioData" BYTEA;
