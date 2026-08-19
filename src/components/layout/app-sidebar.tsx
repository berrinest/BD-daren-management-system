import { AppNav } from "./app-nav";

export function AppSidebar() {
  return (
    <aside className="flex w-full flex-col bg-[#263f36] px-4 py-5 text-white md:fixed md:inset-y-0 md:left-0 md:w-60 md:px-5 md:py-7">
      <div className="mb-6 flex items-center gap-3 px-2 md:mb-10">
        <span className="grid size-10 place-items-center rounded-xl bg-[#e9957c] text-xl">✦</span>
        <div>
          <strong className="block text-lg tracking-widest">星络</strong>
          <span className="block text-[11px] text-[#aebdb7]">个人BD工作台</span>
        </div>
      </div>
      <AppNav />
      <p className="mt-8 hidden border-t border-white/10 px-2 pt-5 text-xs leading-5 text-[#91a59e] md:mt-auto md:block">
        Phase 2.1 工程基础
      </p>
    </aside>
  );
}
