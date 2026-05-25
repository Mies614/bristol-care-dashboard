export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-5 rounded-[2rem] border border-white/75 bg-white/60 p-5 shadow-soft ring-1 ring-white/60 backdrop-blur-xl">
      <p className="section-kicker mb-2">Bristol Care</p>
      <h1 className="text-2xl font-semibold tracking-[-0.01em] text-cocoa">{title}</h1>
      {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-cocoa/68">{subtitle}</p> : null}
    </header>
  );
}
