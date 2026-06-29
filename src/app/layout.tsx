import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutUser } from "@/app/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zaaldy",
  description: "Zaaldy - спорт заал захиалгын web app",
  other: {
    google: "notranslate"
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="mn" translate="no">
      <body>
        <header className="navbar">
          <Link className="brand" href="/">
            <span className="brand-mark">Z</span>
            Zaaldy
          </Link>
          <nav>
            <Link href="/">Заал</Link>
            <Link href="/schedule">Хуваарь</Link>
            {user?.role === "USER" ? <Link href="/my-bookings">Миний захиалга</Link> : null}
            {user?.role === "ADMIN" ? <Link href="/admin">Admin dashboard</Link> : null}
            {user ? (
              <form action={logoutUser}>
                <button className="nav-button" type="submit">Гарах</button>
              </form>
            ) : (
              <Link href="/login">Хэрэглэгч нэвтрэх</Link>
            )}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
