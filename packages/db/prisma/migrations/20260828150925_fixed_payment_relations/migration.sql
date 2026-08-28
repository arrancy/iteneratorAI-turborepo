/*
  Warnings:

  - Added the required column `status` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Currencies" AS ENUM ('INR', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('captured', 'failed');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'completed', 'failed');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "status" "OrderStatus" NOT NULL;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "razorpayPaymentId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "currency" "Currencies" NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvents" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL,
    "razorpayPaymentId" TEXT NOT NULL,
    "currency" "Currencies" NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "WebhookEvents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvents_eventId_key" ON "WebhookEvents"("eventId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_razorpayOrderId_fkey" FOREIGN KEY ("razorpayOrderId") REFERENCES "Order"("razorpayOrderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvents" ADD CONSTRAINT "WebhookEvents_razorpayPaymentId_fkey" FOREIGN KEY ("razorpayPaymentId") REFERENCES "Payment"("razorpayPaymentId") ON DELETE RESTRICT ON UPDATE CASCADE;
