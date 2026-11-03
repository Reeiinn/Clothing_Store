-- AlterEnum
ALTER TYPE "ReturnReason" ADD VALUE 'WRONG_ITEM';

-- AlterEnum
ALTER TYPE "ReturnStatus" ADD VALUE 'APPROVED';

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "fitNotes" TEXT;

-- AlterTable
ALTER TABLE "Variant" ADD COLUMN     "restockRequestedAt" TIMESTAMP(3);
