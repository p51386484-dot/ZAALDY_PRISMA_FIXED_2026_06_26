import type { BookingStatus } from "@prisma/client";

export function getStatusFromPayment(totalPrice: number, paidAmount: number): BookingStatus {
  const safeTotal = Math.max(0, totalPrice);
  const safePaid = Math.max(0, paidAmount);

  if (safeTotal > 0 && safePaid >= safeTotal) return "PAID";
  if (safeTotal > 0 && safePaid >= Math.ceil(safeTotal * 0.5)) return "CONFIRMED";
  if (safePaid > 0) return "PARTIALLY_PAID";
  return "PENDING";
}

export function paymentPercent(totalPrice: number, paidAmount: number) {
  if (totalPrice <= 0) return 0;
  return Math.min(100, Math.round((paidAmount / totalPrice) * 100));
}
