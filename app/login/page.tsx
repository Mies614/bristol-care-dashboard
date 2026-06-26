"use client";

import { useState } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { Input } from "@/components/ui/input";

type LoginStatus = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<LoginStatus>("idle");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = email.trim();
    if (!trimmed || status === "sending") return;

    setStatus("sending");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json();

      setStatus(json.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  const isLoading = status === "sending";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
      <AppCard className="w-full max-w-sm shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-cocoa">Bristol Care</h1>
          <p className="mt-2 text-sm text-cocoa/55">输入你的邮箱以登录</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            className="w-full"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full rounded-[var(--app-radius)] bg-[#b87060] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#a06055] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading
              ? "发送中…"
              : status === "sent"
                ? "重新发送登录链接"
                : "发送登录链接"}
          </button>
        </form>

        {status === "sent" && (
          <p role="status" className="mt-4 text-center text-sm text-cocoa/65">
            登录链接已发送，请检查邮箱。
          </p>
        )}

        {status === "error" && (
          <p role="alert" className="mt-4 text-center text-sm text-cocoa/65">
            发送失败，请稍后重试。
          </p>
        )}
      </AppCard>
    </main>
  );
}
