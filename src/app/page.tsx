export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <p className="text-sm font-medium text-[var(--primary)]">Phase 2.1</p>
        <h1 className="mt-2 text-2xl font-semibold">BD达人管理系统</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Next.js 工程基础已经就绪，认证与应用路由将在下一阶段接入。
        </p>
      </section>
    </main>
  );
}
