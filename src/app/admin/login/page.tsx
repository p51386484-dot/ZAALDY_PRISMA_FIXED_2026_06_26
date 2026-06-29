import AuthForm from "@/components/AuthForm";

export default function AdminLoginPage() {
  return (
    <div className="container auth-page">
      <section className="section-title centered">
        <p className="eyebrow dark">Zaaldy admin</p>
        <h1>Admin нэвтрэх</h1>
        <p>Admin эрхтэй хэрэглэгч эндээс нэвтэрнэ.</p>
      </section>

      <AuthForm mode="admin-login" />
    </div>
  );
}
