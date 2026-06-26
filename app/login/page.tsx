"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppCard } from "@/components/ui/AppCard";
import { Input } from "@/components/ui/input";

type LoginStep = "email" | "code_sent" | "verifying" | "error" | "rate_limited";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<LoginStep>("email");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const tokenRef = useRef<HTMLInputElement>(null);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-focus token input when step changes to code_sent
  useEffect(() => {
    if (step === "code_sent") tokenRef.current?.focus();
  }, [step]);

  // ─── Send OTP ───
  async function sendCode() {
    const trimmed = email.trim();
    if (!trimmed || step === "verifying") return;
    setMessage("");
    setStep("verifying");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json();

      if (json.code === "rate_limited") {
        setStep("rate_limited");
        setMessage("发送过于频繁，请稍后再试。");
        setCooldown(json.retryAfterSeconds || 30);
        return;
      }

      if (json.ok) {
        setStep("code_sent");
        setCooldown(60);
      } else {
        setStep("error");
        setMessage("发送失败，请稍后重试。");
      }
    } catch {
      setStep("error");
      setMessage("网络错误，请稍后重试。");
    }
  }

  // ─── Verify OTP ───
  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    const code = token.trim();
    if (!trimmed || !code) return;

    setMessage("");
    setStep("verifying");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, token: code }),
      });
      const json = await res.json();

      if (json.ok && json.home) {
        router.replace(json.home);
        router.refresh();
      } else {
        setStep("code_sent");
        setMessage(json.error || "验证码错误或已过期。");
        setToken("");
      }
    } catch {
      setStep("code_sent");
      setMessage("验证失败，请重试。");
    }
  }

  function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    sendCode();
  }

  const isLoading = step === "verifying";
  const maskedEmail = email.length > 5
    ? email.slice(0, 2) + "***" + email.slice(email.indexOf("@"))
    : email;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
      <AppCard className="w-full max-w-sm shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-cocoa">Bristol Care</h1>
          <p className="mt-2 text-sm text-cocoa/55">
            {step === "email" ? "输入你的邮箱以登录" : "输入邮箱收到的验证码"}
          </p>
        </div>

        {/* ─── Email step ─── */}
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <Input
              type="email"
              className="w-full"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
            <button
              type="submit"
              disabled={!email.trim()}
              className="w-full rounded-[var(--app-radius)] bg-[#b87060] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#a06055] disabled:cursor-not-allowed disabled:opacity-50"
            >
              发送验证码
            </button>
          </form>
        )}

        {/* ─── Code sent / verifying / error step ─── */}
        {(step === "code_sent" || step === "verifying" || step === "error" || step === "rate_limited") && (
          <form onSubmit={verifyCode} className="space-y-4">
            <p className="text-sm text-cocoa/55">验证码已发送至 {maskedEmail}</p>
            <Input
              ref={tokenRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full text-center text-lg tracking-[0.3em]"
              placeholder="000000"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 10))}
              required
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || token.length < 4}
              className="w-full rounded-[var(--app-radius)] bg-[#b87060] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#a06055] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "验证中…" : "确认登录"}
            </button>
            <div className="flex justify-between text-xs text-cocoa/45">
              <button type="button" disabled={isLoading || cooldown > 0} onClick={sendCode}>
                {cooldown > 0 ? `重新发送 (${cooldown}s)` : "重新发送验证码"}
              </button>
              <button type="button" disabled={isLoading} onClick={() => { setStep("email"); setToken(""); setMessage(""); }}>
                修改邮箱
              </button>
            </div>
          </form>
        )}

        {message && (
          <p role="alert" className="mt-4 text-center text-sm text-cocoa/65">{message}</p>
        )}
      </AppCard>
    </main>
  );
}
