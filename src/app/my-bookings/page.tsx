import Link from "next/link";
import { redirect } from "next/navigation";
import { cancelBooking, deleteBooking } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingStatusLabel, formatDateTime, formatMoney } from "@/lib/format";

export default async function MyBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { court: true },
    orderBy: { startTime: "desc" }
  });

  return (
    <div className="container">
      <section className="section-title admin-title-row">
        <div>
          <p className="eyebrow dark">Zaaldy account</p>
          <h1>Миний захиалга</h1>
          <p>{user.name}, эндээс өөрийн захиалгаа харах, засах, цуцлах боломжтой.</p>
        </div>
        <Link className="small-btn" href="/">Шинэ захиалга</Link>
      </section>

      {bookings.length === 0 ? (
        <div className="empty-card">Одоогоор захиалга алга. Нүүр хуудаснаас заал сонгоод захиалаарай.</div>
      ) : (
        <div className="booking-card-grid">
          {bookings.map((booking) => (
              <article className="my-booking-card" key={booking.id}>
                <div>
                  <span className={`status ${booking.status.toLowerCase()}`}>{bookingStatusLabel(booking.status)}</span>
                  <h3>{booking.court.name}</h3>
                  <p className="muted">{booking.court.location}</p>
                </div>
                <div className="booking-meta">
                  <p><b>Эхлэх:</b> {formatDateTime(booking.startTime)}</p>
                  <p><b>Дуусах:</b> {formatDateTime(booking.endTime)}</p>
                  <p><b>Үнэ:</b> {formatMoney(booking.totalPrice)}</p>
                  <p><b>Төлөв:</b> {bookingStatusLabel(booking.status)}</p>
                </div>
                <div className="user-payment-note compact-note">
                  <b>Төлбөрийн дэлгэрэнгүй</b>
                  <span>Төлсөн дүн, үлдэгдэл, орлогын тооцоо зөвхөн admin dashboard дээр харагдана.</span>
                </div>
                <div className="action-row wrap">
                  <Link className="mini-btn as-link" href={`/bookings/${booking.id}/edit`}>Засах</Link>
                  <form action={cancelBooking}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button className="danger-btn mini" type="submit">Цуцлах</button>
                  </form>
                  <form action={deleteBooking}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button className="danger-btn mini" type="submit">Устгах</button>
                  </form>
                </div>
              </article>
            ))}
        </div>
      )}
    </div>
  );
}
