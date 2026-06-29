import Link from "next/link";
import { ResetPasswordForm } from "@/components/PasswordResetForms";

export default function ResetPasswordPage() {
  return (
    <div className="container auth-page">
      <section className="section-title centered">
        <p className="eyebrow dark">Zaaldy security</p>
        <h1>Шинэ password</h1>
        <p>Reset code болон шинэ хүчтэй password-оо оруулна.</p>
      </section>
      <ResetPasswordForm />
      <p className="auth-switch"><Link href="/login">Нэвтрэх рүү буцах</Link></p>
    </div>
  );
}
