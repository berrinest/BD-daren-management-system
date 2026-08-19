type ModulePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  phase: string;
};

export function ModulePlaceholder({ eyebrow, title, description, phase }: ModulePlaceholderProps) {
  return (
    <main className="p-5 md:p-8">
      <section className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">{title}</h1>
        <div className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-7 shadow-sm">
          <span className="inline-flex rounded-full bg-[#e5efea] px-3 py-1 text-xs font-medium text-[#31594b]">{phase}</span>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
          <p className="mt-5 border-t border-[#edf0ee] pt-5 text-xs text-slate-400">
            当前仅提供路由和页面结构，不包含业务数据与操作。
          </p>
        </div>
      </section>
    </main>
  );
}
