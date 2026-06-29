"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getCurrentUser, requireAdmin } from "@/lib/auth";
import { checkPasswordStrength, hashPassword, hashResetCode, makeResetCode, verifyPassword } from "@/lib/password";
import { formatMoney } from "@/lib/format";
import { getStatusFromPayment } from "@/lib/booking";

export type ActionState = {
  ok: boolean;
  message: string;
};

const initialError = { ok: false, message: "Алдаа гарлаа. Дахин оролдоно уу." };
const editableStatuses: BookingStatus[] = ["PENDING", "PARTIALLY_PAID", "CONFIRMED", "PAID", "COMPLETED", "CANCELLED"];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string) {
  const raw = getString(formData, key).replace(/,/g, "");
  const value = Number(raw || 0);
  return Number.isFinite(value) ? value : 0;
}

function getDateTime(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateFromDayAndTime(day: string, time: string, addDayForMidnight = false) {
  const date = new Date(`${day}T${time === "24:00" ? "00:00" : time}:00`);
  if (Number.isNaN(date.getTime())) return null;
  if (time === "24:00" || addDayForMidnight) date.setDate(date.getDate() + 1);
  return date;
}

function getSelectedSlotDateRange(formData: FormData) {
  const selectedDate = getString(formData, "selectedDate");
  const selectedSlots = getString(formData, "selectedSlots");
  if (!selectedDate || !selectedSlots) return null;

  const slots = selectedSlots.split("|").filter(Boolean).map((slot) => {
    const [start, end] = slot.split("-");
    return { start, end };
  });

  if (slots.length === 0 || slots.some((slot) => !slot.start || !slot.end)) return null;

  for (let i = 0; i < slots.length - 1; i += 1) {
    if (slots[i].end !== slots[i + 1].start) {
      return { error: "Сонгосон цагууд дараалсан байх ёстой." } as const;
    }
  }

  const first = slots[0];
  const last = slots[slots.length - 1];
  const startTime = dateFromDayAndTime(selectedDate, first.start);
  const endTime = dateFromDayAndTime(selectedDate, last.end, last.end === "00:00");

  if (!startTime || !endTime) return null;
  return { startTime, endTime, slotCount: slots.length } as const;
}

async function getBookingPriceAndValidate(
  courtId: string,
  startTime: Date,
  endTime: Date,
  ignoreBookingId?: string
) {
  if (startTime <= new Date()) {
    return { ok: false as const, message: "Өнгөрсөн цаг дээр захиалга үүсгэж/засаж болохгүй." };
  }

  if (endTime <= startTime) {
    return { ok: false as const, message: "Дуусах цаг эхлэх цагаас хойш байх ёстой." };
  }

  const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  if (durationHours < 0.5) {
    return { ok: false as const, message: "Хамгийн багадаа 30 минутын захиалга үүсгэнэ." };
  }

  if (durationHours > 6) {
    return { ok: false as const, message: "Нэг захиалга 6 цагаас ихгүй байна." };
  }

  const court = await prisma.court.findUnique({ where: { id: courtId } });

  if (!court) {
    return { ok: false as const, message: "Ийм заал олдсонгүй." };
  }

  const overlappingBooking = await prisma.booking.findFirst({
    where: {
      courtId,
      id: ignoreBookingId ? { not: ignoreBookingId } : undefined,
      status: { not: "CANCELLED" },
      startTime: { lt: endTime },
      endTime: { gt: startTime }
    }
  });

  if (overlappingBooking) {
    return { ok: false as const, message: "Энэ цаг дээр аль хэдийн захиалга байна. Өөр цаг сонгоно уу." };
  }

  return {
    ok: true as const,
    court,
    durationHours,
    totalPrice: Math.round(durationHours * court.pricePerHour)
  };
}

export async function registerUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = getString(formData, "name");
  const phone = getString(formData, "phone");
  const password = getString(formData, "password");

  if (!name || !phone || !password) {
    return { ok: false, message: "Нэр, утас, password-оо бөглөнө үү." };
  }

  const passwordCheck = checkPasswordStrength(password);
  if (!passwordCheck.valid) {
    return { ok: false, message: passwordCheck.message };
  }

  const existingUser = await prisma.user.findUnique({ where: { phone } });
  if (existingUser) {
    return { ok: false, message: "Энэ утсаар бүртгэлтэй хэрэглэгч байна." };
  }

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      passwordHash: hashPassword(password),
      role: "USER"
    }
  });

  await createSession(user.id);
  revalidatePath("/");
  redirect("/my-bookings");
}

export async function loginUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const phone = getString(formData, "phone");
  const password = getString(formData, "password");

  if (!phone || !password) {
    return { ok: false, message: "Утасны дугаар болон password-оо бөглөнө үү." };
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || user.role !== "USER" || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, message: "Хэрэглэгчийн нэвтрэх мэдээлэл буруу байна." };
  }

  await createSession(user.id);
  revalidatePath("/");
  redirect("/my-bookings");
}

export async function loginAdmin(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = getString(formData, "phone");
  const password = getString(formData, "password");

  if (!username || !password) {
    return { ok: false, message: "Admin username болон password-оо бөглөнө үү." };
  }

  const user = await prisma.user.findUnique({ where: { phone: username } });
  if (!user || user.role !== "ADMIN" || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, message: "Admin нэвтрэх мэдээлэл буруу байна." };
  }

  await createSession(user.id);
  revalidatePath("/");
  redirect("/admin");
}

export async function logoutUser() {
  await destroySession();
  revalidatePath("/");
  redirect("/");
}

export async function requestPasswordReset(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const phone = getString(formData, "phone");
  if (!phone) return { ok: false, message: "Утас/username-оо оруулна уу." };

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return { ok: false, message: "Ийм хэрэглэгч олдсонгүй." };
  }

  const code = makeResetCode();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      codeHash: hashResetCode(code),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });

  return {
    ok: true,
    message: `Demo reset code: ${code}. /reset-password дээр энэ кодоо хийж шинэ password үүсгэнэ.`
  };
}

export async function resetPassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const phone = getString(formData, "phone");
  const code = getString(formData, "code");
  const password = getString(formData, "password");

  if (!phone || !code || !password) {
    return { ok: false, message: "Утас, reset code, шинэ password-оо бөглөнө үү." };
  }

  const passwordCheck = checkPasswordStrength(password);
  if (!passwordCheck.valid) {
    return { ok: false, message: passwordCheck.message };
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return { ok: false, message: "Хэрэглэгч олдсонгүй." };

  const token = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      codeHash: hashResetCode(code),
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!token) {
    return { ok: false, message: "Reset code буруу эсвэл хугацаа дууссан байна." };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(password) } }),
    prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: user.id } })
  ]);

  return { ok: true, message: "Password амжилттай солигдлоо. Одоо шинэ password-оороо нэвтэрнэ үү." };
}

export async function createBooking(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const courtId = getString(formData, "courtId");
    const customerName = getString(formData, "customerName");
    const phone = getString(formData, "phone");
    const note = getString(formData, "note");
    const paidAmountRaw = Math.max(0, Math.round(getNumber(formData, "paidAmount")));

    const selectedRange = getSelectedSlotDateRange(formData);
    if (selectedRange && "error" in selectedRange) {
      return { ok: false, message: String(selectedRange.error) };
    }

    const startTime = selectedRange?.startTime || getDateTime(formData, "startTime");
    const endTime = selectedRange?.endTime || getDateTime(formData, "endTime");

    if (!courtId || !customerName || !phone || !startTime || !endTime) {
      return { ok: false, message: "Нэр, утас, захиалах өдөр/цагаа сонгоно уу." };
    }

    const result = await getBookingPriceAndValidate(courtId, startTime, endTime);
    if (!result.ok) return result;

    const user = await getCurrentUser();
    const isAdmin = user?.role === "ADMIN";
    const paidAmount = isAdmin ? Math.min(paidAmountRaw, result.totalPrice) : 0;
    const remainingAmount = Math.max(result.totalPrice - paidAmount, 0);
    const status = getStatusFromPayment(result.totalPrice, paidAmount);

    await prisma.booking.create({
      data: {
        courtId,
        userId: user?.id,
        customerName,
        phone,
        startTime,
        endTime,
        totalPrice: result.totalPrice,
        paidAmount,
        remainingAmount,
        status,
        note: note || null
      }
    });

    revalidatePath("/");
    revalidatePath(`/book/${courtId}`);
    revalidatePath("/admin");
    revalidatePath("/schedule");
    revalidatePath("/my-bookings");

    const requiredDeposit = Math.ceil(result.totalPrice * 0.5);
    const statusMessage = isAdmin
      ? paidAmount >= requiredDeposit
        ? "50%+ төлбөр бүртгэгдсэн тул захиалга баталгаажлаа."
        : `Баталгаажуулахад хамгийн багадаа ${formatMoney(requiredDeposit)} төлөх хэрэгтэй.`
      : "Захиалга хүлээгдэж буй төлөвтэй үүслээ. Admin төлбөр баталгаажуулсны дараа захиалга баталгаажна.";

    return {
      ok: true,
      message: isAdmin
        ? `Захиалга үүслээ. Нийт ${formatMoney(result.totalPrice)}, төлсөн ${formatMoney(paidAmount)}, үлдэгдэл ${formatMoney(remainingAmount)}. ${statusMessage}`
        : statusMessage
    };
  } catch (error) {
    console.error(error);
    return initialError;
  }
}

export async function updateBooking(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const bookingId = getString(formData, "bookingId");
    const customerName = getString(formData, "customerName");
    const phone = getString(formData, "phone");
    const startTime = getDateTime(formData, "startTime");
    const endTime = getDateTime(formData, "endTime");
    const note = getString(formData, "note");
    const status = getString(formData, "status") as BookingStatus;
    const paidAmountRaw = Math.max(0, Math.round(getNumber(formData, "paidAmount")));

    if (!bookingId || !customerName || !phone || !startTime || !endTime) {
      return { ok: false, message: "Бүх шаардлагатай талбарыг бөглөнө үү." };
    }

    const user = await getCurrentUser();
    if (!user) return { ok: false, message: "Эхлээд нэвтэрнэ үү." };

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return { ok: false, message: "Захиалга олдсонгүй." };

    const isAdmin = user.role === "ADMIN";
    const isOwner = booking.userId === user.id;

    if (!isAdmin && !isOwner) {
      return { ok: false, message: "Энэ захиалгыг засах эрхгүй байна." };
    }

    const result = await getBookingPriceAndValidate(booking.courtId, startTime, endTime, booking.id);
    if (!result.ok) return result;

    const paidAmount = isAdmin ? Math.min(paidAmountRaw, result.totalPrice) : Math.min(booking.paidAmount, result.totalPrice);
    const remainingAmount = Math.max(result.totalPrice - paidAmount, 0);
    const autoStatus = getStatusFromPayment(result.totalPrice, paidAmount);
    const nextStatus = isAdmin && editableStatuses.includes(status) ? status : autoStatus;

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        customerName,
        phone,
        startTime,
        endTime,
        totalPrice: result.totalPrice,
        paidAmount,
        remainingAmount,
        note: note || null,
        status: nextStatus
      }
    });

    revalidatePath("/admin");
    revalidatePath("/schedule");
    revalidatePath("/my-bookings");
    revalidatePath(`/book/${booking.courtId}`);
    revalidatePath(`/bookings/${booking.id}/edit`);

    return { ok: true, message: `Захиалга шинэчлэгдлээ. Шинэ үнэ: ${formatMoney(result.totalPrice)}.` };
  } catch (error) {
    console.error(error);
    return initialError;
  }
}

export async function updateBookingPayment(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const bookingId = getString(formData, "bookingId");
  const paidAmountRaw = Math.max(0, Math.round(getNumber(formData, "paidAmount")));
  if (!bookingId) return;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;

  const paidAmount = Math.min(paidAmountRaw, booking.totalPrice);
  const remainingAmount = Math.max(booking.totalPrice - paidAmount, 0);
  const status = getStatusFromPayment(booking.totalPrice, paidAmount);

  await prisma.booking.update({
    where: { id: bookingId },
    data: { paidAmount, remainingAmount, status }
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/schedule");
  revalidatePath("/my-bookings");
  revalidatePath(`/book/${booking.courtId}`);
}

export async function deleteBooking(formData: FormData) {
  const bookingId = getString(formData, "bookingId");
  if (!bookingId) return;

  const user = await getCurrentUser();
  if (!user) return;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;

  if (user.role !== "ADMIN" && booking.userId !== user.id) return;

  await prisma.booking.delete({ where: { id: bookingId } });

  revalidatePath("/admin");
  revalidatePath("/schedule");
  revalidatePath("/my-bookings");
  revalidatePath(`/book/${booking.courtId}`);
}

export async function createCourt(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const name = getString(formData, "name");
  const location = getString(formData, "location");
  const pricePerHourRaw = getString(formData, "pricePerHour");
  const description = getString(formData, "description");
  const imageUrl = getString(formData, "imageUrl");

  const pricePerHour = Number(pricePerHourRaw);

  if (!name || !location || !Number.isFinite(pricePerHour) || pricePerHour <= 0) {
    throw new Error("Заалын нэр, байршил, цагийн үнийг зөв бөглөнө үү.");
  }

  await prisma.court.create({
    data: {
      name,
      location,
      pricePerHour: Math.round(pricePerHour),
      description: description || null,
      imageUrl: imageUrl || null
    }
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/schedule");
}

export async function updateCourt(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const courtId = getString(formData, "courtId");
  const name = getString(formData, "name");
  const location = getString(formData, "location");
  const pricePerHourRaw = getString(formData, "pricePerHour");
  const description = getString(formData, "description");
  const imageUrl = getString(formData, "imageUrl");

  const pricePerHour = Number(pricePerHourRaw);

  if (!courtId || !name || !location || !Number.isFinite(pricePerHour) || pricePerHour <= 0) return;

  await prisma.court.update({
    where: { id: courtId },
    data: {
      name,
      location,
      pricePerHour: Math.round(pricePerHour),
      description: description || null,
      imageUrl: imageUrl || null
    }
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/schedule");
}

export async function confirmBooking(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const bookingId = getString(formData, "bookingId");
  if (!bookingId) return;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" }
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/schedule");
}

export async function cancelBooking(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const bookingId = getString(formData, "bookingId");
  if (!bookingId) return;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;

  if (user.role !== "ADMIN" && booking.userId !== user.id) return;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" }
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/schedule");
  revalidatePath("/my-bookings");
  revalidatePath(`/book/${booking.courtId}`);
}

export async function deleteCourt(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const courtId = getString(formData, "courtId");
  if (!courtId) return;

  await prisma.court.delete({ where: { id: courtId } });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/schedule");
}
