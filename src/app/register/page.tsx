import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <div className="container auth-page">
      <section className="section-title centered">
        <p className="eyebrow dark">Zaaldy account</p>
        <h1>Шинэ хэрэглэгч</h1>
        <p>Бүртгүүлээд захиалгаа өөрөө харах, засах, цуцлах боломжтой.</p>
      </section>

      <AuthForm mode="register" />

      <p className="auth-switch">
        Аль хэдийн бүртгэлтэй юу? <Link href="/login">Нэвтрэх</Link>
      </p>
    </div>
  );
}
