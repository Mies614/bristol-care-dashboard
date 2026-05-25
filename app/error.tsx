"use client";

import { AppShell } from "@/components/AppShell";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AppShell>
      <section className="soft-card text-center">
        <p className="section-kicker mb-2">Bristol Care</p>
        <h1 className="text-xl font-semibold text-cocoa">页面加载遇到一点问题，刷新试试。</h1>
        <p className="mt-3 text-sm leading-6 text-cocoa/65">如果手机端网络或浏览器缓存临时异常，重新加载通常就能恢复。</p>
        <button className="btn-primary mt-5 w-full" onClick={reset}>
          重新加载
        </button>
      </section>
    </AppShell>
  );
}
