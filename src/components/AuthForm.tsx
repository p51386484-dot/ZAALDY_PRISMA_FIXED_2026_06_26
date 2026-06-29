"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { loginAdmin, loginUser, registerUser, type ActionState } from "@/app/actions";

const initialState: ActionState = {
  ok: false,
  message: ""
};

const SAVED_PHONE_KEY = "zaaldy_saved_phone";

function passwordRules(password: string) {
  return [
    { label: "8+ тэмдэгт", ok: password.length >= 8 },
    { label: "Том үсэг", ok: /[A-ZА-ЯӨҮ]/.test(password) },
    { label: "Жижиг үсэг", ok: /[a-zа-яөү]/.test(password) },
    { label: "Тоо", ok: /\d/.test(password) },
    { label: "Тусгай тэмдэгт", ok: /[^A-Za-zА-Яа-яӨҮөү0-9]/.test(password) }
  ];
}

export default function AuthForm({ mode }: { mode: "login" | "register" | "admin-login" }) {
  const action = mode === "admin-login" ? loginAdmin : mode === "login" ? loginUser : registerUser;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [rememberAccount, setRememberAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = mode === "login" || mode === "admin-login";
  const isUserLogin = mode === "login";
  const isAdminLogin = mode === "admin-login";
  const rules = useMemo(() => passwordRules(password), [password]);

  useEffect(() => {
    if (!isUserLogin) return;

    const savedPhone = localStorage.getItem(SAVED_PHONE_KEY);
    if (savedPhone) {
      setAccount(savedPhone);
      setRememberAccount(true);
    }
  }, [isUserLogin]);

  const handleSubmit = () => {
    if (!isUserLogin) return;

    if (rememberAccount && account.trim()) {
      localStorage.setItem(SAVED_PHONE_KEY, account.trim());
    } else {
      localStorage.removeItem(SAVED_PHONE_KEY);
    }
  };

  const handleBiometricLogin = async () => {
    if (!("PublicKeyCredential" in window)) {
      alert("Таны төхөөрөмж biometric login дэмжихгүй байна.");
      return;
    }

    try {
      const isAvailable =
        typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
          ? await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          : true;

      if (!isAvailable) {
        alert("Таны төхөөрөмж дээр хурууны хээ / Face ID идэвхгүй байна.");
        return;
      }

      alert("Хурууны хээ / Face ID дэмжиж байна. Passkey серверийн тохиргоо холбогдсоны дараа энэ товчоор нэвтэрнэ.");
    } catch {
      alert("Biometric login шалгах үед алдаа гарлаа.");
    }
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="form-card auth-card">
      {!isLogin ? (
        <div className="field">
          <label>Нэр</label>
          <input name="name" placeholder="Нэрээ оруулна уу" required />
        </div>
      ) : null}

      <div className="field">
        <label>{isAdminLogin ? "Admin username" : "Утасны дугаар"}</label>
        <input
          name="phone"
          type={isAdminLogin ? "text" : "tel"}
          value={account}
          onChange={(event) => setAccount(event.target.value)}
          placeholder={isAdminLogin ? "Admin username-оо оруулна уу" : "Утасны дугаараа оруулна уу"}
          required
        />
      </div>

      <div className="field">
        <label>Нууц үг</label>
        <div className="password-input-wrap">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            minLength={isLogin ? 1 : 8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isLogin ? "Нууц үгээ оруулна уу" : "Нууц үгээ үүсгэнэ үү"}
            required
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? "Нуух" : "Харах"}
          </button>
        </div>
      </div>

      {!isLogin ? (
        <div className="password-checklist">
          {rules.map((rule) => (
            <span key={rule.label} className={rule.ok ? "ok" : "no"}>{rule.ok ? "✓" : "•"} {rule.label}</span>
          ))}
        </div>
      ) : null}

      {isUserLogin ? (
        <div className="auth-options-row">
          <label className="remember-check">
            <input
              type="checkbox"
              checked={rememberAccount}
              onChange={(event) => setRememberAccount(event.target.checked)}
            />
            <span>Бүртгэл санах</span>
          </label>
          <Link href="/forgot-password">Нууц үг мартсан уу?</Link>
        </div>
      ) : null}

      {state.message ? <p className="error-message">{state.message}</p> : null}

      <button className="primary-btn" type="submit" disabled={isPending}>
        {isPending ? "Уншиж байна..." : isAdminLogin ? "Admin нэвтрэх" : isLogin ? "Хэрэглэгч нэвтрэх" : "Бүртгүүлэх"}
      </button>

      {isUserLogin ? (
        <button className="biometric-btn" type="button" onClick={handleBiometricLogin}>
          Хурууны хээ / Face ID-ээр нэвтрэх
        </button>
      ) : null}
    </form>
  );
}
