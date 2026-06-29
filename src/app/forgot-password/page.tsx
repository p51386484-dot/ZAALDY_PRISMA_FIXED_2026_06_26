import Link from "next/link";
import { ForgotPasswordForm } from "@/components/PasswordResetForms";

export default function ForgotPasswordPage() {
  return (
    <div className="container auth-page">
      <section className="section-title centered">
        <p className="eyebrow dark">Zaaldy security</p>
        <h1>Нууц үг сэргээх</h1>
        <p>Demo хувилбарт reset code дэлгэц дээр гарна. Жинхэнэ системд SMS/email-р илгээдэг болгоно.</p>
      </section>
      <ForgotPasswordForm />
      <p className="auth-switch"><Link href="/login">Нэвтрэх рүү буцах</Link></p>
    </div>
  );
}
