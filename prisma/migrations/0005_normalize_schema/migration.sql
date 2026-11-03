-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "ReturnRequest" DROP CONSTRAINT "ReturnRequest_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailVerified",
DROP COLUMN "image";

-- AlterTable
ALTER TABLE "Variant" DROP COLUMN "restockRequestedAt";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "totalCents";

-- AlterTable
ALTER TABLE "ReturnRequest" DROP COLUMN "userId";

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "VerificationToken";

