import { signOut } from "@/app/(auth)/login/actions";

type AppHeaderProps = { email?: string };

export function AppHeader({ email }: AppHeaderProps) {
  return (
    <header className="flex min-h-16 items-center justify-between border-b border-[#e7ebe8] bg-white px-5 md:px-8">
      <p className="text-xs font-medium tracking-widest text-[#809087]">BD TALENT WORKBENCH</p>
      <div className="flex items-center gap-4">
        <span className="hidden text-xs text-slate-500 sm:inline">{email ?? "个人账号"}</span>
        <form action={signOut}>
          <button className="rounded-lg border border-[#dfe5e1] px-3 py-1.5 text-xs font-medium text-[#31594b] hover:bg-[#f4f6f4]" type="submit">
            退出
          </button>
        </form>
      </div>
    </header>
  );
}
