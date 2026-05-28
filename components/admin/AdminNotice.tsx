"use client";

/**
 * AdminNotice — displays success/error/info messages for the admin dashboard.
 */
export function AdminNotice({ value }: { value: string }) {
  if (!value) return null;
  const parts = value.split(" · ");
  const title = parts.find((p) => !p.startsWith("code:") && !p.startsWith("step:") && !p.startsWith("detail:")) || value;
  const code = parts.find((p) => p.startsWith("code:"))?.replace("code: ", "");
  const step = parts.find((p) => p.startsWith("step:"))?.replace("step: ", "");
  const detail = parts.find((p) => p.startsWith("detail:"))?.replace("detail: ", "");
  const isError = Boolean(code || step || title.includes("失败") || title.includes("不正确") || title.includes("缺少"));

  return (
    <section
      className={`rounded-[1.4rem] border p-4 text-sm shadow-soft backdrop-blur-xl ${
        isError
          ? "border-[#efb6b1]/75 bg-[#fff0ef]/85 text-[#7d463f]"
          : "border-white/75 bg-white/72 text-[var(--app-text)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-xs font-semibold">
          {isError ? "!" : "✓"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title}</p>
          {(code || step) ? (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {code ? <span className="rounded-full bg-white/70 px-2.5 py-1">code: {code}</span> : null}
              {step ? <span className="rounded-full bg-white/70 px-2.5 py-1">step: {step}</span> : null}
            </div>
          ) : null}
          {detail ? (
            <details className="mt-2 rounded-2xl bg-white/60 px-3 py-2 text-xs leading-5">
              <summary className="cursor-pointer font-medium">查看 detail</summary>
              <p className="mt-2 break-words">{detail}</p>
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}