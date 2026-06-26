"use client";

import { useState } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();

      if (json.ok) {
        setMessage("登录链接已发送，请检查邮箱。");
      } else {
        setMessage("无法发送登录链接，请检查邮箱或稍后重试。");
      }
    } catch {
      setMessage("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
      <AppCard className="w-full max-w-sm shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-cocoa">Bristol Care</h1>
          <p className="mt-2 text-sm text-cocoa/55">输入你的邮箱以登录</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            className="w-full"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
          />
          <AppButton variant="primary" className="w-full" type="submit" disabled={loading || !email.trim()}>
            {loading ? "发送中..." : "发送登录链接"}
          </AppButton>
        </form>

        {message ? (
          <p className="mt-4 text-center text-sm text-cocoa/65">{message}</p>
        ) : null}
      </AppCard>
    </main>
  );
}
