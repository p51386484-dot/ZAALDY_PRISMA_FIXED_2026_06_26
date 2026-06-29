import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="container auth-page">
      <section className="section-title centered">
        <p className="eyebrow dark">Zaaldy account</p>
        <h1>Нэвтрэх</h1>
        <p>Утасны дугаар, password-оороо нэвтэрнэ.</p>
      </section>

      <AuthForm mode="login" />

      <p className="auth-switch">
        Бүртгэлгүй юу? <Link href="/register">Бүртгүүлэх</Link>
      </p>
      <p className="auth-switch muted">
        Admin эрхтэй юу? <Link href="/admin/login">Admin хэсгээр нэвтрэх</Link>
      </p>
    </div>
  );
}
