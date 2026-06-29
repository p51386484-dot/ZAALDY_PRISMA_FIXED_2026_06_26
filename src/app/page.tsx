import Link from "next/link";
import CourtCard from "@/components/CourtCard";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  const courts = await prisma.court.findMany({ orderBy: { createdAt: "desc" } });

  const adminStats = user?.role === "ADMIN"
    ? await Promise.all([
        prisma.booking.count(),
        prisma.booking.aggregate({
          where: { status: { not: "CANCELLED" } },
          _sum: { paidAmount: true }
        })
      ])
    : null;

  const totalBookings = adminStats?.[0] || 0;
  const confirmedRevenue = adminStats?.[1]?._sum.paidAmount || 0;

  return (
    <div className="container">
      <section className="hero clean-hero">
        <div>
          <h1>Спорт заалаа онлайнаар хурдан захиалъя</h1>
          <div className="hero-actions">
            <Link className="hero-btn" href="#courts">Заалаа сонгох</Link>
            <Link className="hero-outline" href="/schedule">Хуваарь харах</Link>
          </div>
        </div>
      </section>

      {user?.role === "ADMIN" ? (
        <section className="stats-grid mini-stats admin-only-stats">
          <div className="stat-card">
            <span>Нийт заал</span>
            <strong>{courts.length}</strong>
          </div>
          <div className="stat-card">
            <span>Нийт захиалга</span>
            <strong>{totalBookings}</strong>
          </div>
          <div className="stat-card">
            <span>Төлсөн орлого</span>
            <strong>{formatMoney(confirmedRevenue)}</strong>
          </div>
        </section>
      ) : (
        <section className="public-info-grid" aria-label="Zaaldy мэдээлэл">
          <div className="public-info-card">
            <span>01</span>
            <strong>Заалаа сонгоно уу</strong>
            <p>Байршил, үнэ, зурагтай заалуудаас тохирохыг сонгоно.</p>
          </div>
          <div className="public-info-card">
            <span>02</span>
            <strong>Сул цагаа харах</strong>
            <p>7 хоногийн хуваарь дээр сул болон хаалттай цаг шууд харагдана.</p>
          </div>
          <div className="public-info-card">
            <span>03</span>
            <strong>Захиалгаа илгээх</strong>
            <p>Хэрэглэгчийн захиалга админ баталгаажуулсны дараа хүчинтэй болно.</p>
          </div>
        </section>
      )}

      <section id="courts" className="section-title">
        <h2>Заалууд</h2>
        <p>Захиалах заалаа сонгох</p>
      </section>

      {courts.length === 0 ? (
        <div className="empty-card">
          Одоогоор заал байхгүй байна. <b>Admin</b> хэсгээс заал нэмнэ үү.
        </div>
      ) : (
        <div className="court-grid">
          {courts.map((court) => (
            <CourtCard key={court.id} court={court} />
          ))}
        </div>
      )}
    </div>
  );
}
