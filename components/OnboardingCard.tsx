"use client";

import { useEffect, useState } from "react";

const ONBOARDING_KEY = "bristol-care-onboarding-seen-v1";

export function OnboardingCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(ONBOARDING_KEY) !== "true");
  }, []);

  function dismiss() {
    window.localStorage.setItem(ONBOARDING_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section className="soft-card border-roseSoft/45 bg-gradient-to-br from-white/90 to-blush/55">
      <p className="section-kicker">首次打开</p>
      <h2 className="mt-2 text-lg font-semibold text-cocoa">先把这里当作一个本地小首页</h2>
      <div className="mt-3 space-y-2 text-sm leading-6 text-cocoa/70">
        <p>课程、deadline、小纸条和常用链接都只保存在这台设备的浏览器里。</p>
        <p>可以先用示例数据试用，再到“设置”和“课程”里改成自己的内容。</p>
        <p>天气来自 Open-Meteo 免费接口，不需要注册，也不需要 API key。</p>
      </div>
      <button className="btn-primary mt-4 w-full" onClick={dismiss}>
        知道啦
      </button>
    </section>
  );
}
