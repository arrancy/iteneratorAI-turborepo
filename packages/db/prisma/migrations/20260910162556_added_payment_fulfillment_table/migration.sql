-- DropForeignKey
ALTER TABLE "WebhookEvents" DROP CONSTRAINT "WebhookEvents_razorpayPaymentId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "paidUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "product" "Products",
ADD COLUMN     "productExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PaymentFulfillment" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "fulfilled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentFulfillment_paymentId_key" ON "PaymentFulfillment"("paymentId");

-- AddForeignKey
ALTER TABLE "PaymentFulfillment" ADD CONSTRAINT "PaymentFulfillment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("razorpayPaymentId") ON DELETE RESTRICT ON UPDATE CASCADE;
