import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f6f4] p-6">
      <section className="text-center">
        <p className="text-sm font-semibold text-[#668074]">404</p>
        <h1 className="mt-2 text-2xl font-semibold">页面不存在</h1>
        <Link className="mt-5 inline-flex rounded-lg bg-[#31594b] px-4 py-2 text-sm text-white" href="/dashboard">返回工作台</Link>
      </section>
    </main>
  );
}
