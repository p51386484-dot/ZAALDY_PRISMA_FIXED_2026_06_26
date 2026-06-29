import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EditBookingForm from "@/components/EditBookingForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingStatusLabel, formatMoney, toDateTimeLocal } from "@/lib/format";

export default async function EditBookingPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { court: true }
  });

  if (!booking) notFound();

  const isAdmin = user.role === "ADMIN";
  const isOwner = booking.userId === user.id;
  if (!isAdmin && !isOwner) redirect("/my-bookings");

  return (
    <div className="container narrow">
      <Link className="back-link" href={isAdmin ? "/admin" : "/my-bookings"}>← Буцах</Link>

      <section className="booking-header">
        <div>
          <p className="badge">{booking.court.location}</p>
          <h1>Захиалга засах</h1>
          <p>{booking.court.name} · {bookingStatusLabel(booking.status)}</p>
        </div>
        <div className="price-box">
          <span>Төлсөн / нийт</span>
          <strong>{formatMoney(booking.paidAmount)} / {formatMoney(booking.totalPrice)}</strong>
        </div>
      </section>

      <EditBookingForm
        isAdmin={isAdmin}
        booking={{
          id: booking.id,
          customerName: booking.customerName,
          phone: booking.phone,
          note: booking.note,
          status: booking.status,
          paidAmount: booking.paidAmount,
          remainingAmount: booking.remainingAmount,
          totalPrice: booking.totalPrice,
          startTimeLocal: toDateTimeLocal(booking.startTime),
          endTimeLocal: toDateTimeLocal(booking.endTime),
          court: { pricePerHour: booking.court.pricePerHour }
        }}
      />
    </div>
  );
}
