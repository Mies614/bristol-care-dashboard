"use client";

import { useEffect, useState } from "react";
import { getCurrentIdentity, getIdentityLabel, saveCurrentIdentity, type CurrentIdentity } from "@/lib/identity";

export function IdentitySelector() {
  const [identity, setIdentity] = useState<CurrentIdentity>("xiaoguai");
  useEffect(() => setIdentity(getCurrentIdentity()), []);

  function update(value: CurrentIdentity) {
    setIdentity(value);
    saveCurrentIdentity(value);
  }

  return (
    <section className="soft-card space-y-3">
      <div>
        <p className="section-kicker mb-1">Identity</p>
        <h2 className="font-semibold text-cocoa">当前使用者</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["me", "xiaoguai"] as CurrentIdentity[]).map((value) => (
          <button className={identity === value ? "btn-primary" : "btn-secondary"} key={value} onClick={() => update(value)} type="button">
            {getIdentityLabel(value)}
          </button>
        ))}
      </div>
    </section>
  );
}
