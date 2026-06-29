export function formatMoney(amount: number) {
  return new Intl.NumberFormat("mn-MN").format(amount) + "₮";
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatDateOnly(date: Date) {
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    weekday: "long"
  }).format(date);
}

export function formatTimeOnly(date: Date) {
  return new Intl.DateTimeFormat("mn-MN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function toDateTimeLocal(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function bookingStatusLabel(status: string) {
  if (status === "PAID") return "Бүрэн төлөгдсөн";
  if (status === "CONFIRMED") return "Баталгаажсан";
  if (status === "PARTIALLY_PAID") return "Дутуу төлбөртэй";
  if (status === "COMPLETED") return "Дууссан";
  if (status === "CANCELLED") return "Цуцлагдсан";
  return "Хүлээгдэж буй";
}
