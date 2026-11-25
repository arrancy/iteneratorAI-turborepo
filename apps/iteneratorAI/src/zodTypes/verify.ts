import z from "zod";
const notEmptyString = z.string().min(1);
export const verifySchema = z.object({
  razorpay_payment_id: notEmptyString,
  razorpay_order_id: notEmptyString,
  razorpay_signature: notEmptyString,
});
