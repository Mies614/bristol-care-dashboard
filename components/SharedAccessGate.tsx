"use client";

import { useEffect, useState } from "react";
import { hasSharedAccess, saveSharedAccess, validateSharedAccessCode } from "@/lib/sharedAccess";

export function SharedAccessGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setReady(hasSharedAccess());
  }, []);

  function enter(event: React.FormEvent) {
    event.preventDefault();
    if (!validateSharedAccessCode(code)) {
      setError("访问码不对，再检查一下。");
      return;
    }
    saveSharedAccess();
    setReady(true);
  }

  if (ready) return <>{children}</>;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-8 md:max-w-[520px]">
      <form className="soft-card space-y-4 bg-gradient-to-br from-white/90 to-blush/45" onSubmit={enter}>
        <div>
          <p className="section-kicker mb-1">Shared Space</p>
          <h1 className="text-xl font-semibold text-cocoa">输入访问码</h1>
        </div>
        <input className="field" value={code} onChange={(event) => setCode(event.target.value)} placeholder="访问码" />
        {error ? <p className="notice notice-error">{error}</p> : null}
        <button className="btn-primary w-full" type="submit">进入</button>
      </form>
    </main>
  );
}
