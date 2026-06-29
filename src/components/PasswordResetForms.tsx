"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { requestPasswordReset, resetPassword, type ActionState } from "@/app/actions";

const initialState: ActionState = { ok: false, message: "" };

function passwordRules(password: string) {
  return [
    { label: "8+ тэмдэгт", ok: password.length >= 8 },
    { label: "Том үсэг", ok: /[A-ZА-ЯӨҮ]/.test(password) },
    { label: "Жижиг үсэг", ok: /[a-zа-яөү]/.test(password) },
    { label: "Тоо", ok: /\d/.test(password) },
    { label: "Тусгай тэмдэгт", ok: /[^A-Za-zА-Яа-яӨҮөү0-9]/.test(password) }
  ];
}

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="form-card auth-card">
      <div className="field">
        <label>Утас / username</label>
        <input name="phone" placeholder="Утас / username-оо оруулна уу" required />
      </div>

      {state.message ? <p className={state.ok ? "success-message" : "error-message"}>{state.message}</p> : null}

      <button className="primary-btn" type="submit" disabled={isPending}>
        {isPending ? "Илгээж байна..." : "Reset code авах"}
      </button>
      <p className="auth-switch"><Link href="/reset-password">Кодтой юу? Шинэ нууц үг хийх</Link></p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPassword, initialState);
  const [password, setPassword] = useState("");
  const rules = useMemo(() => passwordRules(password), [password]);

  return (
    <form action={formAction} className="form-card auth-card">
      <div className="field">
        <label>Утас / username</label>
        <input name="phone" placeholder="Утас / username-оо оруулна уу" required />
      </div>
      <div className="field">
        <label>Reset code</label>
        <input name="code" placeholder="6 оронтой код" required />
      </div>
      <div className="field">
        <label>Шинэ нууц үг</label>
        <input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Шинэ нууц үгээ оруулна уу" required />
      </div>

      <div className="password-checklist">
        {rules.map((rule) => (
          <span key={rule.label} className={rule.ok ? "ok" : "no"}>{rule.ok ? "✓" : "•"} {rule.label}</span>
        ))}
      </div>

      {state.message ? <p className={state.ok ? "success-message" : "error-message"}>{state.message}</p> : null}

      <button className="primary-btn" type="submit" disabled={isPending}>
        {isPending ? "Сольж байна..." : "Нууц үг солих"}
      </button>
    </form>
  );
}
