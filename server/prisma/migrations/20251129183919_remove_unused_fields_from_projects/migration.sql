/*
  Warnings:

  - You are about to drop the column `description` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `genre` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `isPublic` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `tracks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "projects" DROP COLUMN "description",
DROP COLUMN "genre",
DROP COLUMN "isPublic";

-- AlterTable
ALTER TABLE "tracks" DROP COLUMN "isActive";
