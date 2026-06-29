import Link from "next/link";
import { formatMoney } from "@/lib/format";

type CourtCardProps = {
  court: {
    id: string;
    name: string;
    location: string;
    pricePerHour: number;
    description: string | null;
    imageUrl: string | null;
  };
};

export default function CourtCard({ court }: CourtCardProps) {
  return (
    <article className="court-card">
      <div
        className="court-image"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.62)), url(${court.imageUrl || "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1200&auto=format&fit=crop"})`
        }}
      >
        <span>{formatMoney(court.pricePerHour)} / цаг</span>
      </div>
      <div className="court-content">
        <p className="badge">{court.location}</p>
        <h3>{court.name}</h3>
        <p className="muted">{court.description || "Спорт заал захиалга."}</p>
        <div className="card-footer">
          <Link className="ghost-btn" href={`/schedule?court=${court.id}`}>
            Хуваарь харах
          </Link>
          <Link className="small-btn" href={`/book/${court.id}`}>
            Захиалах
          </Link>
        </div>
      </div>
    </article>
  );
}
