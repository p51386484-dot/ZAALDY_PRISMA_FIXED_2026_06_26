import Link from "next/link";
import type { BookingStatus, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { cancelBooking, confirmBooking, createCourt, deleteBooking, deleteCourt, updateBookingPayment, updateCourt } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { bookingStatusLabel, formatDateTime, formatMoney } from "@/lib/format";
import { paymentPercent } from "@/lib/booking";

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

const statusOptions: BookingStatus[] = ["PENDING", "PARTIALLY_PAID", "CONFIRMED", "PAID", "COMPLETED", "CANCELLED"];

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string | string[]; status?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/admin/login");

  const params = searchParams ? await searchParams : {};
  const q = asString(params.q).trim();
  const status = asString(params.status).trim();
  const statusWhere = statusOptions.includes(status as BookingStatus) ? (status as BookingStatus) : undefined;

  const bookingWhere: Prisma.BookingWhereInput = {
    ...(statusWhere ? { status: statusWhere } : {}),
    ...(q
      ? {
          OR: [
            { customerName: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
            { court: { name: { contains: q, mode: "insensitive" as const } } }
          ]
        }
      : {})
  };

  const [courts, bookings, totalBookings, pendingBookings, confirmedBookings, cancelledBookings, revenue, userCount] = await Promise.all([
    prisma.court.findMany({
      orderBy: { createdAt: "desc" },
      include: { bookings: true }
    }),
    prisma.booking.findMany({
      where: bookingWhere,
      include: { court: true, user: true },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: { in: ["PENDING", "PARTIALLY_PAID"] } } }),
    prisma.booking.count({ where: { status: { in: ["CONFIRMED", "PAID"] } } }),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.booking.aggregate({ where: { status: { not: "CANCELLED" } }, _sum: { paidAmount: true } }),
    prisma.user.count({ where: { role: "USER" } })
  ]);

  return (
    <div className="container">
      <section className="section-title admin-title-row">
        <div>
          <p className="eyebrow dark">Zaaldy dashboard</p>
          <h1>Admin</h1>
          <p>Заал, захиалга, төлбөр, хэрэглэгч, орлогоо нэг дор удирдана.</p>
        </div>
        <Link className="small-btn" href="/schedule">Calendar хуваарь</Link>
      </section>

      <section className="stats-grid">
        <div className="stat-card"><span>Нийт захиалга</span><strong>{totalBookings}</strong></div>
        <div className="stat-card"><span>Хүлээгдэж буй</span><strong>{pendingBookings}</strong></div>
        <div className="stat-card"><span>Баталгаажсан</span><strong>{confirmedBookings}</strong></div>
        <div className="stat-card"><span>Цуцлагдсан</span><strong>{cancelledBookings}</strong></div>
        <div className="stat-card"><span>Төлсөн орлого</span><strong>{formatMoney(revenue._sum.paidAmount || 0)}</strong></div>
        <div className="stat-card"><span>Хэрэглэгч</span><strong>{userCount}</strong></div>
      </section>

      <section className="admin-grid">
        <div className="panel">
          <h2>Шинэ заал нэмэх</h2>
          <form action={createCourt} className="form-card simple">
            <div className="field">
              <label>Заалын нэр</label>
              <input name="name" placeholder="Жишээ: Төв Спорт Заал" required />
            </div>
            <div className="field">
              <label>Байршил</label>
              <input name="location" placeholder="Жишээ: СБД, 1-р хороо" required />
            </div>
            <div className="field">
              <label>Цагийн үнэ /₮/</label>
              <input name="pricePerHour" type="number" min="1000" placeholder="60000" required />
            </div>
            <div className="field">
              <label>Зураг URL</label>
              <input name="imageUrl" placeholder="https://..." />
            </div>
            <div className="field">
              <label>Тайлбар</label>
              <textarea name="description" rows={3} placeholder="Заалын товч тайлбар" />
            </div>
            <button className="primary-btn" type="submit">Заал нэмэх</button>
          </form>
        </div>

        <div className="panel">
          <h2>Заалууд</h2>
          <div className="admin-list">
            {courts.map((court) => (
              <details className="admin-item details-item" key={court.id}>
                <summary>
                  <div>
                    <strong>{court.name}</strong>
                    <p>{court.location} · {formatMoney(court.pricePerHour)} / цаг</p>
                    <small>{court.bookings.length} захиалга</small>
                  </div>
                </summary>
                <form action={updateCourt} className="inline-edit-form">
                  <input type="hidden" name="courtId" value={court.id} />
                  <div className="grid-2">
                    <div className="field"><label>Нэр</label><input name="name" defaultValue={court.name} required /></div>
                    <div className="field"><label>Байршил</label><input name="location" defaultValue={court.location} required /></div>
                  </div>
                  <div className="grid-2">
                    <div className="field"><label>Үнэ</label><input name="pricePerHour" type="number" defaultValue={court.pricePerHour} required /></div>
                    <div className="field"><label>Зураг URL</label><input name="imageUrl" defaultValue={court.imageUrl || ""} /></div>
                  </div>
                  <div className="field"><label>Тайлбар</label><textarea name="description" rows={3} defaultValue={court.description || ""} /></div>
                  <button className="mini-btn" type="submit">Заал засах</button>
                </form>
                <form action={deleteCourt} className="inline-danger-form">
                  <input type="hidden" name="courtId" value={court.id} />
                  <button className="danger-btn" type="submit">Заал устгах</button>
                </form>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="panel full-panel">
        <div className="admin-title-row small-gap">
          <div>
            <h2>Захиалгууд</h2>
            <p className="muted">Нэр, утас, заалын нэрээр хайж болно. Төлбөр 50%+ бол автоматаар баталгаажна.</p>
          </div>
          <form className="search-form" action="/admin">
            <input name="q" defaultValue={q} placeholder="Нэр, утас, заал..." />
            <select name="status" defaultValue={status}>
              <option value="">Бүх төлөв</option>
              {statusOptions.map((item) => <option key={item} value={item}>{bookingStatusLabel(item)}</option>)}
            </select>
            <button className="mini-btn" type="submit">Хайх</button>
          </form>
        </div>

        {bookings.length === 0 ? (
          <p className="muted">Захиалга олдсонгүй.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Заал</th>
                  <th>Хэрэглэгч</th>
                  <th>Утас</th>
                  <th>Цаг</th>
                  <th>Үнэ</th>
                  <th>Төлбөр</th>
                  <th>Төлөв</th>
                  <th>Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const percent = paymentPercent(booking.totalPrice, booking.paidAmount);
                  return (
                    <tr key={booking.id}>
                      <td>{booking.court.name}</td>
                      <td>{booking.customerName}</td>
                      <td>{booking.phone}</td>
                      <td>{formatDateTime(booking.startTime)}<br />{formatDateTime(booking.endTime)}</td>
                      <td>{formatMoney(booking.totalPrice)}</td>
                      <td>
                        <form action={updateBookingPayment} className="payment-inline-form">
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <input name="paidAmount" type="number" min="0" max={booking.totalPrice} defaultValue={booking.paidAmount} />
                          <button className="mini-btn" type="submit">Save</button>
                        </form>
                        <small>{percent}% · үлдэгдэл {formatMoney(booking.remainingAmount)}</small>
                      </td>
                      <td><span className={`status ${booking.status.toLowerCase()}`}>{bookingStatusLabel(booking.status)}</span></td>
                      <td>
                        <div className="action-row wrap">
                          <Link className="mini-btn as-link" href={`/bookings/${booking.id}/edit`}>Засах</Link>
                          <form action={confirmBooking}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <button className="mini-btn" type="submit">Батлах</button>
                          </form>
                          <form action={cancelBooking}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <button className="danger-btn mini" type="submit">Цуцлах</button>
                          </form>
                          <form action={deleteBooking}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <button className="danger-btn mini" type="submit">Устгах</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
