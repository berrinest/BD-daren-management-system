import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <section className="w-full max-w-sm rounded-2xl border border-[#e7ebe8] bg-white p-8 shadow-sm">
      <div className="mb-8">
        <div className="mb-4 grid size-11 place-items-center rounded-xl bg-[#31594b] text-xl text-white">
          ✦
        </div>
        <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">
          BD WORKBENCH
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">登录星络</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          使用你的个人账号进入达人拓展工作台。
        </p>
      </div>

      {error ? (
        <p
          className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <form action={login} className="space-y-4">
        <label className="grid gap-2 text-sm font-medium text-[#35443e]">
          邮箱
          <input
            autoComplete="email"
            className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 outline-none focus:border-[#31594b]"
            name="email"
            placeholder="name@example.com"
            required
            type="email"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#35443e]">
          密码
          <input
            autoComplete="current-password"
            className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 outline-none focus:border-[#31594b]"
            name="password"
            required
            type="password"
          />
        </label>
        <button
          className="w-full rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#284a3e]"
          type="submit"
        >
          登录
        </button>
      </form>
    </section>
  );
}
