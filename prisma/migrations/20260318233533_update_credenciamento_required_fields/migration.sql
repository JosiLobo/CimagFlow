/*
  Warnings:

  - Made the column `requesterPhone` on table `credenciamentos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `requesterCpf` on table `credenciamentos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `requesterCnpj` on table `credenciamentos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyAddress` on table `credenciamentos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyCity` on table `credenciamentos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyState` on table `credenciamentos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyCep` on table `credenciamentos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyPhone` on table `credenciamentos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyEmail` on table `credenciamentos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "credenciamentos" ALTER COLUMN "requesterPhone" SET NOT NULL,
ALTER COLUMN "requesterCpf" SET NOT NULL,
ALTER COLUMN "requesterCnpj" SET NOT NULL,
ALTER COLUMN "companyAddress" SET NOT NULL,
ALTER COLUMN "companyCity" SET NOT NULL,
ALTER COLUMN "companyState" SET NOT NULL,
ALTER COLUMN "companyCep" SET NOT NULL,
ALTER COLUMN "companyPhone" SET NOT NULL,
ALTER COLUMN "companyEmail" SET NOT NULL;
