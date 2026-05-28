"use client";

interface Props {
  onThoughtHer: () => void;
}

export function AdminQuickActions({ onThoughtHer }: Props) {
  return (
    <section className="soft-card space-y-3 bg-gradient-to-br from-white/85 to-butter/45">
      <div>
        <p className="section-kicker mb-1">Quick Actions</p>
        <h2 className="font-semibold text-[var(--app-text)]">快捷操作</h2>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-primary text-center" onClick={onThoughtHer}>
          💭 想她一下
        </button>
        <a className="btn-secondary text-center" href="#publish-note">
          ✉️ 发小纸条
        </a>
        <a className="btn-secondary text-center" href="/albums?upload=1">
          📷 上传回忆
        </a>
        <a className="btn-secondary text-center" href="/notes">
          📬 查看小纸条
        </a>
        <a className="btn-secondary text-center" href="/memories">
          💞 查看回忆
        </a>
        <a className="btn-secondary text-center" href="/records">
          📋 记录中心
        </a>
      </div>
    </section>
  );
}