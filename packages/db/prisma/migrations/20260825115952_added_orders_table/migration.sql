-- CreateEnum
CREATE TYPE "Products" AS ENUM ('premium', 'pro');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "product" "Products" NOT NULL,
    "receipt" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_receipt_key" ON "Order"("receipt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
