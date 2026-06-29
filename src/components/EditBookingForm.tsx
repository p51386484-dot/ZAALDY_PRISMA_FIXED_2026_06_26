"use client";

import { useMemo, useState, useActionState } from "react";
import { updateBooking, type ActionState } from "@/app/actions";
import { formatMoney } from "@/lib/format";

const initialState: ActionState = {
  ok: false,
  message: ""
};

type EditBookingFormProps = {
  booking: {
    id: string;
    customerName: string;
    phone: string;
    note: string | null;
    status: string;
    paidAmount: number;
    remainingAmount: number;
    totalPrice: number;
    startTimeLocal: string;
    endTimeLocal: string;
    court: {
      pricePerHour: number;
    };
  };
  isAdmin: boolean;
};

export default function EditBookingForm({ booking, isAdmin }: EditBookingFormProps) {
  const [state, formAction, isPending] = useActionState(updateBooking, initialState);
  const [startTime, setStartTime] = useState(booking.startTimeLocal);
  const [endTime, setEndTime] = useState(booking.endTimeLocal);

  const pricePreview = useMemo(() => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * booking.court.pricePerHour);
  }, [startTime, endTime, booking.court.pricePerHour]);

  return (
    <form action={formAction} className="form-card">
      <input type="hidden" name="bookingId" value={booking.id} />

      <div className="grid-2">
        <div className="field">
          <label>Нэр</label>
          <input name="customerName" defaultValue={booking.customerName} required />
        </div>
        <div className="field">
          <label>Утас</label>
          <input name="phone" defaultValue={booking.phone} required />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Эхлэх цаг</label>
          <input name="startTime" type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
        </div>
        <div className="field">
          <label>Дуусах цаг</label>
          <input name="endTime" type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
        </div>
      </div>

      {isAdmin ? (
        <div className="grid-2">
          <div className="field">
            <label>Төлсөн дүн</label>
            <input name="paidAmount" type="number" min="0" max={pricePreview || booking.totalPrice} defaultValue={booking.paidAmount} />
          </div>
          <div className="field">
          <label>Төлөв</label>
          <select name="status" defaultValue={booking.status}>
            <option value="PENDING">Хүлээгдэж буй</option>
            <option value="PARTIALLY_PAID">Дутуу төлбөртэй</option>
            <option value="CONFIRMED">Баталгаажсан</option>
            <option value="PAID">Бүрэн төлөгдсөн</option>
            <option value="COMPLETED">Дууссан</option>
            <option value="CANCELLED">Цуцлагдсан</option>
          </select>
          </div>
        </div>
      ) : null}

      <div className="price-preview">
        <span>Шинэ үнэ</span>
        <strong>{pricePreview ? formatMoney(pricePreview) : "Цагаа зөв сонгоно уу"}</strong>
      </div>

      <div className="field">
        <label>Тайлбар</label>
        <textarea name="note" rows={4} defaultValue={booking.note || ""} />
      </div>

      {state.message ? (
        <p className={state.ok ? "success-message" : "error-message"}>{state.message}</p>
      ) : null}

      <button className="primary-btn" type="submit" disabled={isPending}>
        {isPending ? "Хадгалж байна..." : "Өөрчлөлт хадгалах"}
      </button>
    </form>
  );
}
