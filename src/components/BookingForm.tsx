"use client";

import { useMemo, useState, useActionState } from "react";
import { createBooking, type ActionState } from "@/app/actions";
import { formatMoney } from "@/lib/format";

const initialState: ActionState = {
  ok: false,
  message: ""
};

const HOURS = Array.from({ length: 16 }, (_, index) => 8 + index);
const SLOTS = HOURS.map((hour) => {
  const start = `${String(hour).padStart(2, "0")}:00`;
  const endHour = hour + 1;
  const end = endHour === 24 ? "00:00" : `${String(endHour).padStart(2, "0")}:00`;
  return `${start}-${end}`;
});

type BookingFormProps = {
  courtId: string;
  pricePerHour: number;
  currentUser?: {
    name: string;
    phone: string;
    role: string;
  } | null;
  bookings?: Array<{
    startTime: string;
    endTime: string;
    status: string;
  }>;
};

function todayString() {
  const date = new Date();
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function addDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + amount);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

const MN_MONTHS = [
  "нэгдүгээр сар",
  "хоёрдугаар сар",
  "гуравдугаар сар",
  "дөрөвдүгээр сар",
  "тавдугаар сар",
  "зургаадугаар сар",
  "долдугаар сар",
  "наймдугаар сар",
  "есдүгээр сар",
  "аравдугаар сар",
  "арван нэгдүгээр сар",
  "арван хоёрдугаар сар"
];

const MN_WEEKDAYS = ["ням", "даваа", "мягмар", "лхагва", "пүрэв", "баасан", "бямба"];

function prettyDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  const value = new Date(year, month - 1, date);
  return `${MN_MONTHS[month - 1]}ын ${date}. ${MN_WEEKDAYS[value.getDay()]}`;
}

function slotToDates(day: string, slot: string) {
  const [start, end] = slot.split("-");
  const startDate = new Date(`${day}T${start}:00`);
  const endDate = new Date(`${day}T${end === "00:00" ? "00:00" : end}:00`);
  if (end === "00:00") endDate.setDate(endDate.getDate() + 1);
  return { startDate, endDate };
}

function getSlotStatus(day: string, slot: string, bookings: BookingFormProps["bookings"] = []) {
  const { startDate, endDate } = slotToDates(day, slot);
  const now = new Date();

  if (startDate <= now) {
    return { disabled: true, label: "хаагдсан", className: "blocked" };
  }

  const booking = bookings.find((item) => {
    const bookedStart = new Date(item.startTime);
    const bookedEnd = new Date(item.endTime);
    return bookedStart < endDate && bookedEnd > startDate && item.status !== "CANCELLED";
  });

  if (!booking) return { disabled: false, label: formatMoney(0), className: "available" };
  if (booking.status === "PENDING") return { disabled: true, label: "түр хадгалсан", className: "pending" };
  if (booking.status === "PARTIALLY_PAID") return { disabled: true, label: "дутуу төлбөртэй", className: "partial" };
  return { disabled: true, label: "захиалгатай", className: "reserved" };
}

function areContiguous(slots: string[]) {
  for (let i = 0; i < slots.length - 1; i += 1) {
    const currentEnd = slots[i].split("-")[1];
    const nextStart = slots[i + 1].split("-")[0];
    if (currentEnd !== nextStart) return false;
  }
  return true;
}

export default function BookingForm({ courtId, pricePerHour, currentUser, bookings = [] }: BookingFormProps) {
  const [state, formAction, isPending] = useActionState(createBooking, initialState);
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);

  const isAdmin = currentUser?.role === "ADMIN";
  const totalPrice = selectedSlots.length * pricePerHour;
  const requiredDeposit = Math.ceil(totalPrice * 0.5);
  const remainingAmount = Math.max(totalPrice - paidAmount, 0);
  const paidPercent = totalPrice > 0 ? Math.min(100, Math.round((paidAmount / totalPrice) * 100)) : 0;

  const sortedSelectedSlots = useMemo(() => {
    return [...selectedSlots].sort((a, b) => SLOTS.indexOf(a) - SLOTS.indexOf(b));
  }, [selectedSlots]);

  const selectedSlotsValue = sortedSelectedSlots.join("|");

  const selectionText = sortedSelectedSlots.length
    ? `${sortedSelectedSlots[0].split("-")[0]}-${sortedSelectedSlots[sortedSelectedSlots.length - 1].split("-")[1]} · ${sortedSelectedSlots.length} цаг`
    : "Цагаа сонгоно уу";

  function toggleSlot(slot: string) {
    setSelectedSlots((current) => {
      if (current.includes(slot)) return current.filter((item) => item !== slot);
      const next = [...current, slot].sort((a, b) => SLOTS.indexOf(a) - SLOTS.indexOf(b));
      return areContiguous(next) ? next : [slot];
    });
  }

  function changeDate(day: string) {
    setSelectedDate(day);
    setSelectedSlots([]);
    setPaidAmount(0);
  }

  return (
    <form action={formAction} className="booking-shell">
      <input type="hidden" name="courtId" value={courtId} />
      <input type="hidden" name="selectedDate" value={selectedDate} />
      <input type="hidden" name="selectedSlots" value={selectedSlotsValue} />

      <div className="booking-top-card">
        <button className="date-arrow" type="button" onClick={() => changeDate(addDays(selectedDate, -1))} aria-label="Өмнөх өдөр">‹</button>
        <div>
          <strong suppressHydrationWarning>{prettyDay(selectedDate)}</strong>
          <span>Өдөр сонгоод боломжтой цагаа дарна</span>
        </div>
        <button className="date-arrow" type="button" onClick={() => changeDate(addDays(selectedDate, 1))} aria-label="Дараагийн өдөр">›</button>
      </div>

      <div className="slot-board">
        {SLOTS.map((slot) => {
          const status = getSlotStatus(selectedDate, slot, bookings);
          const selected = selectedSlots.includes(slot);
          const label = status.disabled ? status.label : formatMoney(pricePerHour);

          return (
            <button
              key={slot}
              className={`slot-row ${status.className} ${selected ? "selected" : ""}`}
              type="button"
              disabled={status.disabled}
              onClick={() => toggleSlot(slot)}
            >
              <span className="slot-time">{slot}</span>
              <span className="slot-status">{selected ? "сонгосон" : label}</span>
              <span className="slot-time mirror">{slot}</span>
            </button>
          );
        })}
      </div>

      <div className="form-card booking-info-form">
        <div className="grid-2">
          <div className="field">
            <label>Нэр</label>
            <input name="customerName" defaultValue={currentUser?.name || ""} placeholder="Жишээ: Пүүжээ" required />
          </div>

          <div className="field">
            <label>Утасны дугаар</label>
            <input name="phone" defaultValue={currentUser?.phone || ""} placeholder="Утасны дугаараа оруулна уу" required />
          </div>
        </div>

        <div className="payment-summary">
          <div>
            <span>Сонгосон цаг</span>
            <strong>{selectionText}</strong>
          </div>
          <div>
            <span>Нийт үнэ</span>
            <strong>{formatMoney(totalPrice)}</strong>
          </div>
          <div>
            <span>Баталгаажих доод төлбөр</span>
            <strong>{totalPrice ? formatMoney(requiredDeposit) : "—"}</strong>
          </div>
        </div>

        {isAdmin ? (
          <>
            <div className="field">
              <label>Урьдчилж төлсөн дүн</label>
              <input
                name="paidAmount"
                type="number"
                min="0"
                max={totalPrice || undefined}
                value={paidAmount}
                onChange={(event) => setPaidAmount(Math.max(0, Number(event.target.value || 0)))}
                placeholder="Жишээ: 50000"
              />
              <small className="hint">50% буюу түүнээс дээш төлбөл захиалга автоматаар баталгаажна.</small>
            </div>

            <div className="payment-bar-wrap">
              <div className="payment-bar"><span style={{ width: `${paidPercent}%` }} /></div>
              <p>
                Төлсөн: <b>{formatMoney(Math.min(paidAmount, totalPrice))}</b> · Үлдэгдэл: <b>{formatMoney(remainingAmount)}</b>
              </p>
              <p className={totalPrice > 0 && paidAmount >= requiredDeposit ? "success-text" : "warning-text"}>
                {totalPrice === 0
                  ? "Эхлээд цагаа сонго."
                  : paidAmount >= requiredDeposit
                    ? "Захиалга баталгаажих боломжтой."
                    : "Одоогоор баталгаажихгүй, 50% хүрээгүй байна."}
              </p>
            </div>
          </>
        ) : (
          <>
            <input type="hidden" name="paidAmount" value="0" />
            <div className="user-payment-note">
              <b>Хэрэглэгчийн захиалга</b>
              <span>Захиалга эхлээд хүлээгдэж буй төлөвтэй үүснэ. Admin 50%+ төлбөр бүртгэсний дараа баталгаажна.</span>
            </div>
          </>
        )}

        <div className="field">
          <label>Тайлбар</label>
          <textarea name="note" rows={3} placeholder="Жишээ: Волейбол тоглоно, 12 хүн..." />
        </div>

        {state.message ? (
          <p className={state.ok ? "success-message" : "error-message"}>{state.message}</p>
        ) : null}

        <button className="primary-btn" type="submit" disabled={isPending || selectedSlots.length === 0}>
          {isPending ? "Захиалж байна..." : "Захиалга өгөх"}
        </button>
      </div>
    </form>
  );
}
