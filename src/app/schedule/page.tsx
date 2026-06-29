import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";

const HOURS = Array.from({ length: 16 }, (_, index) => 8 + index);
const MN_MONTHS = [
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар"
];
const MN_WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

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

function dateKey(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function dayTitle(date: Date) {
  return `${MN_MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function weekdayTitle(date: Date) {
  return MN_WEEKDAYS[date.getDay()];
}

function slotText(hour: number) {
  const start = `${String(hour).padStart(2, "0")}:00`;
  const endHour = hour + 1;
  const end = endHour === 24 ? "00:00" : `${String(endHour).padStart(2, "0")}:00`;
  return `${start}-${end}`;
}

function slotRange(day: Date, hour: number) {
  const start = new Date(day);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(day);
  end.setHours(hour + 1, 0, 0, 0);
  return { start, end };
}

function getSlotState(
  bookings: Array<{ courtId: string; startTime: Date; endTime: Date; status: string }>,
  courtId: string,
  start: Date,
  end: Date
) {
  if (start <= new Date()) {
    return { key: "closed", label: "Өнгөрсөн", title: "Өнгөрсөн цаг" };
  }

  const booking = bookings.find((item) => (
    item.courtId === courtId &&
    item.status !== "CANCELLED" &&
    item.startTime < end &&
    item.endTime > start
  ));

  if (!booking) return { key: "free", label: "Сул", title: "Сул цаг" };

  if (booking.status === "PENDING" || booking.status === "PARTIALLY_PAID") {
    return { key: "pending", label: "Түр", title: "Хүлээгдэж буй захиалга" };
  }

  return { key: "busy", label: "Хаалттай", title: "Захиалгатай цаг" };
}

function getFreeCount(
  bookings: Array<{ courtId: string; startTime: Date; endTime: Date; status: string }>,
  courtId: string,
  days: Date[]
) {
  let count = 0;
  for (const day of days) {
    for (const hour of HOURS) {
      const { start, end } = slotRange(day, hour);
      if (getSlotState(bookings, courtId, start, end).key === "free") count += 1;
    }
  }
  return count;
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

export default async function SchedulePage({
  searchParams
}: {
  searchParams?: Promise<{ court?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const selectedCourtId = asString(params.court).trim();

  const today = startOfToday();
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const lastDay = addDays(today, 7);

  const [courts, bookings] = await Promise.all([
    prisma.court.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.booking.findMany({
      where: {
        status: { not: "CANCELLED" },
        startTime: { lt: lastDay },
        endTime: { gt: today }
      },
      select: {
        courtId: true,
        startTime: true,
        endTime: true,
        status: true
      },
      orderBy: { startTime: "asc" }
    })
  ]);

  const selectedCourt = courts.find((court) => court.id === selectedCourtId) || null;

  if (!selectedCourt) {
    return (
      <div className="container schedule-container compact-schedule-container">
        <section className="section-title admin-title-row schedule-title-row">
          <div>
            <p className="eyebrow dark">Zaaldy calendar</p>
            <h1>Заалаа цахимаар захиал</h1>
          </div>
          <Link className="small-btn" href="/">Заалууд руу</Link>
        </section>

        <div className="schedule-legend">
          <span><i className="legend-dot free" /> Сул цагийн тоо</span>
          <span><i className="legend-dot pending" /> Түр хадгалсан</span>
          <span><i className="legend-dot busy" /> Захиалгатай</span>
        </div>

        {courts.length === 0 ? (
          <div className="empty-card">Одоогоор заал бүртгэгдээгүй байна.</div>
        ) : (
          <section className="schedule-court-grid" aria-label="Заал сонгох">
            {courts.map((court) => {
              const freeCount = getFreeCount(bookings, court.id, days);
              const totalSlots = DAYS_HOURS_TOTAL;

              return (
                <article className="schedule-court-card" key={court.id}>
                  <div
                    className="schedule-court-image"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.64)), url(${court.imageUrl || "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1200&auto=format&fit=crop"})`
                    }}
                  >
                    <span>{freeCount}/{totalSlots} сул</span>
                  </div>
                  <div className="schedule-court-content">
                    <p className="badge">{court.location}</p>
                    <h2>{court.name}</h2>
                    <p className="muted">{formatMoney(court.pricePerHour)} / цаг</p>
                    <div className="schedule-free-bar" aria-label="Сул цагийн хувь">
                      <span style={{ width: `${Math.round((freeCount / totalSlots) * 100)}%` }} />
                    </div>
                    <div className="card-footer">
                      <Link className="ghost-btn" href={`/book/${court.id}`}>Захиалах</Link>
                      <Link className="small-btn" href={`/schedule?court=${court.id}`}>Хуваарь харах</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="container schedule-container compact-schedule-container">
      <section className="selected-schedule-header">
        <div
          className="selected-schedule-image"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.52)), url(${selectedCourt.imageUrl || "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1200&auto=format&fit=crop"})`
          }}
        />
        <div className="selected-schedule-info">
          <Link className="back-link" href="/schedule">← Өөр заал сонгох</Link>
          <p className="eyebrow dark">7 хоногийн хуваарь</p>
          <h1>{selectedCourt.name}</h1>
          <p>{selectedCourt.location} · {formatMoney(selectedCourt.pricePerHour)} / цаг</p>
          <div className="schedule-legend compact">
            <span><i className="legend-dot free" /> Сул</span>
            <span><i className="legend-dot pending" /> Түр хадгалсан</span>
            <span><i className="legend-dot busy" /> Хаалттай</span>
            <span><i className="legend-dot closed" /> Өнгөрсөн</span>
          </div>
        </div>
      </section>

      <section className="single-court-calendar" aria-label={`${selectedCourt.name} 7 хоногийн хуваарь`}>
        {days.map((day) => {
          const freeCount = HOURS.filter((hour) => {
            const { start, end } = slotRange(day, hour);
            return getSlotState(bookings, selectedCourt.id, start, end).key === "free";
          }).length;

          return (
            <article className="single-day-card" key={dateKey(day)}>
              <header className="single-day-head">
                <span>{weekdayTitle(day)}</span>
                <strong>{dayTitle(day)}</strong>
                <small>{freeCount} сул цаг</small>
              </header>

              <div className="single-slot-list">
                {HOURS.map((hour) => {
                  const { start, end } = slotRange(day, hour);
                  const state = getSlotState(bookings, selectedCourt.id, start, end);
                  const content = (
                    <>
                      <b>{slotText(hour)}</b>
                      <small>{state.label}</small>
                    </>
                  );

                  return state.key === "free" ? (
                    <Link
                      className="single-slot free"
                      href={`/book/${selectedCourt.id}`}
                      key={`${selectedCourt.id}-${dateKey(day)}-${hour}`}
                      title={`${selectedCourt.name} · ${slotText(hour)} · сул`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <span
                      className={`single-slot ${state.key}`}
                      key={`${selectedCourt.id}-${dateKey(day)}-${hour}`}
                      title={state.title}
                    >
                      {content}
                    </span>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

const DAYS_HOURS_TOTAL = 7 * HOURS.length;
