import Link from "next/link";
import { notFound } from "next/navigation";
import BookingForm from "@/components/BookingForm";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export default async function BookingPage({ params }: { params: Promise<{ courtId: string }> }) {
  const { courtId } = await params;
  const user = await getCurrentUser();
  const today = startOfToday();

  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: {
      bookings: {
        where: {
          status: { not: "CANCELLED" },
          endTime: { gte: today, lt: addDays(today, 21) }
        },
        orderBy: { startTime: "asc" }
      }
    }
  });

  if (!court) notFound();

  const bookingSlots = court.bookings.map((booking) => ({
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    status: booking.status
  }));

  return (
    <div className="container narrow">
      <Link className="back-link" href="/">
        ← Буцах
      </Link>

      <section className="booking-header premium-booking-header">
        <div>
          <p className="badge">{court.location}</p>
          <h1>{court.name}</h1>
          <p>{court.description}</p>
          <div className="slot-legend">
            <span><i className="dot available" /> Сул</span>
            <span><i className="dot pending" /> Түр хадгалсан</span>
            <span><i className="dot reserved" /> Захиалгатай</span>
          </div>
        </div>
        <div className="price-box">
          <span>Цагийн үнэ</span>
          <strong>{formatMoney(court.pricePerHour)}</strong>
        </div>
      </section>

      <BookingForm
        courtId={court.id}
        pricePerHour={court.pricePerHour}
        bookings={bookingSlots}
        currentUser={user ? { name: user.name, phone: user.phone, role: user.role } : null}
      />
    </div>
  );
}
