import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export type PasswordCheck = {
  valid: boolean;
  rules: {
    length: boolean;
    upper: boolean;
    lower: boolean;
    number: boolean;
    special: boolean;
  };
  message: string;
};

export function checkPasswordStrength(password: string): PasswordCheck {
  const rules = {
    length: password.length >= 8,
    upper: /[A-ZА-ЯӨҮ]/.test(password),
    lower: /[a-zа-яөү]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-zА-Яа-яӨҮөү0-9]/.test(password)
  };

  const valid = Object.values(rules).every(Boolean);

  return {
    valid,
    rules,
    message: valid
      ? "Password шаардлага хангалаа."
      : "Password 8+ тэмдэгттэй, том/жижиг үсэг, тоо, тусгай тэмдэгт агуулсан байх ёстой."
  };
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedPassword: string) {
  const [salt, hash] = storedPassword.split(":");
  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, "hex");
  const inputHashBuffer = scryptSync(password, salt, 64);

  if (hashBuffer.length !== inputHashBuffer.length) return false;
  return timingSafeEqual(hashBuffer, inputHashBuffer);
}

export function makeResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashResetCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}
